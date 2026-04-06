import { describe, expect, it } from 'vitest';
import { _createSearchReadinessLoader } from '$lib/server/meilisearch';
import type { SearchIndexScope } from '$lib/server/search-contracts';

const ALL_SCOPES: SearchIndexScope[] = [
	'events',
	'funding',
	'redpages',
	'jobs',
	'toolbox',
	'organizations',
	'venues',
	'sources'
];

function createLoader(overrides?: {
	isConfigured?: () => boolean;
	isAvailable?: (force?: boolean) => Promise<boolean>;
	listIndexUids?: () => Promise<string[]>;
	hasSettingsMismatch?: (scope: SearchIndexScope) => Promise<boolean>;
}) {
	return _createSearchReadinessLoader({
		isConfigured: overrides?.isConfigured ?? (() => true),
		isAvailable: overrides?.isAvailable ?? (async () => true),
		listIndexUids:
			overrides?.listIndexUids ??
			(async () => [
				'events',
				'funding',
				'red_pages',
				'jobs',
				'toolbox',
				'organizations',
				'venues',
				'sources'
			]),
		hasSettingsMismatch: overrides?.hasSettingsMismatch ?? (async () => false)
	});
}

describe('getSearchReadiness', () => {
	it('reports not-configured when Meilisearch is disabled', async () => {
		const readiness = await createLoader({
			isConfigured: () => false
		})();

		expect(readiness.state).toBe('offline');
		expect(readiness.detail).toBe('not-configured');
		expect(readiness.available).toBe(false);
		expect(readiness.missingScopes).toEqual(ALL_SCOPES);
	});

	it('reports host-unavailable when the search host cannot be reached', async () => {
		const readiness = await createLoader({
			isAvailable: async () => false
		})(true);

		expect(readiness.state).toBe('offline');
		expect(readiness.detail).toBe('host-unavailable');
		expect(readiness.available).toBe(false);
		expect(readiness.missingScopes).toEqual(ALL_SCOPES);
	});

	it('reports partial readiness when indexes are missing', async () => {
		const readiness = await createLoader({
			listIndexUids: async () => ['events', 'toolbox']
		})();

		expect(readiness.state).toBe('partial');
		expect(readiness.detail).toBe('missing-indexes');
		expect(readiness.indexedScopes).toEqual(['events', 'toolbox']);
		expect(readiness.missingScopes).toEqual([
			'funding',
			'redpages',
			'jobs',
			'organizations',
			'venues',
			'sources'
		]);
		expect(readiness.issues.some((issue) => issue.type === 'missing-index')).toBe(true);
	});

	it('reports partial readiness when index settings drift from the expected version', async () => {
		const readiness = await createLoader({
			hasSettingsMismatch: async (scope) => scope === 'funding'
		})();

		expect(readiness.state).toBe('partial');
		expect(readiness.detail).toBe('settings-mismatch');
		expect(readiness.indexedScopes).toEqual(ALL_SCOPES);
		expect(readiness.mismatchedScopes).toEqual(['funding']);
		expect(readiness.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'settings-mismatch',
					scope: 'funding'
				})
			])
		);
	});

	it('reports ready when all scopes exist and match the expected settings', async () => {
		const readiness = await createLoader()();

		expect(readiness.state).toBe('ready');
		expect(readiness.detail).toBe('ready');
		expect(readiness.indexedScopes).toEqual(ALL_SCOPES);
		expect(readiness.missingScopes).toEqual([]);
		expect(readiness.mismatchedScopes).toEqual([]);
		expect(readiness.issues).toEqual([]);
	});
});
