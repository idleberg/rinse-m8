import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { errors } from './errors.svelte';

/** The built-in themes by stored name, with their labels, in the menu's alphabetical order. Each has a stylesheet
 * imported in `+layout.ts`, on top of Base, the unprefixed styles. The inline scripts in app.html keep their own copy
 * of the names, the default and the storage keys. */
export const themes = {
	asciitron: 'Asciitron',
	graphix: 'Graphix',
	m8pl8: 'M8PL8',
	swizz: 'Swizz',
} as const;

export type Theme = keyof typeof themes;

/** A `theme.css` in a subfolder of the config folder's `themes`, as `get_custom_themes` lists it. */
interface CustomTheme {
	id: string;
	name: string;
	/** The `@extends` tag, unvalidated: only a built-in theme counts. */
	extends: string | null;
	path: string;
}

/** Not `theme`, which holds the appearance. */
const storageKey = 'skin';

/** The picked custom theme's stylesheet URL, so app.html can link it before the app starts, without the backend. */
const hrefKey = 'skin-href';

/** The built-in theme the picked custom theme extends, so app.html can set its attribute at first paint. */
const extendsKey = 'skin-extends';

/** The link that loads the picked custom theme, in the body, so it comes after every style in the head and wins ties. */
const linkId = 'custom-theme';

function isTheme(name: string | null): name is Theme {
	return name !== null && Object.hasOwn(themes, name);
}

function isCustom(value: string | null): value is string {
	return value?.startsWith('custom:') ?? false;
}

/** `convertFileSrc` encodes every separator, which makes the path one URL segment, and a relative `url()` in the
 * stylesheet would resolve against the protocol's root. So every separator after the first is a slash again; the asset
 * protocol decodes the path either way. */
function stylesheetUrl(path: string) {
	return convertFileSrc(path).replace(/(?<before>[^/])%(?:2F|5C)/gu, '$<before>/');
}

/** Points the custom theme link at `href`, adding it if needed, or removes it without one. app.html adds it at
 * startup, so it's found by its id. */
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

/** The picked theme, set as `data-skin` on the root. A custom theme sets the built-in theme it extends, or none. */
class ThemeStore {
	/** A built-in theme, or a custom theme's `value`. Nothing stored, or a theme removed in an update, loads as Graphix.
	 * So does a custom theme whose folder is gone, once `load` finds it missing. */
	current = $state<string>(isTheme(stored) || isCustom(stored) ? stored : 'graphix');

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

			// Picked again, since its header may have changed since. If its folder was deleted or renamed, Graphix.
			if (isCustom(this.current)) {
				this.pick(this.custom.some((c) => c.value === this.current) ? this.current : 'graphix');
			}

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

		// A custom theme applies on top of the built-in theme it extends, or Base. Its folder name never becomes the
		// attribute.
		const skin = custom ? custom.extends : value;
		const attribute = isTheme(skin) ? skin : undefined;

		this.current = value;
		localStorage.setItem(storageKey, value);

		if (attribute) {
			root.dataset.skin = attribute;
		} else {
			delete root.dataset.skin;
		}

		if (custom && attribute) {
			localStorage.setItem(extendsKey, attribute);
		} else {
			localStorage.removeItem(extendsKey);
		}

		const href = custom && stylesheetUrl(custom.path);

		if (href) {
			localStorage.setItem(hrefKey, href);
		} else {
			localStorage.removeItem(hrefKey);
		}

		linkStylesheet(href);
	};
}

export const theme = new ThemeStore();
