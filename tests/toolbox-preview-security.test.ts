import { beforeEach, describe, expect, it, vi } from 'vitest';

const getResourceBySlug = vi.fn();

vi.mock('../src/lib/server/toolbox', () => ({
	getResourceBySlug
}));

describe('toolbox preview security', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects local PDF URLs without proxying them', async () => {
		getResourceBySlug.mockResolvedValueOnce({
			id: 'resource-1',
			slug: 'unsafe-resource',
			externalUrl: 'http://127.0.0.1/private.pdf',
			fileUrl: null
		});

		const mod = await import('../src/routes/toolbox/[slug]/preview/+server');
		const fetchMock = vi.fn();

		await expect(
			mod.GET({
				params: { slug: 'unsafe-resource' },
				fetch: fetchMock
			} as never)
		).rejects.toMatchObject({ status: 404 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('allows self-hosted upload PDFs through the preview proxy', async () => {
		getResourceBySlug.mockResolvedValueOnce({
			id: 'resource-2',
			slug: 'safe-resource',
			externalUrl: null,
			fileUrl: '/uploads/toolbox/original/example.pdf'
		});

		const mod = await import('../src/routes/toolbox/[slug]/preview/+server');
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(Buffer.from('%PDF-1.4\n'), {
				status: 200,
				headers: {
					'content-type': 'application/pdf'
				}
			})
		);

		const response = await mod.GET({
			params: { slug: 'safe-resource' },
			fetch: fetchMock
		} as never);

		expect(fetchMock).toHaveBeenCalledWith('/uploads/toolbox/original/example.pdf', {
			headers: {
				accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8'
			}
		});
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/pdf');
		expect(response.headers.get('content-disposition')).toBe('inline');
	});
});
