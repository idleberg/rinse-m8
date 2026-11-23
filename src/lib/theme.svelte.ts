/** The built-in themes by stored name, with their labels, the default first. Each has a stylesheet imported in
 * `+layout.ts`, except Asciitron, the unprefixed styles in app.css. The inline script in app.html keeps its own copy of
 * the names and the default. */
export const themes = {
	graphix: 'Graphix',
	asciitron: 'Asciitron',
} as const;

export type Theme = keyof typeof themes;

/** Not `theme`, which holds the appearance. */
const storageKey = 'skin';

function isTheme(name: string | null): name is Theme {
	return name !== null && Object.hasOwn(themes, name);
}

const stored = localStorage.getItem(storageKey);

/** The picked theme, set as `data-skin` on the root. Asciitron sets no attribute. */
class ThemeStore {
	/** Nothing stored, or a theme removed in an update, loads as Graphix. */
	current = $state<Theme>(isTheme(stored) ? stored : 'graphix');

	/** Stored even when it's the default, so a later change of default leaves an explicit pick alone. */
	pick = (name: Theme) => {
		const root = document.documentElement;

		this.current = name;
		localStorage.setItem(storageKey, name);

		if (name === 'asciitron') {
			delete root.dataset.skin;
		} else {
			root.dataset.skin = name;
		}
	};
}

export const theme = new ThemeStore();
