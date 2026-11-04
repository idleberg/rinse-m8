import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/700.css';
import '../app.css';

// Tauri doesn't have a Node.js server to do proper SSR, so adapter-static serves an SPA fallback instead
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const ssr = false;
