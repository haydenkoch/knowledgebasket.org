import type { SearchRequest, SearchResult } from '$lib/server/search-contracts';

export interface SemanticSearchAdapter {
	expandQuery(request: SearchRequest): Promise<string[]>;
	decorateDocuments<T extends Record<string, unknown>>(documents: T[]): Promise<T[]>;
	rerankResults(request: SearchRequest, results: SearchResult[]): Promise<SearchResult[]>;
}

function normalize(value: string | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

function titleScore(query: string, title: string): number {
	if (!query || !title) return 0;
	if (title === query) return 1200;
	if (title.startsWith(query)) return 700;
	if (title.includes(query)) return 420;

	const queryTerms = query.split(/\s+/).filter(Boolean);
	return queryTerms.reduce((score, term) => score + (title.includes(term) ? 110 : 0), 0);
}

function textScore(query: string, value: string, weight: number): number {
	if (!query || !value) return 0;
	if (value.includes(query)) return weight;
	const queryTerms = query.split(/\s+/).filter(Boolean);
	return queryTerms.reduce((score, term) => score + (value.includes(term) ? weight / 4 : 0), 0);
}

function numericField(result: SearchResult, key: string): number {
	const value = (result.fields as Record<string, unknown> | undefined)?.[key];
	return typeof value === 'number' ? value : 0;
}

function dateRecencyBoost(value: unknown): number {
	if (typeof value !== 'string') return 0;
	const timestamp = new Date(value).getTime();
	if (!Number.isFinite(timestamp)) return 0;
	const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
	return Math.max(0, 40 - Math.min(40, ageDays / 3));
}

function scoreResult(request: SearchRequest, result: SearchResult, index: number): number {
	if (request.sort !== 'relevance') return -index;

	const query = normalize(request.q);
	const title = normalize(result.title);
	const subtitle = normalize(result.presentation.subtitle);
	const summary = normalize(result.summary);
	const meta = normalize(result.meta.join(' '));

	let score = 0;
	score += titleScore(query, title);
	score += textScore(query, subtitle, 220);
	score += textScore(query, meta, 180);
	score += textScore(query, summary, 120);
	score += numericField(result, 'featuredRank') * 80;
	score += numericField(result, 'openRank') * 55;
	score += dateRecencyBoost((result.fields as Record<string, unknown> | undefined)?.sortDate);
	score += dateRecencyBoost((result.fields as Record<string, unknown> | undefined)?.updatedAt) / 2;
	score -= index;
	return score;
}

class HeuristicSearchAdapter implements SemanticSearchAdapter {
	async expandQuery(_request: SearchRequest): Promise<string[]> {
		return [];
	}

	async decorateDocuments<T extends Record<string, unknown>>(documents: T[]): Promise<T[]> {
		return documents;
	}

	async rerankResults(request: SearchRequest, results: SearchResult[]): Promise<SearchResult[]> {
		return [...results]
			.map((result, index) => ({
				result,
				score: scoreResult(request, result, index)
			}))
			.sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
			.map((entry) => entry.result);
	}
}

export const semanticSearchAdapter: SemanticSearchAdapter = new HeuristicSearchAdapter();
