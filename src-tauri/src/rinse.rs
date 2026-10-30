use chrono::DateTime;
use chrono_tz::Europe::London;
use futures_util::StreamExt;
use reqwest::header::{CONTENT_RANGE, RANGE};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, VecDeque};
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
}

fn scheduled_by_default() -> bool {
    true
}

/// The episode to store for `fetched`: its fresh fields, keeping the schedule mark of the `cached` copy.
pub fn merge_episode(cached: Option<Episode>, fetched: Episode) -> Episode {
    Episode {
        scheduled: fetched.scheduled || cached.is_some_and(|e| e.scheduled),
        ..fetched
    }
}

/// Everything kept in the settings store, one store key per field.
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub subscriptions: Vec<Subscription>,
    /// Ids of episodes that must never trigger a notification.
    pub seen: BTreeSet<String>,
    pub download_folder: Option<PathBuf>,
    /// Whether the poller also downloads each new episode into `download_folder`.
    pub auto_download: bool,
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
                .filter(|e| e.mp3.is_some())
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
            e.mp3.is_some()
                && !seen.contains(&e.id)
                && subscriptions.iter().any(|s| s.slug == e.show_slug)
        })
        .collect()
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
    episode_date: String,
    episode_time: Option<String>,
    episode_length: Option<u32>,
    is_rebroadcast: bool,
    genre_tag: Vec<RawGenre>,
    file_url: Option<String>,
    channel: Vec<RawChannel>,
    parent_show: Vec<RawShow>,
}

#[derive(Deserialize)]
struct RawShow {
    id: String,
    slug: String,
    title: String,
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

/// Skips episodes without a channel, show, time or parseable date, which can't be placed in the table.
fn map_episode(raw: RawEpisode) -> Option<Episode> {
    let station = match raw.channel.first()?.slug.as_str() {
        "uk" => "Rinse FM",
        "france" => "Rinse FR",
        "kool" => "Kool FM",
        "swu" => "SWU FM",
        other => other,
    }
    .to_string();

    let show = raw.parent_show.into_iter().next()?;
    let london = |s: &str| {
        DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&London))
    };

    // episodeDate is London midnight in UTC. episodeTime is the London wall-clock time put on
    // today's date and converted with today's offset, so convert it back with that same offset:
    // the broadcast date's offset would shift BST episodes by an hour.
    let date = london(&raw.episode_date)?.format("%Y-%m-%d").to_string();
    let time = london(raw.episode_time.as_deref()?)?
        .format("%H:%M")
        .to_string();

    Some(Episode {
        id: raw.id,
        title: raw.title,
        show_id: show.id,
        show_slug: show.slug,
        show_title: show.title,
        station,
        date,
        time,
        length: raw.episode_length.unwrap_or(0),
        rebroadcast: raw.is_rebroadcast,
        genres: raw.genre_tag.into_iter().map(|t| t.title).collect(),
        mp3: raw.file_url.filter(|url| url.ends_with(".mp3")),
        scheduled: false,
    })
}

pub async fn fetch_schedule() -> Result<Vec<Episode>, String> {
    let mut episodes = fetch_episodes("https://www.rinse.fm/api/query/v1/schedule").await?;

    for episode in &mut episodes {
        episode.scheduled = true;
    }

    Ok(episodes)
}

/// The show's ~30 most recent episodes.
pub async fn fetch_show(slug: &str) -> Result<Vec<Episode>, String> {
    fetch_episodes(&format!("https://www.rinse.fm/api/query/v1/shows/{slug}")).await
}

async fn fetch_episodes(url: &str) -> Result<Vec<Episode>, String> {
    let json = reqwest::get(url)
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    map_episodes(&json).map_err(|e| e.to_string())
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
    let part = path.with_extension("mp3.part");
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

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> Vec<Episode> {
        map_episodes(include_str!("../tests/fixtures/schedule.json")).unwrap()
    }

    fn episode(id: &str) -> Episode {
        fixture().into_iter().find(|e| e.id == id).unwrap()
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
