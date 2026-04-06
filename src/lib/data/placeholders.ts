/**
 * Placeholder landscape images for cards and detail heroes when no image is set.
 *
 * Placeholder images are seeded to MinIO and served from PUBLIC_ASSET_BASE_URL.
 * Processed images (multiple widths, WebP + JPG fallback) are used with srcset so
 * the browser loads the best size for the device.
 */
import { buildPublicAssetUrl } from '$lib/config/public-assets';
import {
	LANDSCAPE_BASE,
	LANDSCAPE_ENTRIES,
	LANDSCAPE_WIDTHS
} from './landscape-manifest.generated.js';

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

function buildLandscapeUrl(
	slug: string,
	width: (typeof LANDSCAPE_WIDTHS)[number],
	extension: 'jpg' | 'webp',
	baseUrl?: string
): string {
	return buildPublicAssetUrl(`${LANDSCAPE_BASE}/${width}/${slug}.${extension}`, { baseUrl });
}

/**
 * Return a placeholder image URL by index (cycles through landscape set).
 * Prefers processed 960 WebP when available.
 */
export function getPlaceholderImage(index: number, options?: { baseUrl?: string }): string {
	if (useProcessed) {
		const entry = LANDSCAPE_ENTRIES[index % LANDSCAPE_ENTRIES.length];
		if (entry) return buildLandscapeUrl(entry.slug, 960, 'webp', options?.baseUrl);
	}
	throw new Error('No placeholder landscape images are configured.');
}

/**
 * Return src, srcSet, and sizes for responsive placeholder images.
 * Use in <img src={...} srcset={...} sizes={...} /> for device-optimal loading.
 */
export function getPlaceholderImageSrcset(
	index: number,
	options?: { sizes?: string; baseUrl?: string }
): PlaceholderSrcset {
	const entry = LANDSCAPE_ENTRIES[index % LANDSCAPE_ENTRIES.length];
	if (!entry) {
		return { src: getPlaceholderImage(index, options) };
	}
	const srcSet = LANDSCAPE_WIDTHS.map(
		(w) => `${buildLandscapeUrl(entry.slug, w, 'webp', options?.baseUrl)} ${w}w`
	).join(', ');
	return {
		// Default src: 960 JPG for older browsers that don't support WebP/srcset
		src: buildLandscapeUrl(entry.slug, 960, 'jpg', options?.baseUrl),
		srcSet,
		sizes: options?.sizes ?? DEFAULT_SIZES_CARD
	};
}

/** @deprecated Use getPlaceholderImage or getPlaceholderImageSrcset. Kept for compatibility. */
export const LANDSCAPE_PLACEHOLDERS = LANDSCAPE_ENTRIES.map(
	(entry) => `${LANDSCAPE_BASE}/960/${entry.slug}.webp`
);
