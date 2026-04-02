/**
 * Placeholder landscape images for cards and detail heroes when no image is set.
 *
 * For optimal performance: place source images in static/images/landscapes/source/
 * and run `npm run images:process`. Processed images (multiple widths, WebP + JPG fallback)
 * will be used with srcset so the browser loads the best size for the device.
 */
import {
	LANDSCAPE_BASE,
	LANDSCAPE_ENTRIES,
	LANDSCAPE_WIDTHS
} from './landscape-manifest.generated.js';

const LANDSCAPE_FILES = [
	'Carson Pass 2-Winnemucca Lk-2.jpg',
	'Eastern Sierra Summer 2012-3123-Edit.jpg',
	'Easter Sierra Winter 2014-11.jpg',
	'Kiva Beach Sunset-9.jpg',
	'Mt. Muir From Trail Crest-6539.jpg',
	'Sierra Fall-8937.jpg',
	'Tahoe Summer 2013-8533.jpg',
	'Tunnel View-5282.jpg',
	'Tunnel View-Edit-2.jpg',
	'Volcanic Tablelands Spring 2014-1.jpg',
	'Yosemite May 2015-4010.jpg',
	'Yosemite Spring 2016-1.jpg'
];

const LEGACY_PLACEHOLDERS = LANDSCAPE_FILES.map(
	(name) => `/images/landscapes/${encodeURIComponent(name)}`
);

const useProcessed = LANDSCAPE_ENTRIES.length > 0;

/** Default sizes for card thumbnails (events, funding, etc.): ~310px in grid, up to 50vw on small screens. */
export const DEFAULT_SIZES_CARD = '(max-width: 400px) 100vw, (max-width: 900px) 50vw, 310px';

/** Default sizes for detail hero (full-width above fold). */
export const DEFAULT_SIZES_HERO = '100vw';

export type PlaceholderSrcset = {
	src: string;
	srcSet?: string;
	sizes?: string;
};

/**
 * Return a placeholder image URL by index (cycles through landscape set).
 * Prefers processed 960 WebP when available; otherwise legacy path.
 */
export function getPlaceholderImage(index: number): string {
	if (useProcessed) {
		const entry = LANDSCAPE_ENTRIES[index % LANDSCAPE_ENTRIES.length];
		if (entry) return `${LANDSCAPE_BASE}/960/${entry.slug}.webp`;
	}
	return LEGACY_PLACEHOLDERS[index % LEGACY_PLACEHOLDERS.length]!;
}

/**
 * Return src, srcSet, and sizes for responsive placeholder images.
 * Use in <img src={...} srcset={...} sizes={...} /> for device-optimal loading.
 * When no processed images exist, returns only src (legacy single URL).
 */
export function getPlaceholderImageSrcset(
	index: number,
	options?: { sizes?: string }
): PlaceholderSrcset {
	if (!useProcessed) {
		return { src: getPlaceholderImage(index) };
	}
	const entry = LANDSCAPE_ENTRIES[index % LANDSCAPE_ENTRIES.length];
	if (!entry) {
		return { src: getPlaceholderImage(index) };
	}
	const srcSet = LANDSCAPE_WIDTHS.map(
		(w) => `${LANDSCAPE_BASE}/${w}/${entry.slug}.webp ${w}w`
	).join(', ');
	// Default src: 960 JPG for older browsers that don't support WebP/srcset
	const src = `${LANDSCAPE_BASE}/960/${entry.slug}.jpg`;
	return {
		src,
		srcSet,
		sizes: options?.sizes ?? DEFAULT_SIZES_CARD
	};
}

/** @deprecated Use getPlaceholderImage or getPlaceholderImageSrcset. Kept for compatibility. */
export const LANDSCAPE_PLACEHOLDERS = LEGACY_PLACEHOLDERS;
