import { adapterRegistry } from './registry';
import type { AdapterConfig, ConfigValidationResult, SourceRecord } from './types';

export function buildAdapterConfig(source: SourceRecord): AdapterConfig {
	return {
		...(source.adapterConfig as AdapterConfig),
		__sourceSlug: source.slug,
		__sourceUrl: source.sourceUrl,
		__fetchUrl: source.fetchUrl
	};
}

export function validateSourceConfig(source: SourceRecord): ConfigValidationResult & {
	adapterDisplayName: string | null;
} {
	if (!source.adapterType) {
		return {
			valid: false,
			errors: ['No adapter is configured for this source.'],
			warnings: [],
			adapterDisplayName: null
		};
	}

	const adapter = adapterRegistry.get(source.adapterType);
	if (!adapter) {
		return {
			valid: false,
			errors: [`No ingestion adapter is registered for ${source.adapterType}.`],
			warnings: [],
			adapterDisplayName: null
		};
	}

	return {
		...adapter.validateConfig(buildAdapterConfig(source), source),
		adapterDisplayName: adapter.displayName
	};
}
