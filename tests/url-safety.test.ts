import { describe, expect, it, vi } from 'vitest';
import { fetchSafeOutboundResource, normalizePublicHttpUrl } from '../src/lib/server/url-safety';

describe('url safety helpers', () => {
	it('accepts public http and https URLs', () => {
		expect(normalizePublicHttpUrl('https://example.com/docs/file.pdf')).toBe(
			'https://example.com/docs/file.pdf'
		);
		expect(normalizePublicHttpUrl('http://1.1.1.1/file.pdf')).toBe('http://1.1.1.1/file.pdf');
	});

	it('rejects unsafe schemes and local addresses', () => {
		expect(normalizePublicHttpUrl('javascript:alert(1)')).toBeNull();
		expect(normalizePublicHttpUrl('http://localhost:3000/secret')).toBeNull();
		expect(normalizePublicHttpUrl('http://127.0.0.1/private.pdf')).toBeNull();
		expect(normalizePublicHttpUrl('http://10.0.0.5/private.pdf')).toBeNull();
	});

	it('blocks redirects to local addresses during outbound fetches', async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(null, {
				status: 302,
				headers: { location: 'http://127.0.0.1/private.pdf' }
			});
		});

		await expect(
			fetchSafeOutboundResource(fetchMock as typeof fetch, 'http://1.1.1.1/resource.pdf')
		).rejects.toThrow('public http or https URL');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
