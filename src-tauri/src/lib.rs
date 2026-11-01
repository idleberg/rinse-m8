mod lastfm;
mod rinse;

use chrono::Timelike;
use futures_util::StreamExt;
use std::collections::BTreeSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{MenuBuilder, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::{Action, ActionPerformed, ActionType, NotificationExt};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

/// Serialises settings read-modify-writes between commands and the poller.
static SETTINGS_LOCK: Mutex<()> = Mutex::new(());

/// Whether the player is playing, so a rebuilt tray menu offers the right toggle.
static PLAYING: AtomicBool = AtomicBool::new(false);

/// The tray menu's play/pause item, relabelled as playback starts and stops.
static TOGGLE_ITEM: Mutex<Option<MenuItem<tauri::Wry>>> = Mutex::new(None);

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

/// Merges `episodes` into the cache with `rinse::merge_episodes` and returns the whole cache.
fn merge(
    app: &tauri::AppHandle,
    episodes: Vec<rinse::Episode>,
) -> Result<Vec<rinse::Episode>, String> {
    let cache = app.store("episodes.json").map_err(|e| e.to_string())?;
    let merged = rinse::merge_episodes(episodes, |id| {
        cache.get(id).and_then(|v| serde_json::from_value(v).ok())
    });

    save_episodes(app, merged)
}

/// Writes `episodes` to the cache as they are and returns the whole cache.
fn save_episodes(
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

/// Checks each episode's mp3 a few at a time, records the results in the cache and returns the whole cache.
async fn check_mp3s(
    app: &tauri::AppHandle,
    episodes: Vec<rinse::Episode>,
) -> Result<Vec<rinse::Episode>, String> {
    let checked = futures_util::stream::iter(episodes)
        .map(|episode| async move {
            rinse::Episode {
                mp3_found: rinse::check_mp3(&episode).await,
                ..episode
            }
        })
        .buffer_unordered(8)
        .collect::<Vec<_>>()
        .await;

    // Recorded on the cached copy, so a fetch merged in during the checks stays, and dropped if the link changed meanwhile
    let cache = app.store("episodes.json").map_err(|e| e.to_string())?;
    let current = checked
        .into_iter()
        .filter_map(|checked| {
            let cached: rinse::Episode = serde_json::from_value(cache.get(&checked.id)?).ok()?;

            (cached.mp3 == checked.mp3).then_some(rinse::Episode {
                mp3_found: checked.mp3_found,
                ..cached
            })
        })
        .collect();

    save_episodes(app, current)
}

/// Checks the cached episode's mp3 again after a download or playback of it failed, and sends the whole cache to the views.
#[tauri::command]
async fn recheck_mp3(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let cached = app
        .store("episodes.json")
        .map_err(|e| e.to_string())?
        .get(&id)
        .and_then(|v| serde_json::from_value(v).ok());

    let Some(episode) = cached else {
        return Ok(());
    };

    let cache = check_mp3s(&app, vec![episode]).await?;

    app.emit("episodes-updated", cache)
        .map_err(|e| e.to_string())
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

/// Queues the episode of a notification's Download button, unless it's already downloaded; the window stays as it was.
fn download_notified(app: &tauri::AppHandle, action: &ActionPerformed) {
    let Some(episode) = action
        .notification()
        .and_then(|n| n.extra().get("episode"))
        .and_then(|v| serde_json::from_value::<rinse::Episode>(v.clone()).ok())
    else {
        return;
    };

    let downloaded = app
        .state::<Downloads>()
        .queue
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .downloaded
        .contains(&episode.id);

    if downloaded {
        return;
    }

    if let Err(e) = download(app.clone(), episode) {
        eprintln!("queueing the notified episode failed: {e}");
    }
}

/// The queue as it is now, for a page that missed the events, e.g. the one the restored queue sends at launch.
#[tauri::command]
fn get_download_queue(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let downloads = app.state::<Downloads>();
    let queue = downloads.queue.lock().unwrap_or_else(|e| e.into_inner());

    serde_json::to_value(&*queue).map_err(|e| e.to_string())
}

/// A Previous Downloads row.
#[derive(serde::Serialize)]
struct PreviousDownload {
    #[serde(flatten)]
    episode: rinse::Episode,
    /// The mp3 in the current download folder, if it's there.
    file: Option<std::path::PathBuf>,
}

/// Every episode recorded as downloaded or marked, newest first, as far as the episode cache has it.
#[tauri::command]
fn get_previous_downloads(app: tauri::AppHandle) -> Result<Vec<PreviousDownload>, String> {
    let folder = load_settings(&app, serde_json::Map::new())?.download_folder;
    let downloaded = app
        .state::<Downloads>()
        .queue
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .downloaded
        .clone();
    let cache = app
        .store("episodes.json")
        .map_err(|e| e.to_string())?
        .values()
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();

    Ok(rinse::previous_downloads(&downloaded, cache)
        .into_iter()
        .map(|episode| PreviousDownload {
            file: folder
                .as_deref()
                .and_then(|folder| rinse::downloaded_file(folder, &episode)),
            episode,
        })
        .collect())
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

/// Records the episode as downloaded without downloading it, for a file fetched before or outside the app.
/// Saves once more itself, since `update_downloads` only logs a failed save and the page should report it.
#[tauri::command]
fn mark_downloaded(app: tauri::AppHandle, id: String) -> Result<(), String> {
    update_downloads(&app, |queue| {
        queue.downloaded.insert(id);

        save_downloads(&app, queue)
    })
}

/// Drops the episode from the downloaded record, leaving any file in the download folder as it is.
#[tauri::command]
fn unmark_downloaded(app: tauri::AppHandle, id: String) -> Result<(), String> {
    update_downloads(&app, |queue| {
        queue.downloaded.remove(&id);

        save_downloads(&app, queue)
    })
}

/// Empties the downloaded record, leaving the files in the download folder as they are.
#[tauri::command]
fn clear_downloaded(app: tauri::AppHandle) -> Result<(), String> {
    update_downloads(&app, |queue| {
        queue.downloaded.clear();

        save_downloads(&app, queue)
    })
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

        update_downloads(&app, |queue| queue.finish(result.is_ok()));

        if let Err(e) = &result {
            eprintln!("downloading {} failed: {e}", download.episode.id);

            if let Err(e) = recheck_mp3(app.clone(), download.episode.id).await {
                eprintln!("rechecking the mp3 failed: {e}");
            }
        }
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

    save_settings(&app, &settings)?;

    sync_tray(&app, settings.keep_running)
}

/// The Last.fm row, which a build without an API key leaves out.
#[derive(serde::Serialize)]
struct Lastfm {
    /// The connected account's name, if any.
    user: Option<String>,
}

#[tauri::command]
fn get_lastfm(app: tauri::AppHandle) -> Result<Option<Lastfm>, String> {
    if lastfm::credentials().is_none() {
        return Ok(None);
    }

    Ok(Some(Lastfm {
        user: load_lastfm_session(&app)?.map(|s| s.name),
    }))
}

/// Opens Last.fm's approval page and, once the user approves, stores the session and returns the account's name.
#[tauri::command]
async fn connect_lastfm(app: tauri::AppHandle) -> Result<String, String> {
    let session = lastfm::connect(|url| {
        app.opener()
            .open_url(url, None::<&str>)
            .map_err(|e| e.to_string())
    })
    .await?;
    let store = app.store("lastfm.json").map_err(|e| e.to_string())?;

    store.set(
        "session",
        serde_json::to_value(&session).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())?;

    Ok(session.name)
}

#[tauri::command]
fn disconnect_lastfm(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("lastfm.json").map_err(|e| e.to_string())?;

    store.delete("session");
    store.save().map_err(|e| e.to_string())
}

/// Shows `episode` as "Scrobbling now" while connected.
#[tauri::command]
async fn now_playing(app: tauri::AppHandle, episode: rinse::Episode) -> Result<(), String> {
    let Some(session) = load_lastfm_session(&app)? else {
        return Ok(());
    };

    let result = lastfm::now_playing(&session, &lastfm::track(&episode)).await;

    lastfm_outcome(&app, "now playing", result)
}

/// Scrobbles `episode`, which started playing at `started` in Unix seconds, while connected. Like `now_playing`, a failed one isn't retried.
#[tauri::command]
async fn scrobble(
    app: tauri::AppHandle,
    episode: rinse::Episode,
    started: u64,
) -> Result<(), String> {
    let Some(session) = load_lastfm_session(&app)? else {
        return Ok(());
    };

    let result = lastfm::scrobble(&session, &lastfm::track(&episode), started).await;

    lastfm_outcome(&app, "scrobble", result)
}

/// Drops a session Last.fm rejects and tells the Settings row. Other failures are only logged, so being offline doesn't show an error.
fn lastfm_outcome(
    app: &tauri::AppHandle,
    what: &str,
    result: Result<(), lastfm::Failure>,
) -> Result<(), String> {
    match result {
        Ok(()) => Ok(()),
        Err(lastfm::Failure::InvalidSession) => {
            disconnect_lastfm(app.clone())?;

            app.emit("lastfm-disconnected", ())
                .map_err(|e| e.to_string())
        }
        Err(lastfm::Failure::Other(e)) => {
            eprintln!("Last.fm {what} failed: {e}");

            Ok(())
        }
    }
}

/// The stored Last.fm session, kept apart from the settings so its key never reaches the webview.
fn load_lastfm_session(app: &tauri::AppHandle) -> Result<Option<lastfm::Session>, String> {
    app.store("lastfm.json")
        .map_err(|e| e.to_string())?
        .get("session")
        .map(serde_json::from_value)
        .transpose()
        .map_err(|e| e.to_string())
}

fn image_cache(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map(|dir| rinse::image_cache_dir(&dir))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_image_cache_size(app: tauri::AppHandle) -> Result<u64, String> {
    Ok(rinse::image_cache_size(&image_cache(&app)?))
}

#[tauri::command]
fn clear_image_cache(app: tauri::AppHandle) -> Result<(), String> {
    rinse::clear_image_cache(&image_cache(&app)?)
}

/// Adds the menu bar or tray icon, whose presence makes closing the window hide it, or removes it again.
fn sync_tray(app: &tauri::AppHandle, enable: bool) -> Result<(), String> {
    if !enable {
        app.remove_tray_by_id("main");
        *TOGGLE_ITEM.lock().unwrap_or_else(|e| e.into_inner()) = None;

        return Ok(());
    }

    if app.tray_by_id("main").is_some() {
        return Ok(());
    }

    let toggle = MenuItem::with_id(
        app,
        "toggle",
        toggle_label(PLAYING.load(Ordering::Relaxed)),
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(app)
        .item(&toggle)
        .separator()
        .text("show", "Show window")
        .text("settings", "Settings")
        .text("quit", "Quit")
        .build()
        .map_err(|e| e.to_string())?;

    // macOS tints the black M8 to suit the menu bar, which Windows and Linux can't, so they get the app icon
    let icon = if cfg!(target_os = "macos") {
        tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))
            .map_err(|e| e.to_string())?
    } else {
        app.default_window_icon().ok_or("no app icon")?.clone()
    };

    // macOS opens the menu on left-click, Windows and Linux show the window and keep the menu on right-click
    TrayIconBuilder::with_id("main")
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Rinse M8")
        .menu(&menu)
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle" => {
                if let Err(e) = app.emit("toggle-playback", ()) {
                    eprintln!("toggling playback failed: {e}");
                }
            }
            "show" => show_window(app),
            "settings" => {
                show_window(app);

                if let Err(e) = app.emit("open-settings", ()) {
                    eprintln!("opening the settings failed: {e}");
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if !cfg!(target_os = "macos") {
                    show_window(tray.app_handle());
                }
            }
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    *TOGGLE_ITEM.lock().unwrap_or_else(|e| e.into_inner()) = Some(toggle);

    Ok(())
}

/// The text-style variation selector keeps macOS from drawing the symbols as emoji.
fn toggle_label(playing: bool) -> &'static str {
    if playing {
        "\u{23F8}\u{FE0E} Pause"
    } else {
        "\u{25B6}\u{FE0E} Play"
    }
}

/// Relabels the tray's play/pause item as playback starts and stops.
#[tauri::command]
fn set_tray_playing(playing: bool) -> Result<(), String> {
    PLAYING.store(playing, Ordering::Relaxed);

    if let Some(item) = &*TOGGLE_ITEM.lock().unwrap_or_else(|e| e.into_inner()) {
        item.set_text(toggle_label(playing))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Brings the hidden or minimised window back to the front.
fn show_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    // Only a hidden window took the Dock icon along, and a needless show makes macOS ignore a hide in the next second
    #[cfg(target_os = "macos")]
    if !window.is_visible().unwrap_or(false) {
        if let Err(e) = app.set_dock_visibility(true) {
            eprintln!("showing the Dock icon failed: {e}");
        }
    }

    if let Err(e) = window
        .unminimize()
        .and_then(|()| window.show())
        .and_then(|()| window.set_focus())
    {
        eprintln!("showing the window failed: {e}");
    }
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

/// Updates the episodes at startup and then on the first full hour the stored interval has passed since the last update,
/// for as long as the app runs. The interval is read every hour, so a change applies from the next full hour.
async fn poll(app: tauri::AppHandle) {
    let mut last = chrono::Utc::now().timestamp();

    loop {
        if let Err(e) = update_episodes(&app).await {
            eprintln!("episode update failed: {e}");
        }

        loop {
            // Local, so a half-hour time zone also updates on its full hours.
            // ponytail: the sleep doesn't count time the computer is asleep, so after a wake an update can land off the hour
            let now = chrono::Local::now();
            let into_hour = u64::from(now.minute() * 60 + now.second());

            tokio::time::sleep(Duration::from_secs(60 * 60 - into_hour)).await;

            let now = chrono::Utc::now().timestamp();
            let interval = load_settings(&app, serde_json::Map::new())
                .map_or(rinse::Settings::default().update_interval, |s| {
                    s.update_interval
                });

            if rinse::update_due(last, now, interval) {
                last = now;
                break;
            }
        }
    }
}

/// Fetches the schedule and every subscribed show, checks the mp3s that are due, pushes the whole cache to the views,
/// notifies once per new available episode and queues those for download when auto-download is on and a folder is set.
async fn update_episodes(app: &tauri::AppHandle) -> Result<(), String> {
    let subscriptions = load_settings(app, serde_json::Map::new())?.subscriptions;
    let schedule = rinse::fetch_schedule().await.unwrap_or_else(|e| {
        eprintln!("schedule fetch failed: {e}");
        Vec::new()
    });
    let mut fetched = Vec::new();

    for subscription in &subscriptions {
        match rinse::fetch_show(&subscription.slug).await {
            Ok(show) => fetched.extend(show.episodes),
            Err(e) => eprintln!("fetching {} failed: {e}", subscription.slug),
        }
    }

    let today = chrono::Utc::now()
        .with_timezone(&chrono_tz::Europe::London)
        .date_naive();
    let due = merge(app, schedule.into_iter().chain(fetched.clone()).collect())?
        .into_iter()
        .filter(|e| e.check_due(today))
        .collect();
    let cache = check_mp3s(app, due).await?;

    // Only the show fetches look for new episodes, since the schedule repeats some of them. Taken from the cache for
    // their check results, so a missing episode stays unseen and notifies once Rinse fixes it.
    let ids: BTreeSet<_> = fetched.into_iter().map(|e| e.id).collect();
    let fetched: Vec<_> = cache
        .iter()
        .filter(|e| ids.contains(&e.id))
        .cloned()
        .collect();
    let mut unseen = Vec::new();
    let mut auto_download = false;
    let mut offer_download = false;

    // Seen is saved before notifying, so a crash can drop a notification but never repeat one.
    update_settings(app, |settings| {
        unseen = rinse::new_episodes(&settings.subscriptions, &settings.seen, fetched);
        settings.seen.extend(unseen.iter().map(|e| e.id.clone()));
        auto_download = settings.auto_download && settings.download_folder.is_some();
        offer_download = !settings.auto_download && settings.download_folder.is_some();
    })?;

    // ponytail: the startup update can emit before the webview listens, which then fetches the schedule itself
    app.emit("episodes-updated", cache)
        .map_err(|e| e.to_string())?;

    if unseen.is_empty() {
        return Ok(());
    }

    for episode in &unseen {
        let title = format!(
            "New: {} – {}",
            episode.show_title,
            episode.date.replace('-', "/")
        );

        let show = rinse::Subscription {
            slug: episode.show_slug.clone(),
            title: episode.show_title.clone(),
        };

        // The show rides along so a click can open it, the episode so its Download button can queue it
        let mut notification = app
            .notification()
            .builder()
            .title(title)
            .extra("show", show);

        // An auto-download already queues the episode, so the button would have nothing left to do
        if offer_download {
            notification = notification
                .action_type_id("new-episode")
                .extra("episode", episode);
        }

        if let Err(e) = notification.show() {
            eprintln!("notification failed: {e}");
        }
    }

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .register_asynchronous_uri_scheme_protocol("image", |ctx, request, responder| {
            let app = ctx.app_handle().clone();
            let name = request.uri().path().trim_start_matches('/').to_owned();

            tauri::async_runtime::spawn(async move {
                let image = match image_cache(&app) {
                    Ok(dir) => rinse::cached_image(&name, &dir).await,
                    Err(e) => Err(e),
                };

                responder.respond(image.map_or_else(
                    |e| {
                        eprintln!("image {name} failed: {e}");

                        let mut response = tauri::http::Response::new(Vec::new());
                        *response.status_mut() = tauri::http::StatusCode::BAD_GATEWAY;
                        response
                    },
                    tauri::http::Response::new,
                ));
            });
        })
        .setup(|app| {
            let (cancel, cancelled) = tokio::sync::mpsc::unbounded_channel();

            app.manage(Downloads {
                queue: Mutex::new(load_downloads(app.handle())),
                wake: tokio::sync::Notify::new(),
                cancel,
            });

            // The id matches the title, since macOS reports a button by its title
            app.notification()
                .register_action_types(vec![ActionType::builder("new-episode")
                    .actions(vec![Action::builder("Download", "Download").build()])
                    .build()])?;

            // Registered before polling starts, since notifications shown without a handler report no click
            let handle = app.handle().clone();
            app.notification().on_action(move |action| {
                if action.action_id() == "Download" {
                    download_notified(&handle, action);
                    return;
                }

                if action.action_id() != "tap" {
                    return;
                }

                show_window(&handle);

                if let Some(show) = action.notification().and_then(|n| n.extra().get("show")) {
                    if let Err(e) = handle.emit("open-show", show) {
                        eprintln!("opening the notified show failed: {e}");
                    }
                }
            })?;

            if let Ok(root) = app.path().app_cache_dir() {
                tauri::async_runtime::spawn_blocking(move || {
                    rinse::remove_stale_image_caches(&root)
                });
            }

            tauri::async_runtime::spawn(poll(app.handle().clone()));
            tauri::async_runtime::spawn(poll_show_directory(app.handle().clone()));
            tauri::async_runtime::spawn(download_worker(app.handle().clone(), cancelled));

            if let Err(e) = load_settings(app.handle(), serde_json::Map::new())
                .and_then(|settings| sync_tray(app.handle(), settings.keep_running))
            {
                eprintln!("adding the menu bar icon failed: {e}");
            }

            Ok(())
        })
        // While the icon is there, closing only hides the window, so the poller and downloads carry on
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.app_handle().tray_by_id("main").is_some() {
                    api.prevent_close();

                    if let Err(e) = window.hide() {
                        eprintln!("hiding the window failed: {e}");
                    }

                    // Without the Dock icon the app lives only in the menu bar, and drops out of Cmd+Tab too
                    #[cfg(target_os = "macos")]
                    if let Err(e) = window.app_handle().set_dock_visibility(false) {
                        eprintln!("hiding the Dock icon failed: {e}");
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_episodes,
            refresh_show,
            download,
            get_download_queue,
            get_previous_downloads,
            remove_download,
            move_download,
            cancel_download,
            mark_downloaded,
            unmark_downloaded,
            clear_downloaded,
            dismiss_download_failure,
            recheck_mp3,
            get_settings,
            set_settings,
            get_lastfm,
            connect_lastfm,
            disconnect_lastfm,
            now_playing,
            scrobble,
            get_image_cache_size,
            clear_image_cache,
            set_tray_playing,
            subscribe,
            unsubscribe,
            get_show_directory
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // Clicking the Dock icon brings a hidden window back
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                show_window(_app);
            }
        });
}
