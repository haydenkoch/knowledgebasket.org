import { resolveAbsoluteUrl } from '$lib/config/public-assets';
import { getPlaceholderImageSrcset } from '$lib/data/placeholders';

export type ResolveSeoSocialImageInput = {
	imageUrl?: string | null;
	origin: string;
	seed: string;
	fallbackOgImage?: string | null;
	baseUrl?: string | null;
};

function hashSeed(seed: string): number {
	let hash = 0;

	for (let index = 0; index < seed.length; index += 1) {
		hash = Math.imul(hash, 31) + seed.charCodeAt(index);
		hash >>>= 0;
	}

	return hash;
}

export function getSeoFallbackLandscapeImage(
	seed: string,
	options?: { baseUrl?: string | null }
): string | null {
	const normalizedSeed = seed.trim();

	if (!normalizedSeed) {
		return null;
	}

	try {
		return getPlaceholderImageSrcset(hashSeed(normalizedSeed), {
			baseUrl: options?.baseUrl ?? undefined
		}).src;
	} catch {
		return null;
	}
}

export function resolveSeoSocialImage(input: ResolveSeoSocialImageInput): string | null {
	const resolvedImage = resolveAbsoluteUrl(input.imageUrl, {
		origin: input.origin,
		baseUrl: input.baseUrl ?? undefined
	});

	if (resolvedImage) {
		return resolvedImage;
	}

	return (
		getSeoFallbackLandscapeImage(input.seed, {
			baseUrl: input.baseUrl ?? undefined
		}) ??
		resolveAbsoluteUrl(input.fallbackOgImage, {
			origin: input.origin,
			baseUrl: input.baseUrl ?? undefined
		})
	);
}
