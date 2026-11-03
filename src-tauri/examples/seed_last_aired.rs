//! Regenerates `last-aired.json`, the bundled seed of each show's last aired date. Run with `mise seed`.

use std::collections::BTreeMap;
use std::time::Duration;

use tauri_m8_lib::{fetch_show, fetch_show_directory, last_aired};

const SEED: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/last-aired.json");

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), String> {
    let shows = fetch_show_directory().await?;
    let mut seed = BTreeMap::new();
    let mut failed = Vec::new();

    for (i, show) in shows.iter().enumerate() {
        eprintln!("[{}/{}] {}", i + 1, shows.len(), show.slug);

        match fetch_show(&show.slug).await {
            Ok(page) => {
                if let Some(date) = last_aired(&page.episodes).get(show.slug.as_str()) {
                    seed.insert(show.slug.clone(), date.to_string());
                }
            }
            Err(e) => failed.push(format!("{}: {e}", show.slug)),
        }

        // Go easy on Rinse
        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    let json = serde_json::to_string_pretty(&seed).map_err(|e| e.to_string())?;

    std::fs::write(SEED, json + "\n").map_err(|e| e.to_string())?;
    eprintln!("Wrote {} dates to {SEED}", seed.len());

    if !failed.is_empty() {
        eprintln!(
            "Skipped {} failed shows:\n{}",
            failed.len(),
            failed.join("\n")
        );
    }

    Ok(())
}
