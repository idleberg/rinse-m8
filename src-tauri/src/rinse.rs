use chrono::DateTime;
use chrono_tz::Europe::London;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use tokio::fs::File;
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

/// Streams the episode's mp3 into `folder` chunk by chunk.
/// A failed transfer removes the partial file; a failed request leaves any earlier download alone.
pub async fn download(episode: &Episode, folder: &Path) -> Result<(), String> {
    let url = episode.mp3.as_deref().ok_or("episode has no mp3")?;
    let path = folder.join(file_name(episode));

    let mut stream = reqwest::get(url)
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .bytes_stream();
    let mut file = File::create(&path).await.map_err(|e| e.to_string())?;

    let result = async {
        while let Some(chunk) = stream.next().await {
            file.write_all(&chunk.map_err(|e| e.to_string())?)
                .await
                .map_err(|e| e.to_string())?;
        }

        file.flush().await.map_err(|e| e.to_string())
    }
    .await;

    if result.is_err() {
        let _ = tokio::fs::remove_file(&path).await;
    }

    result
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
