/** The built-in themes by stored name, with their labels. Each has a stylesheet imported in `+layout.ts`, except
 * Asciitron, stored as `default`. The inline script in app.html keeps its own copy of the names. */
export const themes = {
	default: 'Asciitron',
	graphix: 'Graphix',
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
	/** A theme removed in an update loads as Asciitron. */
	current = $state<Theme>(isTheme(stored) ? stored : 'default');

	pick = (name: Theme) => {
		const root = document.documentElement;

		this.current = name;

		if (name === 'default') {
			delete root.dataset.skin;
			localStorage.removeItem(storageKey);
		} else {
			root.dataset.skin = name;
			localStorage.setItem(storageKey, name);
		}
	};
}

export const theme = new ThemeStore();
