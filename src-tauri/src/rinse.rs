use chrono::{DateTime, Months, NaiveDate};
use chrono_tz::Europe::London;
use futures_util::StreamExt;
use reqwest::header::{CONTENT_RANGE, RANGE};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::path::{Path, PathBuf};
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Episode {
    pub id: String,
    pub title: String,
    pub show_id: String,
    pub show_slug: String,
    pub show_title: String,
    /// What sets this episode apart from the show's others, such as a guest or a special.
    pub display_title: Option<String>,
    pub station: String,
    /// London broadcast date, `YYYY-MM-DD`.
    pub date: String,
    /// London start time, `HH:MM`.
    pub time: String,
    /// Minutes.
    pub length: u32,
    pub rebroadcast: bool,
    pub genres: Vec<String>,
    /// Set only when the episode has a downloadable mp3.
    pub mp3: Option<String>,
    /// Whether the episode has ever appeared in the schedule feed. Cache entries from before the mark count as scheduled.
    #[serde(default = "scheduled_by_default")]
    pub scheduled: bool,
    /// Whether the last check of `mp3` found it: `Some(false)` for a 404, `None` until a check gets a 200 or 404.
    pub mp3_found: Option<bool>,
    /// The episode's own artwork, served through the `image` scheme. Missing from cache entries saved before it existed.
    pub image: Option<String>,
    /// The show's artwork, served through the `image` scheme. Missing from cache entries saved before it existed.
    pub show_image: Option<String>,
}

fn scheduled_by_default() -> bool {
    true
}

impl Episode {
    /// Whether the episode has an mp3 that wasn't missing at its last check.
    pub fn available(&self) -> bool {
        self.mp3.is_some() && self.mp3_found != Some(false)
    }

    /// Whether the update on London date `today` checks the mp3: on every update while the episode is under a month
    /// old, since Rinse still fixes or removes files then, and after that only until a check gets an answer.
    pub fn check_due(&self, today: NaiveDate) -> bool {
        let cutoff = today.checked_sub_months(Months::new(1));
        let recent = NaiveDate::parse_from_str(&self.date, "%Y-%m-%d")
            .is_ok_and(|date| cutoff.is_none_or(|cutoff| date > cutoff));

        self.mp3.is_some() && (recent || self.mp3_found.is_none())
    }
}

/// The episode to store for `fetched`: its fresh fields, keeping the schedule mark of the `cached` copy
/// and its check result while the mp3 link stays the same. A fetch without an mp3 keeps the cached link, since
/// Rinse's show feed sometimes sends a placeholder; if the file is really gone, its check fails.
pub fn merge_episode(cached: Option<Episode>, fetched: Episode) -> Episode {
    let mp3 = fetched
        .mp3
        .or_else(|| cached.as_ref().and_then(|e| e.mp3.clone()));

    Episode {
        scheduled: fetched.scheduled || cached.as_ref().is_some_and(|e| e.scheduled),
        mp3_found: cached.filter(|e| e.mp3 == mp3).and_then(|e| e.mp3_found),
        mp3,
        ..fetched
    }
}

/// Merges each of `fetched` into its copy from `cached`, or into an earlier copy in `fetched`, so the schedule and
/// show copies of one episode combine instead of the later replacing the earlier.
pub fn merge_episodes(
    fetched: Vec<Episode>,
    cached: impl Fn(&str) -> Option<Episode>,
) -> Vec<Episode> {
    let mut merged = BTreeMap::new();

    for episode in fetched {
        let earlier = merged.remove(&episode.id).or_else(|| cached(&episode.id));

        merged.insert(episode.id.clone(), merge_episode(earlier, episode));
    }

    merged.into_values().collect()
}

/// Everything kept in the settings store, one store key per field.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub subscriptions: Vec<Subscription>,
    /// Ids of episodes that must never trigger a notification.
    pub seen: BTreeSet<String>,
    pub download_folder: Option<PathBuf>,
    /// Whether the poller also downloads each new episode into `download_folder`.
    pub auto_download: bool,
    /// Whether closing the window hides it behind a menu bar or tray icon instead of quitting.
    pub keep_running: bool,
    /// Hours between updates of the schedule and the subscribed shows.
    pub update_interval: u32,
    /// Hours between checks for a new app version, or 0 to check only at launch.
    pub app_update_interval: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            subscriptions: Vec::new(),
            seen: BTreeSet::new(),
            download_folder: None,
            auto_download: false,
            keep_running: true,
            update_interval: 6,
            app_update_interval: 24,
        }
    }
}

/// Whether an update is due at `now`, `interval` hours after the one at `last`, both in Unix seconds.
/// Allows a few minutes' slack, so an update that ran just past the hour doesn't push the next one back by an hour.
pub fn update_due(last: i64, now: i64, interval: u32) -> bool {
    now + 5 * 60 >= last + i64::from(interval) * 60 * 60
}

/// A followed show.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Subscription {
    pub slug: String,
    pub title: String,
}

impl Settings {
    /// Follows the show and marks its `episodes` that are already available as seen,
    /// so subscribing never floods notifications.
    pub fn subscribe(&mut self, slug: &str, title: &str, episodes: &[Episode]) {
        self.unsubscribe(slug);
        self.subscriptions.push(Subscription {
            slug: slug.into(),
            title: title.into(),
        });
        self.seen.extend(
            episodes
                .iter()
                .filter(|e| e.available())
                .map(|e| e.id.clone()),
        );
    }

    /// Stops following the show. Its seen ids stay, so resubscribing never re-notifies them.
    pub fn unsubscribe(&mut self, slug: &str) {
        self.subscriptions.retain(|s| s.slug != slug);
    }
}

/// The available episodes of subscribed shows that haven't been seen, i.e. the ones to notify about.
pub fn new_episodes(
    subscriptions: &[Subscription],
    seen: &BTreeSet<String>,
    episodes: Vec<Episode>,
) -> Vec<Episode> {
    episodes
        .into_iter()
        .filter(|e| {
            e.available()
                && !seen.contains(&e.id)
                && subscriptions.iter().any(|s| s.slug == e.show_slug)
        })
        .collect()
}

/// The `downloaded` episodes found in `cache`, newest first. Ids the cache lacks are left out.
pub fn previous_downloads(downloaded: &BTreeSet<String>, cache: Vec<Episode>) -> Vec<Episode> {
    let mut episodes: Vec<_> = cache
        .into_iter()
        .filter(|e| downloaded.contains(&e.id))
        .collect();

    episodes.sort_by(|a, b| (&b.date, &b.time).cmp(&(&a.date, &a.time)));

    episodes
}

/// The episodes waiting to be downloaded, worked strictly one at a time in arrival order.
/// Sent to the frontend and saved to disk as is on every change.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct DownloadQueue {
    pub current: Option<Download>,
    /// Of `current`, once the server has reported a size.
    pub percent: Option<u8>,
    pub waiting: VecDeque<Download>,
    /// The last download that failed, until the next one starts or it's dismissed.
    pub failed: Option<Download>,
    /// Ids of every episode the app has finished downloading; defaults for queues saved before it existed.
    #[serde(default)]
    pub downloaded: BTreeSet<String>,
}

/// A queued episode and the folder it was queued with, which later folder changes don't move.
/// Flattened, so the frontend sees an `Episode` with an extra `folder`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Download {
    #[serde(flatten)]
    pub episode: Episode,
    pub folder: PathBuf,
}

impl DownloadQueue {
    /// The queue saved by a previous run, with its interrupted download first in line again.
    pub fn restore(mut saved: DownloadQueue) -> DownloadQueue {
        if let Some(current) = saved.current.take() {
            saved.waiting.push_front(current);
        }

        saved.percent = None;

        saved
    }

    /// Adds the download unless its episode is already waiting or downloading; returns whether it was added.
    pub fn push(&mut self, download: Download) -> bool {
        let mut queued = self.current.iter().chain(&self.waiting);

        if queued.any(|d| d.episode.id == download.episode.id) {
            return false;
        }

        self.waiting.push_back(download);

        true
    }

    /// Drops the episode from the waiting downloads; returns whether it was there.
    /// The running one stays, since stopping it is `cancel`.
    pub fn remove(&mut self, id: &str) -> bool {
        let before = self.waiting.len();

        self.waiting.retain(|d| d.episode.id != id);

        self.waiting.len() != before
    }

    /// Moves the waiting episode to `index` among the waiting downloads; returns whether it moved.
    pub fn move_to(&mut self, id: &str, index: usize) -> bool {
        if index >= self.waiting.len() {
            return false;
        }

        let Some(from) = self.waiting.iter().position(|d| d.episode.id == id) else {
            return false;
        };

        let download = self.waiting.remove(from).unwrap();
        self.waiting.insert(index, download);

        true
    }

    /// Starts the oldest waiting download, unless one is still running.
    pub fn next(&mut self) -> Option<Download> {
        if self.current.is_some() {
            return None;
        }

        self.current = Some(self.waiting.pop_front()?);
        self.percent = None;
        self.failed = None;

        self.current.clone()
    }

    /// Ends the current download without recording it as downloaded or failed; returns whether one was running.
    pub fn cancel(&mut self) -> bool {
        self.percent = None;

        self.current.take().is_some()
    }

    /// Ends the current download, recording it as downloaded if it `succeeded` and as the last failure if not.
    pub fn finish(&mut self, succeeded: bool) {
        let Some(current) = self.current.take() else {
            return;
        };

        if succeeded {
            self.downloaded.insert(current.episode.id);
        } else {
            self.failed = Some(current);
        }
    }
}

/// Schedule and show responses both carry an `episodes` list of the same shape.
#[derive(Deserialize)]
struct RawResponse {
    episodes: Vec<RawEpisode>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawEpisode {
    id: String,
    title: String,
    display_title: Option<String>,
    episode_date: Option<String>,
    episode_time: Option<String>,
    episode_length: Option<u32>,
    is_rebroadcast: bool,
    genre_tag: Vec<RawGenre>,
    file_url: Option<String>,
    channel: Vec<RawChannel>,
    parent_show: Vec<RawShow>,
    #[serde(default, deserialize_with = "null_as_empty")]
    featured_image: Vec<RawImage>,
}

/// Reads `null` as an empty list, so artwork Rinse sends as `null` or leaves out never fails the whole response.
fn null_as_empty<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<Vec<T>>::deserialize(deserializer).map(Option::unwrap_or_default)
}

/// The show response's `entry`, the show itself.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawEntry {
    description: Option<String>,
    featured_image: Vec<RawImage>,
}

#[derive(Deserialize)]
struct RawImage {
    filename: String,
}

#[derive(Deserialize)]
struct RawShowResponse {
    entry: RawEntry,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawShow {
    id: String,
    slug: String,
    title: String,
    #[serde(default, deserialize_with = "null_as_empty")]
    featured_image: Vec<RawImage>,
}

/// One page of the show index.
#[derive(Deserialize)]
struct RawShowIndex {
    entries: Vec<RawIndexShow>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawIndexShow {
    slug: String,
    title: String,
    genre_tag: Vec<RawGenre>,
    channel: Vec<RawChannel>,
}

#[derive(Deserialize)]
struct RawChannel {
    slug: String,
}

#[derive(Deserialize)]
struct RawGenre {
    title: String,
}

/// Maps a raw schedule or show response.
pub fn map_episodes(json: &str) -> serde_json::Result<Vec<Episode>> {
    let raw: RawResponse = serde_json::from_str(json)?;

    Ok(raw.episodes.into_iter().filter_map(map_episode).collect())
}

/// What Rinse says about a show besides its episodes, each field only when it provides one.
#[derive(Debug, Default, PartialEq, Serialize)]
pub struct ShowDetails {
    /// Served through the `image` scheme, which caches it on disk.
    pub image: Option<String>,
    /// HTML, which must never be injected into the page as is.
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShowPage {
    pub details: ShowDetails,
    pub episodes: Vec<Episode>,
}

/// Maps a raw show response. Details Rinse sends in an unexpected shape are left out, never failing the episodes.
pub fn map_show(json: &str) -> serde_json::Result<ShowPage> {
    let details = serde_json::from_str::<RawShowResponse>(json)
        .map(|raw| ShowDetails {
            image: image_url(raw.entry.featured_image),
            description: raw.entry.description.filter(|d| !d.trim().is_empty()),
        })
        .unwrap_or_default();

    Ok(ShowPage {
        details,
        episodes: map_episodes(json)?,
    })
}

/// The first of Rinse's `featuredImage` list as an `image` scheme URL, or `None` when the list is empty.
fn image_url(images: Vec<RawImage>) -> Option<String> {
    let image = images.into_iter().next()?;
    let mut url = reqwest::Url::parse(IMAGE_SCHEME_BASE).expect("valid base url");

    url.path_segments_mut()
        .expect("base url has a path")
        .push(&image.filename);

    Some(url.into())
}

/// A show in the show directory, every show Rinse lists.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DirectoryShow {
    pub slug: String,
    pub title: String,
    /// Empty for a show without a channel.
    pub station: String,
    pub genres: Vec<String>,
}

/// Maps one raw show index page. An empty list marks the end of the index.
pub fn map_show_index(json: &str) -> serde_json::Result<Vec<DirectoryShow>> {
    let raw: RawShowIndex = serde_json::from_str(json)?;

    Ok(raw
        .entries
        .into_iter()
        .map(|show| DirectoryShow {
            slug: show.slug,
            title: show.title,
            station: show
                .channel
                .first()
                .map_or("", |c| station_name(&c.slug))
                .into(),
            genres: show.genre_tag.into_iter().map(|t| t.title).collect(),
        })
        .collect())
}

/// The station a channel slug stands for; slugs that aren't one of the four stations pass through.
fn station_name(slug: &str) -> &str {
    match slug {
        "uk" => "Rinse FM",
        "france" => "Rinse FR",
        "kool" => "Kool FM",
        "swu" => "SWU FM",
        other => other,
    }
}

/// Skips episodes without a channel, show, time or parseable date, which can't be placed in the table.
fn map_episode(raw: RawEpisode) -> Option<Episode> {
    let station = station_name(&raw.channel.first()?.slug).to_string();

    let show = raw.parent_show.into_iter().next()?;
    let london = |s: &str| {
        DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&London))
    };

    // episodeDate is London midnight in UTC. episodeTime is the London wall-clock time put on
    // today's date and converted with today's offset, so convert it back with that same offset:
    // the broadcast date's offset would shift BST episodes by an hour.
    let date = london(raw.episode_date.as_deref()?)?
        .format("%Y-%m-%d")
        .to_string();
    let time = london(raw.episode_time.as_deref()?)?
        .format("%H:%M")
        .to_string();

    Some(Episode {
        id: raw.id,
        title: raw.title,
        show_id: show.id,
        show_slug: show.slug,
        show_title: show.title,
        display_title: raw.display_title.filter(|t| !t.trim().is_empty()),
        station,
        date,
        time,
        length: raw.episode_length.unwrap_or(0),
        rebroadcast: raw.is_rebroadcast,
        genres: raw.genre_tag.into_iter().map(|t| t.title).collect(),
        mp3: raw.file_url.filter(|url| url.ends_with(".mp3")),
        scheduled: false,
        mp3_found: None,
        image: image_url(raw.featured_image),
        show_image: image_url(show.featured_image),
    })
}

pub async fn fetch_schedule() -> Result<Vec<Episode>, String> {
    let mut episodes = fetch_episodes("https://www.rinse.fm/api/query/v1/schedule").await?;

    for episode in &mut episodes {
        episode.scheduled = true;
    }

    Ok(episodes)
}

/// The show's details and its ~30 most recent episodes.
pub async fn fetch_show(slug: &str) -> Result<ShowPage, String> {
    let json = fetch_text(&format!("https://www.rinse.fm/api/query/v1/shows/{slug}")).await?;

    map_show(&json).map_err(|e| e.to_string())
}

/// Every show Rinse lists, walking the index one page at a time until an empty page. Any failed page fails the
/// whole walk, so a partial directory is never returned.
pub async fn fetch_show_directory() -> Result<Vec<DirectoryShow>, String> {
    let mut shows = Vec::new();

    // `offset` is a page index, not an item offset
    for page in 0.. {
        let url = format!("https://www.rinse.fm/api/query/v1/shows/filter?offset={page}");
        let entries = map_show_index(&fetch_text(&url).await?).map_err(|e| e.to_string())?;

        if entries.is_empty() {
            break;
        }

        shows.extend(entries);
    }

    // A show added mid-walk shifts later pages, repeating a show the list keys by slug
    let mut slugs = BTreeSet::new();

    shows.retain(|show| slugs.insert(show.slug.clone()));

    Ok(shows)
}

const IMAGE_BASE: &str = "https://rinse-platform-assets.s3.amazonaws.com/images";

/// Where the webview reaches the `image` scheme, which Windows only allows over http.
#[cfg(windows)]
const IMAGE_SCHEME_BASE: &str = "http://image.localhost";
#[cfg(not(windows))]
const IMAGE_SCHEME_BASE: &str = "image://localhost";

/// Returns the show image `name` from `cache`, fetching it from Rinse the first time.
/// `name` is the percent-encoded filename, which doubles as the file's name in `cache`.
/// Rinse never reuses a filename for a new image, so a cached one never goes stale.
pub async fn cached_image(name: &str, cache: &Path) -> Result<Vec<u8>, String> {
    if name.is_empty() || name == "." || name == ".." || name.contains(['/', '\\']) {
        return Err(format!("invalid image name: {name}"));
    }

    let path = cache.join(name);

    if let Ok(bytes) = tokio::fs::read(&path).await {
        return Ok(bytes);
    }

    let bytes = reqwest::get(format!("{IMAGE_BASE}/{name}"))
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    let bytes = tokio::task::spawn_blocking(move || shrink_image(bytes.into()))
        .await
        .map_err(|e| e.to_string())?;

    // Written aside and renamed, so a crash never leaves a truncated image behind.
    let part = cache.join(format!("{name}.part"));

    tokio::fs::create_dir_all(cache)
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::write(&part, &bytes)
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::rename(&part, &path)
        .await
        .map_err(|e| e.to_string())?;

    Ok(bytes)
}

/// The largest shorter side a cached image keeps: the Player tab's 280px square cover at 2×.
pub const IMAGE_MAX_SHORT_SIDE: u32 = 560;

/// Scales an image down, keeping its format and aspect ratio, until its shorter side is at most `IMAGE_MAX_SHORT_SIDE`.
/// Bytes that don't decode, or an image already within the limit, come back as they were.
pub fn shrink_image(bytes: Vec<u8>) -> Vec<u8> {
    let Ok(format) = image::guess_format(&bytes) else {
        return bytes;
    };
    let Ok(decoded) = image::load_from_memory_with_format(&bytes, format) else {
        return bytes;
    };
    let (width, height) = (decoded.width() as u64, decoded.height() as u64);
    let shorter = width.min(height);

    if shorter <= IMAGE_MAX_SHORT_SIDE as u64 {
        return bytes;
    }

    let scale = |side: u64| ((side * IMAGE_MAX_SHORT_SIDE as u64 + shorter / 2) / shorter) as u32;
    let resized = decoded.resize_exact(
        scale(width),
        scale(height),
        image::imageops::FilterType::Lanczos3,
    );
    let mut shrunk = Vec::new();

    match resized.write_to(&mut std::io::Cursor::new(&mut shrunk), format) {
        Ok(()) => shrunk,
        Err(_) => bytes,
    }
}

/// The bytes the image cache takes up on disk, or 0 if it doesn't exist yet.
pub fn image_cache_size(cache: &Path) -> u64 {
    std::fs::read_dir(cache)
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.ok()?.metadata().ok())
        .map(|metadata| metadata.len())
        .sum()
}

const IMAGE_CACHE_PREFIX: &str = "images";

/// The image cache inside the app's cache folder `root`, named after the size limit its images are shrunk to.
pub fn image_cache_dir(root: &Path) -> PathBuf {
    root.join(format!("{IMAGE_CACHE_PREFIX}-{IMAGE_MAX_SHORT_SIDE}"))
}

/// Deletes the image caches in `root` that hold images shrunk to another limit, or none at all.
pub fn remove_stale_image_caches(root: &Path) {
    let current = image_cache_dir(root);

    for entry in std::fs::read_dir(root).into_iter().flatten().flatten() {
        let path = entry.path();

        if path != current
            && entry
                .file_name()
                .to_string_lossy()
                .starts_with(IMAGE_CACHE_PREFIX)
        {
            if let Err(e) = clear_image_cache(&path) {
                eprintln!("removing the stale image cache {path:?} failed: {e}");
            }
        }
    }
}

/// Deletes every cached image. An image downloading meanwhile fails to land and is fetched again next time.
pub fn clear_image_cache(cache: &Path) -> Result<(), String> {
    match std::fs::remove_dir_all(cache) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

async fn fetch_episodes(url: &str) -> Result<Vec<Episode>, String> {
    map_episodes(&fetch_text(url).await?).map_err(|e| e.to_string())
}

async fn fetch_text(url: &str) -> Result<String, String> {
    reqwest::get(url)
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

/// Asks Rinse for the episode's mp3 without transferring it. A network error counts as available, like any status
/// but 404, so only a missing file hides an episode.
pub async fn check_mp3(episode: &Episode) -> Option<bool> {
    let url = episode.mp3.as_deref()?;
    let response = reqwest::Client::new()
        .head(url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .ok()?;

    check_result(response.status())
}

/// What a check that got `status` records as the episode's `mp3_found`.
fn check_result(status: StatusCode) -> Option<bool> {
    match status {
        StatusCode::OK => Some(true),
        StatusCode::NOT_FOUND => Some(false),
        _ => None,
    }
}

/// Streams the episode's mp3 into a `.part` file in `folder` chunk by chunk and renames it to `.mp3` once it's whole,
/// calling `on_progress` whenever the percent changes, which it can only do when the server reports a size.
/// An existing `.part` file is resumed from its size; a failed download keeps it for the next attempt.
pub async fn download(
    episode: &Episode,
    folder: &Path,
    mut on_progress: impl FnMut(u8),
) -> Result<(), String> {
    let url = episode.mp3.as_deref().ok_or("episode has no mp3")?;
    let path = folder.join(file_name(episode));
    let part = part_path(episode, folder);
    let mut offset = tokio::fs::metadata(&part)
        .await
        .map(|m| m.len())
        .unwrap_or(0);
    let mut response = request(url, offset).await?;

    if offset > 0 {
        let content_range = response
            .headers()
            .get(CONTENT_RANGE)
            .and_then(|v| v.to_str().ok());

        if !resumes(response.status(), content_range, offset) {
            offset = 0;

            // Only a 200 carries the whole file; a 416, an error or a 206 from elsewhere needs asking again for all of it.
            if response.status() != StatusCode::OK {
                response = request(url, 0).await?;
            }
        }
    }

    let response = response.error_for_status().map_err(|e| e.to_string())?;
    let total = response
        .content_length()
        .filter(|&n| n > 0)
        .map(|n| offset + n);
    let mut stream = response.bytes_stream();
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(offset > 0)
        .truncate(offset == 0)
        .open(&part)
        .await
        .map_err(|e| e.to_string())?;
    let mut written = offset;
    let mut percent = None;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;

        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        written += chunk.len() as u64;

        if let Some(total) = total {
            let now = (written * 100 / total).min(100) as u8;

            if percent != Some(now) {
                percent = Some(now);
                on_progress(now);
            }
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;

    if let Some(total) = total.filter(|&total| total != written) {
        return Err(format!("got {written} of {total} bytes"));
    }

    tokio::fs::rename(&part, &path)
        .await
        .map_err(|e| e.to_string())
}

/// Where `download` writes the episode until it's whole.
pub fn part_path(episode: &Episode, folder: &Path) -> PathBuf {
    folder.join(file_name(episode)).with_extension("mp3.part")
}

/// Requests the file from byte `offset` on, or all of it when that's zero.
async fn request(url: &str, offset: u64) -> Result<reqwest::Response, String> {
    let mut builder = reqwest::Client::new().get(url);

    if offset > 0 {
        builder = builder.header(RANGE, format!("bytes={offset}-"));
    }

    builder.send().await.map_err(|e| e.to_string())
}

/// Whether the answer to a range request from `offset` continues the partial file: anything but a `206`
/// starting at that offset means starting over.
fn resumes(status: StatusCode, content_range: Option<&str>, offset: u64) -> bool {
    status == StatusCode::PARTIAL_CONTENT
        && content_range.is_some_and(|r| r.starts_with(&format!("bytes {offset}-")))
}

/// `<Show> - <YYYY-MM-DD>.mp3`, with characters that are unsafe in file names on any OS removed.
pub fn file_name(episode: &Episode) -> String {
    let show: String = episode
        .show_title
        .chars()
        .filter(|c| !c.is_control() && !r#"/\:*?"<>|"#.contains(*c))
        .collect();

    format!("{} - {}.mp3", show.trim(), episode.date)
}

/// Where the episode's download sits in `folder`, if it's there under its `file_name`. Paths aren't tracked, so a
/// file that was moved, renamed or saved to an earlier folder isn't found.
pub fn downloaded_file(folder: &Path, episode: &Episode) -> Option<PathBuf> {
    let path = folder.join(file_name(episode));

    path.is_file().then_some(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> Vec<Episode> {
        map_episodes(include_str!("../tests/fixtures/schedule.json")).unwrap()
    }

    fn episode(id: &str) -> Episode {
        fixture().into_iter().find(|e| e.id == id).unwrap()
    }

    fn png(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = Vec::new();

        image::RgbImage::new(width, height)
            .write_to(
                &mut std::io::Cursor::new(&mut bytes),
                image::ImageFormat::Png,
            )
            .unwrap();

        bytes
    }

    #[test]
    fn shrinks_an_image_to_its_shorter_side_limit() {
        let shrunk = image::load_from_memory(&shrink_image(png(2000, 1000))).unwrap();

        assert_eq!((shrunk.width(), shrunk.height()), (1120, 560));
    }

    #[test]
    fn leaves_a_small_image_untouched() {
        assert_eq!(shrink_image(png(300, 200)), png(300, 200));
    }

    #[test]
    fn leaves_non_image_bytes_untouched() {
        assert_eq!(shrink_image(b"not an image".to_vec()), b"not an image");
    }

    #[test]
    fn maps_every_episode() {
        assert_eq!(fixture().len(), 200);
    }

    #[test]
    fn only_mp3_urls_are_available() {
        assert_eq!(episode("2319625").mp3, None);
        assert_eq!(episode("2319596").mp3, None);
        assert_eq!(
            episode("2319482").mp3.as_deref(),
            Some("https://replay.rinse.fm/uk/SKVibemaker291026.mp3")
        );
    }

    #[test]
    fn maps_station_slugs_to_names() {
        assert_eq!(episode("2319482").station, "Rinse FM");
        assert_eq!(episode("2318276").station, "Rinse FR");
        assert_eq!(episode("2319563").station, "Kool FM");
        assert_eq!(episode("2319238").station, "SWU FM");
    }

    #[test]
    fn populates_show_fields() {
        let e = episode("2315290");

        assert_eq!(e.show_id, "2071218");
        assert_eq!(e.show_slug, "dubquake-records");
        assert_eq!(e.show_title, "Dubquake Records");
        assert_eq!(e.genres, ["Dub", "Reggae"]);
    }

    #[test]
    fn maps_the_episode_and_show_images() {
        let e = episode("2315290");

        assert_eq!(
            e.image,
            Some(format!("{IMAGE_SCHEME_BASE}/Dubquake-Records_O.B.F-x-Terremoto-Sao-Paolo-Special_Artwork-Zach-ODwyer.jpg"))
        );
        assert_eq!(
            e.show_image,
            Some(format!(
                "{IMAGE_SCHEME_BASE}/Dubquake-Records-Rinse-FR-Class-Of-2025_Original.jpg"
            ))
        );
    }

    #[test]
    fn an_episode_without_artwork_has_no_images() {
        let e = episode("2319504");

        assert_eq!(e.image, None);
        assert_eq!(e.show_image, None);
    }

    #[test]
    fn a_null_or_missing_featured_image_counts_as_none() {
        let mut json: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/show.json")).unwrap();

        json["episodes"][0]["featuredImage"] = serde_json::json!(null);
        json["episodes"][0]["parentShow"][0]
            .as_object_mut()
            .unwrap()
            .remove("featuredImage");

        let episodes = map_episodes(&json.to_string()).unwrap();

        assert_eq!(episodes.len(), show_fixture().len());
        assert_eq!(episodes[0].image, None);
        assert_eq!(episodes[0].show_image, None);
    }

    #[test]
    fn cache_entries_without_images_load_without_them() {
        let mut value = serde_json::to_value(episode("2315290")).unwrap();

        value.as_object_mut().unwrap().remove("image");
        value.as_object_mut().unwrap().remove("showImage");

        let e: Episode = serde_json::from_value(value).unwrap();

        assert_eq!(e.image, None);
        assert_eq!(e.show_image, None);
    }

    #[test]
    fn display_title_is_set_only_when_rinse_provides_one() {
        let episodes = show_fixture();

        assert_eq!(
            episodes[0].display_title.as_deref(),
            Some("O.B.F x Terremoto - São Paulo Special")
        );
        assert_eq!(episodes[1].display_title, None);
    }

    #[test]
    fn date_is_the_london_date() {
        // episodeDate 2026-10-24T23:00Z is London midnight on 25 Oct (BST).
        assert_eq!(episode("2315290").date, "2026-10-25");

        // episodeDate 2026-10-29T00:00Z is London midnight on 29 Oct (GMT).
        assert_eq!(episode("2319482").date, "2026-10-29");
    }

    #[test]
    fn time_comes_from_episode_time_without_its_date() {
        // episodeTime is 2026-10-29T16:00Z, four days after the broadcast date.
        let e = episode("2315290");

        assert_eq!(e.date, "2026-10-25");
        assert_eq!(e.time, "16:00");
    }

    #[test]
    fn time_is_formatted_in_london() {
        let json = include_str!("../tests/fixtures/schedule.json")
            .replace("2026-10-29T16:00:00+00:00", "2026-07-01T16:00:00+00:00");
        let e = map_episodes(&json)
            .unwrap()
            .into_iter()
            .find(|e| e.id == "2315290")
            .unwrap();

        assert_eq!(e.time, "17:00");
    }

    #[test]
    fn maps_show_episodes_like_the_schedule() {
        let episodes = map_episodes(include_str!("../tests/fixtures/show.json")).unwrap();
        let ids: Vec<_> = episodes.iter().map(|e| e.id.as_str()).collect();

        assert_eq!(ids, ["2315290", "2284193", "2241796", "2101661"]);
        assert_eq!(episodes[0], episode("2315290"));
        assert_eq!(episodes[1].mp3, None);
        // episodeDate 2026-07-01T23:00Z is London midnight on 2 Jul (BST).
        assert_eq!(episodes[1].date, "2026-07-02");
        assert_eq!(
            episodes[2].mp3.as_deref(),
            Some("https://replay.rinse.fm/france/Dubquake220226(320).mp3")
        );
        assert_eq!(episodes[2].date, "2026-02-22");
        assert_eq!(episodes[3].mp3, None);
    }

    fn show_fixture() -> Vec<Episode> {
        map_episodes(include_str!("../tests/fixtures/show.json")).unwrap()
    }

    #[test]
    fn maps_the_show_image_and_description() {
        let show = map_show(include_str!("../tests/fixtures/show.json")).unwrap();

        assert_eq!(
            show.details.image,
            Some(format!(
                "{IMAGE_SCHEME_BASE}/Dubquake-Records-Rinse-FR-Class-Of-2025_Original.jpg"
            ))
        );
        assert!(show
            .details
            .description
            .unwrap()
            .starts_with("<p>Founded by O.B.F Sound System"));
        assert_eq!(show.episodes, show_fixture());
    }

    #[test]
    fn a_show_without_image_or_description_has_neither() {
        let mut json: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/show.json")).unwrap();

        json["entry"]["featuredImage"] = serde_json::json!([]);
        json["entry"]["description"] = serde_json::json!(null);

        let show = map_show(&json.to_string()).unwrap();

        assert_eq!(show.details, ShowDetails::default());
    }

    #[test]
    fn malformed_show_details_still_map_the_episodes() {
        let mut json: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/show.json")).unwrap();

        json["entry"]["featuredImage"] = serde_json::json!(null);

        let show = map_show(&json.to_string()).unwrap();

        assert_eq!(show.details, ShowDetails::default());
        assert_eq!(show.episodes, show_fixture());
    }

    #[test]
    fn episodes_without_a_date_are_skipped() {
        let mut json: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/show.json")).unwrap();

        json["episodes"][0]["episodeDate"] = serde_json::json!(null);

        let episodes = map_show(&json.to_string()).unwrap().episodes;

        assert_eq!(episodes.len(), show_fixture().len() - 1);
    }

    #[test]
    fn the_image_filename_is_percent_encoded() {
        let mut json: serde_json::Value =
            serde_json::from_str(include_str!("../tests/fixtures/show.json")).unwrap();

        json["entry"]["featuredImage"][0]["filename"] = serde_json::json!("a b#?.jpg");

        assert_eq!(
            map_show(&json.to_string()).unwrap().details.image,
            Some(format!("{IMAGE_SCHEME_BASE}/a%20b%23%3F.jpg"))
        );
    }

    #[test]
    fn a_cached_image_name_cannot_leave_the_cache() {
        let cache = std::env::temp_dir();

        for name in ["", ".", "..", "../x.jpg", "a/b.jpg", "..\\x.jpg"] {
            assert!(tauri::async_runtime::block_on(cached_image(name, &cache)).is_err());
        }
    }

    #[test]
    fn clearing_the_image_cache_empties_it() {
        let cache = std::env::temp_dir().join(format!("rinse-images-{}", std::process::id()));

        assert_eq!(image_cache_size(&cache), 0);

        std::fs::create_dir_all(&cache).unwrap();
        std::fs::write(cache.join("a.jpg"), [0; 3]).unwrap();
        std::fs::write(cache.join("b.jpg"), [0; 4]).unwrap();

        assert_eq!(image_cache_size(&cache), 7);

        clear_image_cache(&cache).unwrap();

        assert_eq!(image_cache_size(&cache), 0);
        clear_image_cache(&cache).unwrap();
    }

    #[test]
    fn maps_every_show_in_a_show_index_page() {
        let shows = map_show_index(include_str!("../tests/fixtures/shows.json")).unwrap();
        let show = |slug: &str| shows.iter().find(|s| s.slug == slug).unwrap();

        assert_eq!(shows.len(), 20);
        assert_eq!(
            *show("guava"),
            DirectoryShow {
                slug: "guava".into(),
                title: "Guava".into(),
                station: "Rinse FM".into(),
                genres: vec!["Bass".into(), "House".into(), "Techno".into()],
            }
        );
        assert_eq!(show("grown-ass-folks-melodies").station, "Rinse FR");
        assert_eq!(show("halogenix").station, "Kool FM");
        assert_eq!(show("harmonia").station, "SWU FM");
        assert!(show("harmonia").genres.is_empty());
        // A channel that isn't one of the four stations passes through as its slug.
        assert_eq!(show("hannah").station, "radio-alhara");
        // A show without a channel is still listed, so it can be followed.
        assert_eq!(show("hannah-wants").station, "");
    }

    #[test]
    fn the_last_show_index_page_is_empty() {
        assert_eq!(map_show_index(r#"{"entries":[]}"#).unwrap(), []);
    }

    #[test]
    fn an_empty_store_keeps_running_in_the_menu_bar() {
        let settings: Settings = serde_json::from_str("{}").unwrap();

        assert!(settings.keep_running);
    }

    #[test]
    fn an_empty_store_updates_every_6_hours() {
        let settings: Settings = serde_json::from_str("{}").unwrap();

        assert_eq!(settings.update_interval, 6);
    }

    #[test]
    fn an_empty_store_checks_for_app_updates_every_24_hours() {
        let settings: Settings = serde_json::from_str("{}").unwrap();

        assert_eq!(settings.app_update_interval, 24);
    }

    const HOUR: i64 = 60 * 60;

    #[test]
    fn an_update_is_due_once_the_interval_has_passed() {
        assert!(!update_due(0, 5 * HOUR, 6));
        assert!(update_due(0, 6 * HOUR, 6));
        assert!(update_due(0, 7 * HOUR, 6));
    }

    #[test]
    fn an_update_a_few_seconds_past_the_hour_doesnt_delay_the_next() {
        assert!(update_due(12 * HOUR + 5, 18 * HOUR, 6));
    }

    #[test]
    fn a_startup_update_mid_hour_waits_for_the_full_interval() {
        assert!(!update_due(10 * HOUR + 37 * 60, 16 * HOUR, 6));
        assert!(update_due(10 * HOUR + 37 * 60, 17 * HOUR, 6));
    }

    #[test]
    fn subscribe_marks_only_available_episodes_as_seen() {
        let mut settings = Settings::default();

        settings.subscribe("dubquake-records", "Dubquake Records", &show_fixture());

        assert_eq!(
            settings.subscriptions,
            [Subscription {
                slug: "dubquake-records".into(),
                title: "Dubquake Records".into(),
            }]
        );
        assert_eq!(
            settings.seen,
            BTreeSet::from(["2315290".into(), "2241796".into()])
        );
    }

    #[test]
    fn unsubscribe_removes_only_that_show() {
        let mut settings = Settings::default();

        settings.subscribe("dubquake-records", "Dubquake Records", &[]);
        settings.subscribe("other", "Other", &[]);
        settings.unsubscribe("dubquake-records");

        assert_eq!(
            settings.subscriptions,
            [Subscription {
                slug: "other".into(),
                title: "Other".into(),
            }]
        );
    }

    #[test]
    fn subscribing_twice_keeps_one_subscription() {
        let mut settings = Settings::default();

        settings.subscribe("dubquake-records", "Dubquake Records", &[]);
        settings.subscribe("dubquake-records", "Dubquake Records", &[]);

        assert_eq!(settings.subscriptions.len(), 1);
    }

    fn dubquake() -> Vec<Subscription> {
        vec![Subscription {
            slug: "dubquake-records".into(),
            title: "Dubquake Records".into(),
        }]
    }

    #[test]
    fn new_episodes_returns_unseen_available_episodes_of_subscribed_shows() {
        let ids: Vec<_> = new_episodes(&dubquake(), &BTreeSet::new(), show_fixture())
            .into_iter()
            .map(|e| e.id)
            .collect();

        assert_eq!(ids, ["2315290", "2241796"]);
    }

    #[test]
    fn new_episodes_excludes_seen_unavailable_and_unsubscribed_episodes() {
        // 2315290 is seen, 2284193 and 2101661 have no mp3, 2319482 is another show's.
        let mut episodes = show_fixture();

        episodes.push(episode("2319482"));

        let seen = BTreeSet::from(["2315290".into()]);
        let ids: Vec<_> = new_episodes(&dubquake(), &seen, episodes)
            .into_iter()
            .map(|e| e.id)
            .collect();

        assert_eq!(ids, ["2241796"]);
    }

    #[test]
    fn previous_downloads_lists_cached_downloads_newest_first() {
        let downloaded = BTreeSet::from(["2241796".into(), "2315290".into(), "missing".into()]);
        let mut cache = show_fixture();

        cache.reverse();

        let ids: Vec<_> = previous_downloads(&downloaded, cache)
            .into_iter()
            .map(|e| e.id)
            .collect();

        assert_eq!(ids, ["2315290", "2241796"]);
    }

    #[test]
    fn a_downloaded_file_is_found_under_its_download_name() {
        let folder = std::env::temp_dir().join(format!("rinse-downloads-{}", std::process::id()));
        let episode = episode("2315290");

        std::fs::create_dir_all(&folder).unwrap();

        assert_eq!(downloaded_file(&folder, &episode), None);

        std::fs::write(folder.join(file_name(&episode)), []).unwrap();

        assert_eq!(
            downloaded_file(&folder, &episode),
            Some(folder.join(file_name(&episode)))
        );
        std::fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_show_fetch_keeps_the_schedule_mark() {
        let scheduled = Episode {
            scheduled: true,
            ..episode("2315290")
        };
        let merged = merge_episode(Some(scheduled), show_fixture().remove(0));

        assert!(merged.scheduled);
    }

    #[test]
    fn a_show_only_episode_stays_unmarked() {
        assert!(!merge_episode(None, show_fixture().remove(0)).scheduled);
    }

    #[test]
    fn cache_entries_without_the_mark_count_as_scheduled() {
        let mut value = serde_json::to_value(episode("2315290")).unwrap();

        value.as_object_mut().unwrap().remove("scheduled");

        let e: Episode = serde_json::from_value(value).unwrap();

        assert!(e.scheduled);
    }

    fn day(date: &str) -> NaiveDate {
        NaiveDate::parse_from_str(date, "%Y-%m-%d").unwrap()
    }

    /// 2315290 is from 2026-10-25.
    fn checked(found: Option<bool>) -> Episode {
        Episode {
            mp3_found: found,
            ..episode("2315290")
        }
    }

    #[test]
    fn an_episode_under_a_month_old_is_checked_on_every_update() {
        for found in [None, Some(true), Some(false)] {
            assert!(checked(found).check_due(day("2026-11-24")));
        }
    }

    #[test]
    fn an_episode_over_a_month_old_is_checked_only_until_a_check_succeeds() {
        assert!(checked(None).check_due(day("2026-11-25")));
        assert!(!checked(Some(true)).check_due(day("2026-11-25")));
        assert!(!checked(Some(false)).check_due(day("2026-11-25")));
    }

    #[test]
    fn an_episode_without_an_mp3_is_never_checked() {
        assert!(!episode("2319625").check_due(day("2026-10-31")));
    }

    #[test]
    fn only_a_404_makes_an_mp3_missing() {
        assert_eq!(check_result(StatusCode::OK), Some(true));
        assert_eq!(check_result(StatusCode::NOT_FOUND), Some(false));
        assert_eq!(check_result(StatusCode::FORBIDDEN), None);
        assert_eq!(check_result(StatusCode::INTERNAL_SERVER_ERROR), None);
        assert!(checked(None).available());
        assert!(checked(Some(true)).available());
        assert!(!checked(Some(false)).available());
        assert!(!episode("2319625").available());
    }

    #[test]
    fn a_fetch_keeps_the_check_result_of_an_unchanged_link() {
        let merged = merge_episode(Some(checked(Some(false))), episode("2315290"));

        assert_eq!(merged.mp3_found, Some(false));
    }

    #[test]
    fn a_changed_link_throws_away_the_check_result() {
        let fetched = Episode {
            mp3: Some("https://replay.rinse.fm/france/fixed.mp3".into()),
            ..episode("2315290")
        };
        let merged = merge_episode(Some(checked(Some(false))), fetched);

        assert_eq!(merged.mp3_found, None);
    }

    #[test]
    fn a_fetch_without_an_mp3_keeps_the_cached_link_and_check_result() {
        let fetched = Episode {
            mp3: None,
            ..episode("2315290")
        };
        let merged = merge_episode(Some(checked(Some(true))), fetched);

        assert_eq!(merged.mp3, episode("2315290").mp3);
        assert_eq!(merged.mp3_found, Some(true));
    }

    #[test]
    fn copies_in_one_update_merge_with_each_other() {
        let schedule = Episode {
            scheduled: true,
            ..episode("2315290")
        };
        let show = Episode {
            mp3: None,
            ..episode("2315290")
        };
        let merged = merge_episodes(vec![schedule, show], |_| None);

        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].mp3, episode("2315290").mp3);
        assert!(merged[0].scheduled);
    }

    #[test]
    fn new_episodes_excludes_missing_mp3s() {
        let episodes = vec![checked(Some(false))];

        assert_eq!(new_episodes(&dubquake(), &BTreeSet::new(), episodes), []);
    }

    fn queued(id: &str, folder: &str) -> Download {
        Download {
            episode: episode(id),
            folder: folder.into(),
        }
    }

    #[test]
    fn the_download_queue_runs_first_in_first_out_and_skips_duplicates() {
        let mut queue = DownloadQueue::default();

        assert!(queue.push(queued("2315290", "/a")));
        assert!(queue.push(queued("2319482", "/a")));
        assert!(!queue.push(queued("2315290", "/a")));
        assert_eq!(queue.next().unwrap().episode.id, "2315290");
        assert!(!queue.push(queued("2315290", "/a")));
        assert_eq!(queue.next(), None);

        queue.finish(true);

        assert_eq!(queue.next().unwrap().episode.id, "2319482");
    }

    #[test]
    fn only_a_successful_download_is_recorded_as_downloaded() {
        let mut queue = DownloadQueue::default();

        queue.push(queued("2315290", "/a"));
        queue.push(queued("2319482", "/a"));
        queue.next();
        queue.finish(true);
        queue.next();
        queue.finish(false);

        assert_eq!(queue.downloaded, BTreeSet::from(["2315290".to_string()]));
    }

    #[test]
    fn a_failed_download_is_kept_until_the_next_one_starts() {
        let mut queue = DownloadQueue::default();

        queue.push(queued("2315290", "/a"));
        queue.push(queued("2319482", "/a"));
        queue.next();
        queue.finish(false);

        assert_eq!(queue.failed.as_ref().unwrap().episode.id, "2315290");
        assert_eq!(queue.next().unwrap().episode.id, "2319482");
        assert_eq!(queue.failed, None);
    }

    #[test]
    fn cancelling_the_running_download_neither_fails_nor_records_it() {
        let mut queue = DownloadQueue::default();

        assert!(!queue.cancel());

        queue.push(queued("2315290", "/a"));
        queue.push(queued("2319482", "/a"));
        queue.next();
        queue.percent = Some(40);

        assert!(queue.cancel());
        assert_eq!(queue.current, None);
        assert_eq!(queue.percent, None);
        assert_eq!(queue.failed, None);
        assert!(queue.downloaded.is_empty());
        assert_eq!(queue.next().unwrap().episode.id, "2319482");
    }

    #[test]
    fn removing_a_waiting_download_drops_only_that_one() {
        let mut queue = DownloadQueue::default();

        queue.push(queued("2315290", "/a"));
        queue.push(queued("2319482", "/a"));
        queue.push(queued("2319625", "/a"));
        queue.next();

        assert!(queue.remove("2319482"));
        assert!(!queue.remove("2315290"));
        assert!(!queue.remove("9999999"));
        assert_eq!(queue.current.as_ref().unwrap().episode.id, "2315290");

        let waiting: Vec<_> = queue
            .waiting
            .iter()
            .map(|d| d.episode.id.as_str())
            .collect();

        assert_eq!(waiting, ["2319625"]);
    }

    #[test]
    fn moving_a_waiting_download_reorders_only_the_waiting_ones() {
        let mut queue = DownloadQueue::default();

        queue.push(queued("2315290", "/a"));
        queue.push(queued("2319482", "/a"));
        queue.push(queued("2319625", "/a"));
        queue.push(queued("2319238", "/a"));
        queue.next();

        assert!(queue.move_to("2319238", 0));
        assert!(!queue.move_to("2315290", 0));
        assert!(!queue.move_to("9999999", 0));
        assert!(!queue.move_to("2319482", 3));
        assert_eq!(queue.current.as_ref().unwrap().episode.id, "2315290");

        let waiting: Vec<_> = queue
            .waiting
            .iter()
            .map(|d| d.episode.id.as_str())
            .collect();

        assert_eq!(waiting, ["2319238", "2319482", "2319625"]);
    }

    #[test]
    fn a_restored_queue_starts_with_the_interrupted_download_in_its_own_folder() {
        let mut queue = DownloadQueue::default();

        queue.push(queued("2315290", "/a"));
        queue.push(queued("2319482", "/b"));
        queue.next();
        queue.percent = Some(40);

        let saved = serde_json::to_value(&queue).unwrap();
        let mut queue = DownloadQueue::restore(serde_json::from_value(saved).unwrap());

        assert_eq!(queue.current, None);
        assert_eq!(queue.percent, None);

        let first = queue.next().unwrap();

        assert_eq!(first.episode.id, "2315290");
        assert_eq!(first.folder, Path::new("/a"));

        queue.finish(true);

        assert_eq!(queue.next().unwrap().folder, Path::new("/b"));
    }

    #[test]
    fn a_resume_continues_only_on_206_from_the_requested_offset() {
        let partial = StatusCode::PARTIAL_CONTENT;

        assert!(resumes(partial, Some("bytes 1000-4999/5000"), 1000));
        assert!(!resumes(StatusCode::OK, Some("bytes 1000-4999/5000"), 1000));
        assert!(!resumes(StatusCode::OK, None, 1000));
        assert!(!resumes(partial, Some("bytes 0-4999/5000"), 1000));
        assert!(!resumes(partial, Some("bytes 10000-49999/50000"), 1000));
        assert!(!resumes(partial, None, 1000));
    }

    #[test]
    fn file_name_is_show_and_london_date() {
        assert_eq!(
            file_name(&episode("2315290")),
            "Dubquake Records - 2026-10-25.mp3"
        );
    }

    #[test]
    fn file_name_strips_unsafe_characters() {
        let e = Episode {
            show_title: "A/B: C\\D*?\"<E>|".into(),
            ..episode("2315290")
        };

        assert_eq!(file_name(&e), "AB CDE - 2026-10-25.mp3");
    }
}
