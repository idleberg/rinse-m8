use crate::rinse::Episode;
use chrono::NaiveDate;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::time::Duration;
use tokio::sync::oneshot;

const API: &str = "https://ws.audioscrobbler.com/2.0/";

/// A connected Last.fm account. The key doesn't expire, so it's kept until the user disconnects.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct Session {
    pub name: String,
    pub key: String,
}

/// The session in an `auth.getSession` reply, or none while the user hasn't approved the token yet.
pub fn parse_session(reply: &str) -> Result<Option<Session>, String> {
    #[derive(Deserialize)]
    struct Body {
        session: Session,
    }

    match parse::<Body>(reply) {
        Ok(body) => Ok(Some(body.session)),
        Err((Some(14), _)) => Ok(None),
        Err((_, message)) => Err(message),
    }
}

/// A reply's body, or its error code and message; a reply that isn't JSON has no code.
fn parse<T: DeserializeOwned>(reply: &str) -> Result<T, (Option<u32>, String)> {
    // Error first, since a body type with only optional fields would match an error reply too
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Reply<T> {
        Error { error: u32, message: String },
        Ok(T),
    }

    match serde_json::from_str(reply) {
        Ok(Reply::Ok(body)) => Ok(body),
        Ok(Reply::Error { error, message }) => Err((Some(error), message)),
        Err(e) => Err((None, e.to_string())),
    }
}

/// An episode as Last.fm sees it, one track named like the ID3 tags Rinse writes into its mp3s.
#[derive(Debug, PartialEq)]
pub struct Track {
    pub artist: String,
    pub album: String,
    pub track: String,
    /// Seconds.
    pub duration: u32,
}

/// Built from the episode rather than read from its tags, which are typed by hand and missing on Rinse FR.
pub fn track(episode: &Episode) -> Track {
    let title = match &episode.display_title {
        Some(display_title) => format!("{} {display_title}", episode.show_title),
        None => episode.show_title.clone(),
    };

    // Rinse's titles can hold tabs and doubled spaces, which the webview collapses but Last.fm doesn't take
    let title = title.split_whitespace().collect::<Vec<_>>().join(" ");

    let date = NaiveDate::parse_from_str(&episode.date, "%Y-%m-%d").map_or_else(
        |_| episode.date.clone(),
        |d| d.format("%-d %B %Y").to_string(),
    );

    Track {
        artist: episode.station.clone(),
        album: format!("{} Podcast", episode.station),
        track: format!("{title} - {date}"),
        duration: episode.length * 60,
    }
}

/// Why a call made with a session failed.
#[derive(Debug)]
pub enum Failure {
    /// Last.fm no longer accepts the session, for example because the user revoked access.
    InvalidSession,
    Other(String),
}

/// Sets `track` as "Scrobbling now" on the session's profile.
pub async fn now_playing(session: &Session, track: &Track) -> Result<(), Failure> {
    send("track.updateNowPlaying", session, track, &[]).await
}

/// Adds `track` to the session's scrobbles, stamped with when it started playing in Unix seconds.
pub async fn scrobble(session: &Session, track: &Track, started: u64) -> Result<(), Failure> {
    send(
        "track.scrobble",
        session,
        track,
        &[("timestamp", &started.to_string())],
    )
    .await
}

/// Loves `track` on the session's profile. It takes only the names, so the album and duration stay out.
pub async fn love(session: &Session, track: &Track) -> Result<(), Failure> {
    post(
        "track.love",
        &[
            ("artist", &track.artist),
            ("track", &track.track),
            ("sk", &session.key),
        ],
    )
    .await
}

/// Calls a track method with `track`'s fields and `extra` params.
async fn send(
    method: &str,
    session: &Session,
    track: &Track,
    extra: &[(&str, &str)],
) -> Result<(), Failure> {
    let duration = track.duration.to_string();
    let mut params = vec![
        ("artist", track.artist.as_str()),
        ("album", &track.album),
        ("track", &track.track),
        ("sk", &session.key),
    ];

    params.extend_from_slice(extra);

    // Rinse leaves some lengths out, which come through as 0
    if track.duration > 0 {
        params.push(("duration", &duration));
    }

    post(method, &params).await
}

/// Calls a method with a session key among `params`, telling a rejected session apart from other failures.
async fn post(method: &str, params: &[(&str, &str)]) -> Result<(), Failure> {
    let reply = call(method, params).await.map_err(Failure::Other)?;

    match parse::<serde_json::Value>(&reply) {
        Ok(_) => Ok(()),
        // 9 is "Invalid session key"
        Err((Some(9), _)) => Err(Failure::InvalidSession),
        Err((_, message)) => Err(Failure::Other(message)),
    }
}

/// The app's API account, read at compile time, so a build without one has no Last.fm.
pub fn credentials() -> Option<(&'static str, &'static str)> {
    let key = option_env!("LASTFM_API_KEY").filter(|k| !k.is_empty())?;
    let secret = option_env!("LASTFM_API_SECRET").filter(|s| !s.is_empty())?;

    Some((key, secret))
}

/// Gets a token, has `open` show its approval page in the browser, then waits a few minutes for the user to approve it.
/// Gives none if `cancel` fires or is dropped first, abandoning the token.
pub async fn connect(
    open: impl FnOnce(&str) -> Result<(), String>,
    cancel: oneshot::Receiver<()>,
) -> Result<Option<Session>, String> {
    #[derive(Deserialize)]
    struct Body {
        token: String,
    }

    let (key, _) = credentials().ok_or("this build has no Last.fm API key")?;
    let token = parse::<Body>(&call("auth.getToken", &[]).await?)
        .map_err(|(_, message)| message)?
        .token;

    open(&format!(
        "https://www.last.fm/api/auth/?api_key={key}&token={token}"
    ))?;

    // Each poll's future copies this reference, since it can't borrow from the closure that makes it
    let token = &token;

    wait_for_approval(
        move || async move { parse_session(&call("auth.getSession", &[("token", token)]).await?) },
        Duration::from_secs(3),
        cancel,
    )
    .await
}

/// Asks `get_session` every `interval` until it gives a session, or gives none once `cancel` fires or is dropped.
async fn wait_for_approval<F: Future<Output = Result<Option<Session>, String>>>(
    mut get_session: impl FnMut() -> F,
    interval: Duration,
    cancel: oneshot::Receiver<()>,
) -> Result<Option<Session>, String> {
    let poll = async {
        // The token lasts an hour, but clicking Allow takes seconds, and a forgotten tab shouldn't keep the row waiting
        for _ in 0..100 {
            tokio::time::sleep(interval).await;

            if let Some(session) = get_session().await? {
                return Ok(session);
            }
        }

        Err("Last.fm approval timed out".into())
    };

    // Cancel first, so a session arriving in the same poll as a cancel isn't kept
    tokio::select! {
        biased;
        _ = cancel => Ok(None),
        result = poll => result.map(Some),
    }
}

/// Sends a signed call and returns the reply, error replies included.
async fn call(method: &str, params: &[(&str, &str)]) -> Result<String, String> {
    let (key, secret) = credentials().ok_or("this build has no Last.fm API key")?;
    let mut params = [params, &[("method", method), ("api_key", key)]].concat();
    let signature = sign(&params, secret);

    // `format` stays out of the signature
    params.push(("api_sig", &signature));
    params.push(("format", "json"));

    reqwest::Client::new()
        .post(API)
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

/// `api_sig` for the call with `params`: the MD5 of each name and value, sorted by name, followed by the secret.
pub fn sign(params: &[(&str, &str)], secret: &str) -> String {
    let mut sorted = params.to_vec();

    sorted.sort_unstable();

    let joined: String = sorted.iter().map(|(k, v)| format!("{k}{v}")).collect();

    format!("{:x}", md5::compute(joined + secret))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signs_the_sorted_params_with_the_secret() {
        let params = [
            ("token", "yyy"),
            ("method", "auth.getSession"),
            ("api_key", "xxx"),
        ];

        assert_eq!(sign(&params, "zzz"), "75df1fdb6b738160924a52b1732fdde7");
    }

    #[test]
    fn approved_token_gives_the_session() {
        let reply = r#"{"session":{"name":"hutch","key":"d580d57f32848f5dcf574d1ce18d78b2","subscriber":0}}"#;

        assert_eq!(
            parse_session(reply),
            Ok(Some(Session {
                name: "hutch".into(),
                key: "d580d57f32848f5dcf574d1ce18d78b2".into(),
            }))
        );
    }

    #[test]
    fn unapproved_token_gives_no_session_yet() {
        let reply = r#"{"message":"This token has not been authorized","error":14}"#;

        assert_eq!(parse_session(reply), Ok(None));
    }

    fn episode(show_title: &str, display_title: Option<&str>) -> Episode {
        Episode {
            id: "2319563".into(),
            title: "Ignored".into(),
            show_id: "1".into(),
            show_slug: "show".into(),
            show_title: show_title.into(),
            display_title: display_title.map(Into::into),
            station: "Kool FM".into(),
            date: "2026-10-30".into(),
            time: "22:00".into(),
            length: 120,
            rebroadcast: false,
            genres: Vec::new(),
            mp3: None,
            scheduled: true,
            mp3_found: None,
            image: None,
            show_image: None,
        }
    }

    #[test]
    fn an_episode_goes_out_as_one_track_named_like_rinse_tags() {
        assert_eq!(
            track(&episode("Amber's", Some("with Hutch"))),
            Track {
                artist: "Kool FM".into(),
                album: "Kool FM Podcast".into(),
                track: "Amber's with Hutch - 30 October 2026".into(),
                duration: 7200,
            }
        );
    }

    #[test]
    fn an_episode_without_a_display_title_is_named_after_the_show() {
        assert_eq!(
            track(&episode("Uncle Dugs", None)).track,
            "Uncle Dugs - 30 October 2026"
        );
    }

    #[test]
    fn whitespace_in_titles_goes_out_as_single_spaces() {
        assert_eq!(
            track(&episode("Stretch AKO", Some("feat.\tFez The Kid"))).track,
            "Stretch AKO feat. Fez The Kid - 30 October 2026"
        );
    }

    #[tokio::test]
    async fn cancelling_mid_poll_gives_no_session() {
        let (sender, receiver) = oneshot::channel();
        let mut cancel = Some(sender);
        let mut polls = 0;

        let result = wait_for_approval(
            || {
                polls += 1;

                if polls == 2 {
                    cancel.take().unwrap().send(()).unwrap();
                }

                async { Ok(None) }
            },
            Duration::from_millis(1),
            receiver,
        )
        .await;

        assert_eq!(result, Ok(None));
        assert_eq!(polls, 2);
    }

    #[test]
    fn other_errors_fail() {
        let reply = r#"{"message":"This token has expired","error":15}"#;

        assert_eq!(
            parse_session(reply),
            Err("This token has expired".to_owned())
        );
    }
}
