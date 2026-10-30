use chrono::DateTime;
use chrono_tz::Europe::London;
use serde::{Deserialize, Serialize};

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
}

#[derive(Deserialize)]
struct RawSchedule {
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

pub fn map_schedule(json: &str) -> serde_json::Result<Vec<Episode>> {
    let raw: RawSchedule = serde_json::from_str(json)?;

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
    let london = |s: &str| DateTime::parse_from_rfc3339(s).ok().map(|d| d.with_timezone(&London));

    // episodeDate is London midnight in UTC. episodeTime is the London wall-clock time put on
    // today's date and converted with today's offset, so convert it back with that same offset:
    // the broadcast date's offset would shift BST episodes by an hour.
    let date = london(&raw.episode_date)?.format("%Y-%m-%d").to_string();
    let time = london(raw.episode_time.as_deref()?)?.format("%H:%M").to_string();

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
    })
}

pub async fn fetch_schedule() -> Result<Vec<Episode>, String> {
    let json = reqwest::get("https://www.rinse.fm/api/query/v1/schedule")
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    map_schedule(&json).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> Vec<Episode> {
        map_schedule(include_str!("../tests/fixtures/schedule.json")).unwrap()
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
        let e = map_schedule(&json)
            .unwrap()
            .into_iter()
            .find(|e| e.id == "2315290")
            .unwrap();

        assert_eq!(e.time, "17:00");
    }
}
