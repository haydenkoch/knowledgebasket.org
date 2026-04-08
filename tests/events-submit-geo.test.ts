import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeGeoRequest(ip: string) {
	const url = new URL('https://example.com/events/submit/geo?q=bi&limit=12');
	return {
		url,
		request: new Request(url, {
			headers: {
				'user-agent': 'vitest-events-submit-geo'
			}
		}),
		locals: {},
		getClientAddress: () => ip
	} as never;
}

describe('events submit geocoder', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string | URL | Request) => {
				const target =
					typeof input === 'string'
						? input
						: input instanceof Request
							? input.url
							: input.toString();

				if (target.includes('geocoding.geo.census.gov')) {
					return new Response(JSON.stringify({ result: { addressMatches: [] } }), {
						headers: { 'Content-Type': 'application/json' }
					});
				}

				return new Response(JSON.stringify({ features: [] }), {
					headers: { 'Content-Type': 'application/json' }
				});
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rate limits repeated geocoder lookups before fanout continues', async () => {
		const mod = await import('../src/routes/events/submit/geo/+server');
		const actor = '203.0.113.25';

		for (let i = 0; i < 60; i += 1) {
			const response = await mod.GET(makeGeoRequest(actor));
			expect(response.status).toBe(200);
		}

		const response = await mod.GET(makeGeoRequest(actor));
		const body = await response.json();

		expect(response.status).toBe(429);
		expect(body).toEqual(
			expect.objectContaining({
				error: expect.stringContaining('Too many geocoding requests'),
				features: []
			})
		);
	});
});
