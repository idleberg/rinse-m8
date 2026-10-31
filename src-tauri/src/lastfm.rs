use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::time::Duration;

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

/// The app's API account, read at compile time, so a build without one has no Last.fm.
pub fn credentials() -> Option<(&'static str, &'static str)> {
    let key = option_env!("LASTFM_API_KEY").filter(|k| !k.is_empty())?;
    let secret = option_env!("LASTFM_API_SECRET").filter(|s| !s.is_empty())?;

    Some((key, secret))
}

/// Gets a token, has `open` show its approval page in the browser, then waits a few minutes for the user to approve it.
pub async fn connect(open: impl FnOnce(&str) -> Result<(), String>) -> Result<Session, String> {
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

    // The token lasts an hour, but clicking Allow takes seconds, and a forgotten tab shouldn't keep the row waiting
    for _ in 0..100 {
        tokio::time::sleep(Duration::from_secs(3)).await;

        if let Some(session) = parse_session(&call("auth.getSession", &[("token", &token)]).await?)?
        {
            return Ok(session);
        }
    }

    Err("Last.fm approval timed out".into())
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

    #[test]
    fn other_errors_fail() {
        let reply = r#"{"message":"This token has expired","error":15}"#;

        assert_eq!(
            parse_session(reply),
            Err("This token has expired".to_owned())
        );
    }
}
