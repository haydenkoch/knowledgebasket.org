import type { IngestionAdapter } from './types';
import { icalGenericAdapter } from './adapters/ical-generic';
import { rssGenericAdapter } from './adapters/rss-generic';
import { htmlSelectorAdapter } from './adapters/html-selector';
import { apiJsonAdapter } from './adapters/api-json';
import { grantsGovApiAdapter } from './adapters/grants-gov-api';
import { usaJobsApiAdapter } from './adapters/usajobs-api';
import { csvImportAdapter } from './adapters/csv-import';

class AdapterRegistry {
	private readonly adapters = new Map<string, IngestionAdapter>();

	register(adapter: IngestionAdapter): void {
		this.adapters.set(adapter.adapterType, adapter);
	}

	get(adapterType: string | null | undefined): IngestionAdapter | undefined {
		if (!adapterType) return undefined;
		return this.adapters.get(adapterType);
	}

	getAll(): IngestionAdapter[] {
		return Array.from(this.adapters.values());
	}
}

export const adapterRegistry = new AdapterRegistry();

adapterRegistry.register(icalGenericAdapter);
adapterRegistry.register(rssGenericAdapter);
adapterRegistry.register(htmlSelectorAdapter);
adapterRegistry.register(apiJsonAdapter);
adapterRegistry.register(grantsGovApiAdapter);
adapterRegistry.register(usaJobsApiAdapter);
adapterRegistry.register(csvImportAdapter);
