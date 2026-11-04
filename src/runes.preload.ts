import { file, plugin, Transpiler } from 'bun';
import { compileModule } from 'svelte/compiler';

const runeModule = /\.svelte\.ts$/u;

// Bun can't run runes as written, so `bun test` compiles `.svelte.ts` modules the way Vite does
plugin({
	name: 'svelte-runes',
	setup(build) {
		const transpiler = new Transpiler({ loader: 'ts' });

		build.onLoad({ filter: runeModule }, async ({ path }) => {
			const source = transpiler.transformSync(await file(path).text());

			return {
				contents: compileModule(source, { filename: path, generate: 'client' }).js.code,
				loader: 'js',
			};
		});
	},
});
