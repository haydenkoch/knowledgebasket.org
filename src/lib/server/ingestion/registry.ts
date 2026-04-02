import type { IngestionAdapter } from './types';
import { icalGenericAdapter } from './adapters/ical-generic';

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
