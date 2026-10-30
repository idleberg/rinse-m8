mod rinse;

use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_store::StoreExt;

/// Serialises settings read-modify-writes between commands and the poller.
static SETTINGS_LOCK: Mutex<()> = Mutex::new(());

/// The download queue and the signal that wakes its worker.
#[derive(Default)]
struct Downloads {
    queue: Mutex<rinse::DownloadQueue>,
    wake: tokio::sync::Notify,
}

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

/// Adds `episodes` to the cache, replacing any with the same id but keeping its schedule mark, and returns the whole cache.
fn merge(
    app: &tauri::AppHandle,
    episodes: Vec<rinse::Episode>,
) -> Result<Vec<rinse::Episode>, String> {
    // ponytail: unbounded cache keyed by id, prune by age if it grows large
    let cache = app.store("episodes.json").map_err(|e| e.to_string())?;

    for episode in episodes {
        let cached = cache
            .get(&episode.id)
            .and_then(|v| serde_json::from_value(v).ok());
        let episode = rinse::merge_episode(cached, episode);

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

/// Adds the episode to the download queue, unless it's already in it.
#[tauri::command]
fn download(app: tauri::AppHandle, episode: rinse::Episode) {
    if update_downloads(&app, |queue| queue.push(episode)) {
        app.state::<Downloads>().wake.notify_one();
    }
}

#[tauri::command]
fn dismiss_download_failure(app: tauri::AppHandle) {
    update_downloads(&app, |queue| queue.failed = None);
}

/// Applies `change` to the download queue and sends the result to the frontend.
fn update_downloads<T>(
    app: &tauri::AppHandle,
    change: impl FnOnce(&mut rinse::DownloadQueue) -> T,
) -> T {
    let downloads = app.state::<Downloads>();
    let mut queue = downloads.queue.lock().unwrap_or_else(|e| e.into_inner());
    let result = change(&mut queue);

    if let Err(e) = app.emit("download-queue", &*queue) {
        eprintln!("download queue event failed: {e}");
    }

    result
}

/// Works through the download queue one episode at a time, for as long as the app runs.
/// Each download goes into the folder that's set when it starts, which the frontend sets before queueing.
async fn download_worker(app: tauri::AppHandle) {
    loop {
        let Some(episode) = update_downloads(&app, |queue| queue.next()) else {
            app.state::<Downloads>().wake.notified().await;
            continue;
        };

        let result = async {
            let folder = load_settings(&app, serde_json::Map::new())?
                .download_folder
                .ok_or("no download folder set")?;

            rinse::download(&episode, &folder, |percent| {
                update_downloads(&app, |queue| queue.percent = Some(percent));
            })
            .await
        }
        .await;

        if let Err(e) = &result {
            eprintln!("downloading {} failed: {e}", episode.id);
        }

        update_downloads(&app, |queue| queue.finish(result.is_ok()));
    }
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<rinse::Settings, String> {
    load_settings(&app, serde_json::Map::new())
}

/// Saves only the fields in `patch`, so the frontend's copy can't overwrite subscriptions or seen ids.
#[tauri::command]
fn set_settings(
    app: tauri::AppHandle,
    patch: serde_json::Map<String, serde_json::Value>,
) -> Result<(), String> {
    let _lock = SETTINGS_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let settings = load_settings(&app, patch)?;

    save_settings(&app, &settings)
}

/// Follows the show, fetching it first so its already available episodes are marked as seen
/// and pushed to the subscribed table.
#[tauri::command]
async fn subscribe(
    app: tauri::AppHandle,
    slug: String,
    title: String,
) -> Result<rinse::Settings, String> {
    let episodes = rinse::fetch_show(&slug).await?;
    let cache = merge(&app, episodes.clone())?;
    let settings = update_settings(&app, |s| s.subscribe(&slug, &title, &episodes))?;

    app.emit("episodes-updated", cache)
        .map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
fn unsubscribe(app: tauri::AppHandle, slug: String) -> Result<rinse::Settings, String> {
    update_settings(&app, |s| s.unsubscribe(&slug))
}

/// The stored settings with `patch`'s fields on top. A malformed field fails here, before anything is saved.
fn load_settings(
    app: &tauri::AppHandle,
    patch: serde_json::Map<String, serde_json::Value>,
) -> Result<rinse::Settings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let mut fields: serde_json::Map<_, _> = store.entries().into_iter().collect();

    fields.extend(patch);

    serde_json::from_value(fields.into()).map_err(|e| e.to_string())
}

/// Writes one store key per settings field.
fn save_settings(app: &tauri::AppHandle, settings: &rinse::Settings) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    if let serde_json::Value::Object(fields) =
        serde_json::to_value(settings).map_err(|e| e.to_string())?
    {
        for (key, value) in fields {
            store.set(key, value);
        }
    }

    store.save().map_err(|e| e.to_string())
}

/// Applies `change` to the stored settings, saves them and returns the result.
fn update_settings(
    app: &tauri::AppHandle,
    change: impl FnOnce(&mut rinse::Settings),
) -> Result<rinse::Settings, String> {
    let _lock = SETTINGS_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut settings = load_settings(app, serde_json::Map::new())?;

    change(&mut settings);
    save_settings(app, &settings)?;

    Ok(settings)
}

/// Checks the subscriptions at startup and then every 15 minutes, for as long as the app runs.
async fn poll(app: tauri::AppHandle) {
    let mut interval = tokio::time::interval(Duration::from_secs(15 * 60));

    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    loop {
        interval.tick().await;

        if let Err(e) = check_subscriptions(&app).await {
            eprintln!("subscription check failed: {e}");
        }
    }
}

/// Fetches every subscribed show, notifies once per new episode and, if there was one, pushes the cache to the table
/// and queues the new episodes for download when auto-download is on and a folder is set.
async fn check_subscriptions(app: &tauri::AppHandle) -> Result<(), String> {
    let subscriptions = load_settings(app, serde_json::Map::new())?.subscriptions;
    let mut fetched = Vec::new();

    for subscription in &subscriptions {
        match rinse::fetch_show(&subscription.slug).await {
            Ok(episodes) => fetched.extend(episodes),
            Err(e) => eprintln!("fetching {} failed: {e}", subscription.slug),
        }
    }

    let cache = merge(app, fetched.clone())?;
    let mut unseen = Vec::new();
    let mut auto_download = false;

    // Seen is saved before notifying, so a crash can drop a notification but never repeat one.
    update_settings(app, |settings| {
        unseen = rinse::new_episodes(&settings.subscriptions, &settings.seen, fetched);
        settings.seen.extend(unseen.iter().map(|e| e.id.clone()));
        auto_download = settings.auto_download && settings.download_folder.is_some();
    })?;

    if unseen.is_empty() {
        return Ok(());
    }

    for episode in &unseen {
        let date = chrono::NaiveDate::parse_from_str(&episode.date, "%Y-%m-%d")
            .map_or(episode.date.clone(), |d| d.format("%d/%m").to_string());
        let title = format!("New: {} – {date}", episode.show_title);

        if let Err(e) = app.notification().builder().title(title).show() {
            eprintln!("notification failed: {e}");
        }
    }

    // ponytail: the startup check can emit before the webview listens, so its rows show on the next tick
    app.emit("episodes-updated", cache)
        .map_err(|e| e.to_string())?;

    // ponytail: the download queue lives in memory, so queued auto-downloads are lost on quit
    // and a failed one isn't retried, since the episode is already seen
    if auto_download {
        for episode in unseen {
            download(app.clone(), episode);
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(Downloads::default())
        .setup(|app| {
            tauri::async_runtime::spawn(poll(app.handle().clone()));
            tauri::async_runtime::spawn(download_worker(app.handle().clone()));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_episodes,
            refresh_show,
            download,
            dismiss_download_failure,
            get_settings,
            set_settings,
            subscribe,
            unsubscribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
