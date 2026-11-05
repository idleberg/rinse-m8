// PROTOTYPE, throw away. Question: what should Atkinson-dithered artwork look like in the app?
// Dithers <img> artwork in the webview, so variants can be compared on the real pages before
// the Rust side (.scratch/atkinson-dithering) is built. Variant state is in memory, not in the
// URL, since tab navigation drops search params.

type Variant = {
	name: string;
	shortSide: number;
	levels?: boolean;
	tint?: boolean;
	kernel: Kernel;
};
type Kernel = [dx: number, dy: number, weight: number][];

const ATKINSON: Kernel = [
	[1, 0, 1 / 8],
	[2, 0, 1 / 8],
	[-1, 1, 1 / 8],
	[0, 1, 1 / 8],
	[1, 1, 1 / 8],
	[0, 2, 1 / 8],
];
const FLOYD_STEINBERG: Kernel = [
	[1, 0, 7 / 16],
	[-1, 1, 3 / 16],
	[0, 1, 5 / 16],
	[1, 1, 1 / 16],
];

export const variants: (Variant | null)[] = [
	null, // Off
	{ name: 'Atkinson B/W (ticket plan)', shortSide: 560, kernel: ATKINSON },
	{ name: 'Atkinson + auto levels', shortSide: 560, levels: true, kernel: ATKINSON },
	{ name: 'Atkinson in ink/paper', shortSide: 560, levels: true, tint: true, kernel: ATKINSON },
	{ name: 'Atkinson chunky (1×)', shortSide: 280, kernel: ATKINSON },
	{ name: 'Floyd–Steinberg (compare)', shortSide: 560, kernel: FLOYD_STEINBERG },
];

export const proto = $state({ variant: 1 });

export const variantName = (index: number) => variants[index]?.name ?? 'Off';

/** Attachment: `{@attach dither(src)}` swaps the image for a dithered copy of `src`. */
export const dither = (src: string | undefined) => (img: HTMLImageElement) => {
	const variant = import.meta.env.DEV ? variants[proto.variant] : null;

	if (!(src && variant)) {
		if (src) img.src = src;
		return;
	}

	let url: string | undefined;
	let cancelled = false;

	render(src, variant).then(
		(blobUrl) => {
			url = blobUrl;
			if (cancelled) URL.revokeObjectURL(blobUrl);
			else img.src = blobUrl;
		},
		(e) => console.warn('dither prototype failed', src, e),
	);

	return () => {
		cancelled = true;
		if (url) URL.revokeObjectURL(url);
	};
};

async function render(src: string, variant: Variant): Promise<string> {
	const bitmap = await createImageBitmap(await (await fetch(src)).blob());
	const scale = Math.min(1, variant.shortSide / Math.min(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d')!;

	ctx.drawImage(bitmap, 0, 0, width, height);

	const data = ctx.getImageData(0, 0, width, height);
	const px = data.data;
	const gray = new Float32Array(width * height);

	for (let i = 0; i < gray.length; i++) {
		gray[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
	}

	if (variant.levels) stretch(gray);

	const [dark, light] = variant.tint
		? themeColors()
		: [
				[0, 0, 0],
				[255, 255, 255],
			];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			const on = gray[i] >= 128;
			const err = gray[i] - (on ? 255 : 0);

			for (const [dx, dy, w] of variant.kernel) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx >= 0 && nx < width && ny < height) gray[ny * width + nx] += err * w;
			}

			const [r, g, b] = on ? light : dark;
			px[i * 4] = r;
			px[i * 4 + 1] = g;
			px[i * 4 + 2] = b;
			px[i * 4 + 3] = 255;
		}
	}

	ctx.putImageData(data, 0, 0);

	return URL.createObjectURL(await canvas.convertToBlob({ type: 'image/png' }));
}

/** Maps the 2nd–98th percentile to 0–255, so dark or flat covers keep their detail. */
function stretch(gray: Float32Array) {
	const sorted = Float32Array.from(gray).sort();
	const lo = sorted[Math.floor(sorted.length * 0.02)];
	const hi = sorted[Math.floor(sorted.length * 0.98)];
	const range = Math.max(1, hi - lo);

	for (let i = 0; i < gray.length; i++) gray[i] = ((gray[i] - lo) / range) * 255;
}

function themeColors(): [number[], number[]] {
	const style = getComputedStyle(document.documentElement);
	const rgb = (name: string) => {
		const ctx = new OffscreenCanvas(1, 1).getContext('2d')!;
		ctx.fillStyle = style.getPropertyValue(name).trim() || '#000';
		ctx.fillRect(0, 0, 1, 1);
		return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
	};

	return [rgb('--ink'), rgb('--paper')];
}
