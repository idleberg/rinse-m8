mod rinse;

use std::path::PathBuf;
use tauri_plugin_store::StoreExt;

/// Merges a fresh schedule fetch into the episode cache and returns the whole cache.
/// A failed fetch still returns the cache, so history survives being offline.
#[tauri::command]
async fn get_episodes(app: tauri::AppHandle) -> Result<Vec<rinse::Episode>, String> {
    let fetched = rinse::fetch_schedule().await.unwrap_or_else(|e| {
        eprintln!("schedule fetch failed: {e}");
        Vec::new()
    });

    merge(&app, fetched)
}

/// Merges the show's recent episodes into the episode cache and returns the whole cache.
#[tauri::command]
async fn refresh_show(app: tauri::AppHandle, slug: String) -> Result<Vec<rinse::Episode>, String> {
    let fetched = rinse::fetch_show(&slug).await?;

    merge(&app, fetched)
}

/// Adds `episodes` to the cache, replacing any with the same id, and returns the whole cache.
fn merge(
    app: &tauri::AppHandle,
    episodes: Vec<rinse::Episode>,
) -> Result<Vec<rinse::Episode>, String> {
    // ponytail: unbounded cache keyed by id, prune by age if it grows large
    let cache = app.store("episodes.json").map_err(|e| e.to_string())?;

    for episode in episodes {
        let value = serde_json::to_value(&episode).map_err(|e| e.to_string())?;
        cache.set(episode.id, value);
    }

    cache.save().map_err(|e| e.to_string())?;

    Ok(cache
        .values()
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect())
}

/// Streams the episode's mp3 into the download folder from settings, which the frontend sets first.
#[tauri::command]
async fn download(app: tauri::AppHandle, episode: rinse::Episode) -> Result<(), String> {
    let settings = app.store("settings.json").map_err(|e| e.to_string())?;
    let folder = settings
        .get("downloadFolder")
        .and_then(|v| v.as_str().map(PathBuf::from))
        .ok_or("no download folder set")?;

    rinse::download(&episode, &folder).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_episodes,
            refresh_show,
            download
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
