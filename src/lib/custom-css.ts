import { invoke } from '@tauri-apps/api/core';
import { errors } from './errors.svelte';

/** Adds the user's `custom.css` from the config folder, if there is one. In the body, so it comes after every style in
 * the head, including route styles added later, and wins ties. */
export async function loadCustomCss() {
	try {
		const css = await invoke<string | null>('get_custom_css');

		if (css === null) {
			return;
		}

		const style = document.createElement('style');

		style.textContent = css;
		document.body.append(style);
	} catch (e) {
		errors.report(e);
	}
}
