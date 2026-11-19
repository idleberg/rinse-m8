/** Markdown imports are converted to HTML at build time, by the plugin in `vite.config.js`. */
declare module '*.md' {
	const html: string;
	export default html;
}
