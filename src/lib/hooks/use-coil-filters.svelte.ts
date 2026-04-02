/**
 * Generic coil filter + pagination state.
 * Extracts the common pattern from funding, jobs, red-pages, and toolbox pages.
 */
import { matchSearch, filterByFacets, facetCounts } from '$lib/utils/format';

export interface CoilFiltersConfig<T> {
	/** The items to filter */
	items: () => T[];
	/** Facet definitions: field name -> reactive selected array getter */
	facets: Record<string, { field: keyof T }>;
	/** Extra fields to search beyond title/description */
	searchFields?: (keyof T)[];
	/** Items per page (default 6) */
	perPage?: number;
}

export function useCoilFilters<T extends { title: string; description?: string }>(
	config: CoilFiltersConfig<T>
) {
	const perPage = config.perPage ?? 6;

	let searchQuery = $state('');
	let facetSelections = $state<Record<string, string[]>>(
		Object.fromEntries(Object.keys(config.facets).map((k) => [k, []]))
	);
	let pageBinding = $state(1);

	const items = $derived(config.items());

	const facetCountsMap = $derived(
		Object.fromEntries(
			Object.entries(config.facets).map(([key, { field }]) => [key, facetCounts(items, field)])
		)
	);

	const facetValues = $derived(
		Object.fromEntries(
			Object.entries(facetCountsMap).map(([key, counts]) => [key, Object.keys(counts).sort()])
		)
	);

	const filtered = $derived(
		filterByFacets(
			items.filter((e) => matchSearch(e, searchQuery, (config.searchFields ?? []) as (keyof T)[])),
			Object.fromEntries(
				Object.entries(config.facets).map(([key, { field }]) => [
					field as string,
					facetSelections[key] ?? []
				])
			)
		)
	);

	const filteredTotal = $derived(filtered.length);
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTotal / perPage)));
	const currentPage = $derived(Math.min(pageBinding, totalPages));
	const paginatedList = $derived(
		filtered.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		pageBinding = currentPage;
	});

	function toggleFacet(facetKey: string, value: string) {
		const current = facetSelections[facetKey] ?? [];
		facetSelections = {
			...facetSelections,
			[facetKey]: current.includes(value) ? current.filter((x) => x !== value) : [...current, value]
		};
	}

	function clearFilters() {
		searchQuery = '';
		facetSelections = Object.fromEntries(Object.keys(config.facets).map((k) => [k, []]));
	}

	function getFacetSelection(key: string): string[] {
		return facetSelections[key] ?? [];
	}

	return {
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(v: string) {
			searchQuery = v;
		},
		get pageBinding() {
			return pageBinding;
		},
		set pageBinding(v: number) {
			pageBinding = v;
		},
		get items() {
			return items;
		},
		get filtered() {
			return filtered;
		},
		get filteredTotal() {
			return filteredTotal;
		},
		get totalPages() {
			return totalPages;
		},
		get currentPage() {
			return currentPage;
		},
		get paginatedList() {
			return paginatedList;
		},
		get facetCounts() {
			return facetCountsMap;
		},
		get facetValues() {
			return facetValues;
		},
		getFacetSelection,
		toggleFacet,
		clearFilters,
		perPage
	};
}
