import { describe, expect, it } from 'vitest';
import {
	buildPublicAssetUrlFromBase,
	normalizePublicAssetBaseUrl,
	resolveAbsoluteUrl
} from '../src/lib/config/public-assets';
import {
	DEFAULT_SIZES_CARD,
	getPlaceholderImage,
	getPlaceholderImageSrcset
} from '../src/lib/data/placeholders';

describe('public asset URL helpers', () => {
	it('normalizes PUBLIC_ASSET_BASE_URL values', () => {
		expect(normalizePublicAssetBaseUrl('https://assets.example.com/kb-uploads/')).toBe(
			'https://assets.example.com/kb-uploads'
		);
	});

	it('builds public object URLs from a base URL and object key', () => {
		expect(
			buildPublicAssetUrlFromBase(
				'https://assets.example.com/kb-uploads',
				'placeholders/landscapes/960/tunnel-view-5282.webp'
			)
		).toBe(
			'https://assets.example.com/kb-uploads/placeholders/landscapes/960/tunnel-view-5282.webp'
		);
	});

	it('builds placeholder image URLs and srcsets from the public asset base', () => {
		const baseUrl = 'https://assets.example.com/kb-uploads';

		expect(getPlaceholderImage(0, { baseUrl })).toBe(
			'https://assets.example.com/kb-uploads/placeholders/landscapes/960/carson-pass-2-winnemucca-lk-2.webp'
		);

		expect(
			getPlaceholderImageSrcset(0, {
				baseUrl
			})
		).toEqual({
			src: 'https://assets.example.com/kb-uploads/placeholders/landscapes/960/carson-pass-2-winnemucca-lk-2.jpg',
			srcSet: [
				'https://assets.example.com/kb-uploads/placeholders/landscapes/320/carson-pass-2-winnemucca-lk-2.webp 320w',
				'https://assets.example.com/kb-uploads/placeholders/landscapes/640/carson-pass-2-winnemucca-lk-2.webp 640w',
				'https://assets.example.com/kb-uploads/placeholders/landscapes/960/carson-pass-2-winnemucca-lk-2.webp 960w',
				'https://assets.example.com/kb-uploads/placeholders/landscapes/1280/carson-pass-2-winnemucca-lk-2.webp 1280w',
				'https://assets.example.com/kb-uploads/placeholders/landscapes/1920/carson-pass-2-winnemucca-lk-2.webp 1920w'
			].join(', '),
			sizes: DEFAULT_SIZES_CARD
		});
	});

	it('resolves upload paths against the public asset base when available', () => {
		expect(
			resolveAbsoluteUrl('/uploads/brand/logo.png', {
				origin: 'https://kb.example.com',
				baseUrl: 'https://assets.example.com/kb-uploads'
			})
		).toBe('https://assets.example.com/kb-uploads/brand/logo.png');
	});

	it('rewrites legacy local object storage URLs to the public asset base', () => {
		expect(
			resolveAbsoluteUrl('http://localhost:9000/kb-uploads/events/curated/elderberry.png', {
				baseUrl: 'https://assets.example.com/kb-uploads'
			})
		).toBe('https://assets.example.com/kb-uploads/events/curated/elderberry.png');
	});

	it('resolves site-relative paths against the canonical origin', () => {
		expect(resolveAbsoluteUrl('/icon-192.png', { origin: 'https://kb.example.com' })).toBe(
			'https://kb.example.com/icon-192.png'
		);
	});
});
