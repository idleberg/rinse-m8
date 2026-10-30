mod rinse;

use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_store::StoreExt;

/// Serialises settings read-modify-writes between commands and the poller.
static SETTINGS_LOCK: Mutex<()> = Mutex::new(());

/// The download queue and the signals that wake its worker and stop its running download.
struct Downloads {
    queue: Mutex<rinse::DownloadQueue>,
    wake: tokio::sync::Notify,
    cancel: tokio::sync::mpsc::UnboundedSender<()>,
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

/// Merges the show's recent episodes into the episode cache and returns the show's details with the whole cache.
#[tauri::command]
async fn refresh_show(app: tauri::AppHandle, slug: String) -> Result<rinse::ShowPage, String> {
    let fetched = rinse::fetch_show(&slug).await?;

    Ok(rinse::ShowPage {
        episodes: merge(&app, fetched.episodes)?,
        ..fetched
    })
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

/// Adds the episode to the download queue with the current download folder, unless it's already in it.
#[tauri::command]
fn download(app: tauri::AppHandle, episode: rinse::Episode) -> Result<(), String> {
    let folder = load_settings(&app, serde_json::Map::new())?
        .download_folder
        .ok_or("no download folder set")?;

    if update_downloads(&app, |queue| {
        queue.push(rinse::Download { episode, folder })
    }) {
        app.state::<Downloads>().wake.notify_one();
    }

    Ok(())
}

/// The queue as it is now, for a page that missed the events, e.g. the one the restored queue sends at launch.
#[tauri::command]
fn get_download_queue(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let downloads = app.state::<Downloads>();
    let queue = downloads.queue.lock().unwrap_or_else(|e| e.into_inner());

    serde_json::to_value(&*queue).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_download(app: tauri::AppHandle, id: String) {
    update_downloads(&app, |queue| queue.remove(&id));
}

#[tauri::command]
fn move_download(app: tauri::AppHandle, id: String, index: usize) {
    update_downloads(&app, |queue| queue.move_to(&id, index));
}

/// Takes the running download off the queue; the worker then drops its partial file and starts the next one.
#[tauri::command]
fn cancel_download(app: tauri::AppHandle) {
    update_downloads(&app, |queue| {
        if queue.cancel() {
            let _ = app.state::<Downloads>().cancel.send(());
        }
    });
}

#[tauri::command]
fn dismiss_download_failure(app: tauri::AppHandle) {
    update_downloads(&app, |queue| queue.failed = None);
}

/// Applies `change` to the download queue, saves it and sends it to the frontend.
fn update_downloads<T>(
    app: &tauri::AppHandle,
    change: impl FnOnce(&mut rinse::DownloadQueue) -> T,
) -> T {
    let downloads = app.state::<Downloads>();
    let mut queue = downloads.queue.lock().unwrap_or_else(|e| e.into_inner());
    let result = change(&mut queue);

    if let Err(e) = save_downloads(app, &queue) {
        eprintln!("saving the download queue failed: {e}");
    }

    if let Err(e) = app.emit("download-queue", &*queue) {
        eprintln!("download queue event failed: {e}");
    }

    result
}

/// Writes the whole queue, so a quit at any point keeps it as it was.
fn save_downloads(app: &tauri::AppHandle, queue: &rinse::DownloadQueue) -> Result<(), String> {
    let store = app.store("downloads.json").map_err(|e| e.to_string())?;

    store.set(
        "queue",
        serde_json::to_value(queue).map_err(|e| e.to_string())?,
    );

    store.save().map_err(|e| e.to_string())
}

/// The queue saved by the previous run, ready to start again; an unreadable one starts empty.
fn load_downloads(app: &tauri::AppHandle) -> rinse::DownloadQueue {
    let saved = app
        .store("downloads.json")
        .map_err(|e| e.to_string())
        .and_then(|store| {
            store
                .get("queue")
                .map(serde_json::from_value)
                .transpose()
                .map_err(|e| e.to_string())
        })
        .unwrap_or_else(|e| {
            eprintln!("loading the download queue failed: {e}");
            None
        })
        .unwrap_or_default();

    rinse::DownloadQueue::restore(saved)
}

/// Works through the download queue one episode at a time, for as long as the app runs.
async fn download_worker(
    app: tauri::AppHandle,
    mut cancelled: tokio::sync::mpsc::UnboundedReceiver<()>,
) {
    loop {
        // A cancel sent before this lock was for a download that had already ended, so it mustn't stop this one
        let Some(download) = update_downloads(&app, |queue| {
            while cancelled.try_recv().is_ok() {}

            queue.next()
        }) else {
            app.state::<Downloads>().wake.notified().await;
            continue;
        };

        let transfer = rinse::download(&download.episode, &download.folder, |percent| {
            update_downloads(&app, |queue| queue.percent = Some(percent));
        });

        let finished = tokio::select! {
            result = transfer => Some(result),
            Some(()) = cancelled.recv() => None,
        };

        // The cancel already took it off the queue, so only its partial file is left
        let Some(result) = finished else {
            let part = rinse::part_path(&download.episode, &download.folder);

            match tokio::fs::remove_file(&part).await {
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => {
                    eprintln!("deleting {} failed: {e}", part.display());
                }
                _ => {}
            }

            continue;
        };

        if let Err(e) = &result {
            eprintln!("downloading {} failed: {e}", download.episode.id);
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
    let episodes = rinse::fetch_show(&slug).await?.episodes;
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
            Ok(show) => fetched.extend(show.episodes),
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
        let title = format!(
            "New: {} – {}",
            episode.show_title,
            episode.date.replace('-', "/")
        );

        if let Err(e) = app.notification().builder().title(title).show() {
            eprintln!("notification failed: {e}");
        }
    }

    // ponytail: the startup check can emit before the webview listens, so its rows show on the next tick
    app.emit("episodes-updated", cache)
        .map_err(|e| e.to_string())?;

    // ponytail: queued auto-downloads survive restarts, but a failed one isn't retried, since the episode is already seen
    if auto_download {
        for episode in unseen {
            if let Err(e) = download(app.clone(), episode) {
                eprintln!("queueing an auto-download failed: {e}");
            }
        }
    }

    Ok(())
}

/// The cached show directory, or none until the first refresh finishes.
#[tauri::command]
fn get_show_directory(app: tauri::AppHandle) -> Result<Option<Vec<rinse::DirectoryShow>>, String> {
    let store = app.store("directory.json").map_err(|e| e.to_string())?;

    store
        .get("shows")
        .map(serde_json::from_value)
        .transpose()
        .map_err(|e| e.to_string())
}

/// Refreshes the show directory when it's missing or more than a week old, checking at startup and then hourly,
/// so a failed refresh keeps the old directory and is retried an hour later.
async fn poll_show_directory(app: tauri::AppHandle) {
    let mut interval = tokio::time::interval(Duration::from_secs(60 * 60));

    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    loop {
        interval.tick().await;

        if let Err(e) = refresh_stale_show_directory(&app).await {
            eprintln!("show directory refresh failed: {e}");
        }
    }
}

async fn refresh_stale_show_directory(app: &tauri::AppHandle) -> Result<(), String> {
    let store = app.store("directory.json").map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let fetched_at = store.get("fetchedAt").and_then(|v| v.as_u64());

    if store.has("shows") && fetched_at.is_some_and(|t| now.saturating_sub(t) < 7 * 24 * 60 * 60) {
        return Ok(());
    }

    let shows = rinse::fetch_show_directory().await?;

    store.set(
        "shows",
        serde_json::to_value(&shows).map_err(|e| e.to_string())?,
    );
    store.set("fetchedAt", now);
    store.save().map_err(|e| e.to_string())?;

    app.emit("show-directory", shows).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let (cancel, cancelled) = tokio::sync::mpsc::unbounded_channel();

            app.manage(Downloads {
                queue: Mutex::new(load_downloads(app.handle())),
                wake: tokio::sync::Notify::new(),
                cancel,
            });

            tauri::async_runtime::spawn(poll(app.handle().clone()));
            tauri::async_runtime::spawn(poll_show_directory(app.handle().clone()));
            tauri::async_runtime::spawn(download_worker(app.handle().clone(), cancelled));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_episodes,
            refresh_show,
            download,
            get_download_queue,
            remove_download,
            move_download,
            cancel_download,
            dismiss_download_failure,
            get_settings,
            set_settings,
            subscribe,
            unsubscribe,
            get_show_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
