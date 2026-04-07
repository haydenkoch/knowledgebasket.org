import { describe, expect, it } from 'vitest';
import { GET as ogGet } from '../src/routes/og.png/+server';

describe('dynamic OG image route', () => {
	it('returns a cached PNG response', async () => {
		const response = await ogGet({
			url: new URL(
				'https://kb.example.com/og.png?title=Future%20Rivers&eyebrow=Knowledge%20Basket&theme=organization'
			)
		} as Parameters<typeof ogGet>[0]);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect(response.headers.get('cache-control')).toContain('max-age=86400');

		const bytes = new Uint8Array(await response.arrayBuffer());
		expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(bytes.length).toBeGreaterThan(1024);
	});
});
