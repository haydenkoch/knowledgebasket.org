import { describe, expect, it } from 'vitest';
import { getSeoFallbackLandscapeImage, resolveSeoSocialImage } from '../src/lib/seo/images';

const baseUrl = 'https://assets.example.com/kb-uploads';

describe('seo image helpers', () => {
	it('uses the provided image when one is available', () => {
		expect(
			resolveSeoSocialImage({
				imageUrl: '/uploads/red-pages/logo.png',
				origin: 'https://kb.example.com',
				seed: 'future-rivers',
				baseUrl
			})
		).toBe('https://assets.example.com/kb-uploads/red-pages/logo.png');
	});

	it('falls back to a deterministic landscape image when no record image exists', () => {
		const first = getSeoFallbackLandscapeImage('future-rivers', {
			baseUrl
		});
		const second = getSeoFallbackLandscapeImage('future-rivers', {
			baseUrl
		});

		expect(first).toBe(second);
		expect(first).toMatch(
			/^https:\/\/assets\.example\.com\/kb-uploads\/placeholders\/landscapes\/960\/.+\.jpg$/
		);
	});

	it('falls back to the generated og card when MinIO images are unavailable', () => {
		expect(
			resolveSeoSocialImage({
				imageUrl: null,
				origin: 'https://kb.example.com',
				seed: 'future-rivers',
				baseUrl: '',
				fallbackOgImage:
					'/og.png?title=Future%20Rivers&eyebrow=Knowledge%20Basket&theme=organization'
			})
		).toBe(
			'https://kb.example.com/og.png?title=Future%20Rivers&eyebrow=Knowledge%20Basket&theme=organization'
		);
	});
});
