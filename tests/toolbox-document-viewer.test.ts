import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDevServer } from './helpers/dev-server';

const getUploadObject = vi.fn();
const captureServerError = vi.fn();

vi.mock('../src/lib/server/object-storage', () => ({
	getUploadObject
}));

vi.mock('../src/lib/server/observability', () => ({
	captureServerError
}));

describe('toolbox document delivery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetModules();
	});

	it('serves uploaded PDFs inline even when storage metadata is missing', async () => {
		getUploadObject.mockResolvedValueOnce({
			body: Buffer.from('%PDF-1.4\n'),
			contentType: null,
			contentLength: null,
			lastModified: null,
			etag: null
		});

		const mod = await import('../src/routes/uploads/[...path]/+server');
		const response = await mod.GET({
			params: { path: 'toolbox/original/example.pdf' }
		} as never);

		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(response.headers.get('content-disposition')).toBe('inline');
	});
});

describe('toolbox document embedding headers', () => {
	let resourcesDir = '';
	let server: Awaited<ReturnType<typeof startDevServer>>;

	beforeAll(async () => {
		resourcesDir = await mkdtemp(join(tmpdir(), 'kb-toolbox-resources-'));
		await writeFile(join(resourcesDir, 'embedded.pdf'), Buffer.from('%PDF-1.4\n'));
		server = await startDevServer(4178, {
			KB_RESOURCES_PATH: resourcesDir
		});
	});

	afterAll(async () => {
		await server?.stop();
		if (resourcesDir) {
			await rm(resourcesDir, { recursive: true, force: true });
		}
	});

	it('allows same-origin iframe embedding for local PDF resources', async () => {
		const response = await fetch(`${server.baseUrl}/resources/embedded.pdf`);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/pdf');
		expect(response.headers.get('content-disposition')).toBe('inline');
		expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
	});

	it('keeps non-document routes locked out of framing', async () => {
		const response = await fetch(`${server.baseUrl}/manifest.webmanifest`);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
	});
});
