import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { errors } from './errors.svelte';

/** The built-in themes by stored name, with their labels, in the menu's alphabetical order. Each has a stylesheet
 * imported in `+layout.ts`, except Asciitron, the unprefixed styles in app.css. The inline script in app.html keeps its
 * own copy of the names and the default. */
export const themes = {
	asciitron: 'Asciitron',
	graphix: 'Graphix',
} as const;

export type Theme = keyof typeof themes;

/** A `theme.css` in a subfolder of the config folder's `themes`, as `get_custom_themes` lists it. */
interface CustomTheme {
	id: string;
	name: string;
	path: string;
}

/** Not `theme`, which holds the appearance. */
const storageKey = 'skin';

/** The link that loads the picked custom theme, in the body, so it comes after every style in the head and wins ties. */
const linkId = 'custom-theme';

function isTheme(name: string | null): name is Theme {
	return name !== null && Object.hasOwn(themes, name);
}

/** `convertFileSrc` encodes every separator, which makes the path one URL segment, and a relative `url()` in the
 * stylesheet would resolve against the protocol's root. So every separator after the first is a slash again; the asset
 * protocol decodes the path either way. */
function stylesheetUrl(path: string) {
	return convertFileSrc(path).replace(/(?<before>[^/])%(?:2F|5C)/gu, '$<before>/');
}

/** Points the custom theme link at `href`, adding it if needed, or removes it without one. */
function linkStylesheet(href?: string) {
	let link = document.querySelector<HTMLLinkElement>(`#${linkId}`);

	if (!href) {
		link?.remove();

		return;
	}

	if (!link) {
		link = document.createElement('link');
		link.id = linkId;
		link.rel = 'stylesheet';
		document.body.append(link);
	}

	link.href = href;
}

const stored = localStorage.getItem(storageKey);

/** The picked theme, set as `data-skin` on the root. Asciitron and custom themes set no attribute. */
class ThemeStore {
	/** A built-in theme, or a custom theme's `value`. Nothing stored, or a theme removed in an update, loads as Graphix. */
	current = $state<string>(isTheme(stored) ? stored : 'graphix');

	/** The custom themes, sorted by name. `value` is what's picked and stored, prefixed so a folder can't pass for a
	 * built-in theme. */
	custom = $state<(CustomTheme & { value: string })[]>([]);

	/** Read at startup and whenever Settings opens, so a new folder shows up without a restart. */
	load = async () => {
		try {
			const listed = await invoke<{ themes: CustomTheme[]; failures: string[] }>(
				'get_custom_themes',
			);

			this.custom = listed.themes.map((custom) => ({ ...custom, value: `custom:${custom.id}` }));

			if (listed.failures.length > 0) {
				errors.report(listed.failures.join('; '));
			}
		} catch (e) {
			errors.report(e);
		}
	};

	/** Stored even when it's the default, so a later change of default leaves an explicit pick alone. */
	pick = (value: string) => {
		const root = document.documentElement;
		const custom = this.custom.find((c) => c.value === value);

		this.current = value;
		localStorage.setItem(storageKey, value);

		// A custom theme applies on top of Base, and its folder name never becomes the attribute
		if (custom || value === 'asciitron') {
			delete root.dataset.skin;
		} else {
			root.dataset.skin = value;
		}

		linkStylesheet(custom && stylesheetUrl(custom.path));
	};
}

export const theme = new ThemeStore();
