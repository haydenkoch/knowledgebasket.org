import type { sources } from '$lib/server/db/schema';

export type SourceRecord = typeof sources.$inferSelect;

export type Coil = 'events' | 'funding' | 'jobs' | 'red_pages' | 'toolbox';
export type DedupeStrategy =
	| 'url_match'
	| 'title_fuzzy'
	| 'composite_key'
	| 'content_hash'
	| 'external_id';
export type DedupeResult = 'new' | 'duplicate' | 'update' | 'ambiguous';
export type FetchStatus = 'success' | 'failure' | 'partial' | 'timeout' | 'skipped';
export type FetchErrorCategory =
	| 'network'
	| 'timeout'
	| 'rate_limit'
	| 'server_error'
	| 'auth'
	| 'not_found'
	| 'parse'
	| 'unknown';

export type IngestionStage =
	| 'fetch'
	| 'discover'
	| 'detail_enrich'
	| 'structured_extract'
	| 'ai_enrich'
	| 'link_classify'
	| 'image_discover'
	| 'normalize'
	| 'entity_match'
	| 'quality_flag'
	| 'dedupe'
	| 'persist';

export type IngestionStageStatus = 'running' | 'success' | 'failure' | 'partial' | 'skipped';

export type UrlRole =
	| 'source_page'
	| 'detail_page'
	| 'canonical_item'
	| 'registration'
	| 'application'
	| 'organizer'
	| 'venue'
	| 'feed'
	| 'image_source'
	| 'attachment';

export type ImageRole =
	| 'feed'
	| 'detail'
	| 'structured'
	| 'attachment'
	| 'inline'
	| 'logo'
	| 'fallback'
	| 'unknown';

export type AdapterConfig = Record<string, unknown>;

export type EvidenceSource =
	| 'feed'
	| 'detail_page'
	| 'structured_data'
	| 'adapter'
	| 'inferred'
	| 'manual'
	| 'ai'
	| 'attachment'
	| 'inline'
	| 'meta';

export interface FieldProvenanceEntry {
	value: unknown;
	source: EvidenceSource;
	confidence?: number;
	note?: string | null;
}

export type FieldProvenanceMap = Record<string, FieldProvenanceEntry[]>;

export interface UrlEvidence {
	url: string;
	role: UrlRole;
	source: EvidenceSource;
	label?: string | null;
	confidence?: number;
	extracted?: boolean;
	inferred?: boolean;
}

export type UrlRoleMap = Partial<Record<UrlRole, UrlEvidence[]>>;

export interface ImageCandidate {
	url: string;
	role: ImageRole;
	source: EvidenceSource;
	sourceUrl?: string | null;
	confidence?: number;
	isMeaningful?: boolean;
	width?: number | null;
	height?: number | null;
	mimeType?: string | null;
	note?: string | null;
	[key: string]: unknown;
}

export interface QualityFlag {
	code: string;
	severity: 'info' | 'warning' | 'error';
	message: string;
	field?: string | null;
}

export interface EntityMatchSuggestion {
	entityType: 'organization' | 'venue';
	entityId: string;
	label: string;
	score: number;
	reasons: string[];
}

export interface CandidateConfidence {
	overall?: number;
	fields?: Record<string, number>;
	entities?: EntityMatchSuggestion[];
}

export interface ExtractedOffer {
	label: string | null;
	amount: number | null;
	currency: string | null;
	priceText: string | null;
	notes: string | null;
	confidence: number | null;
}

export interface ExtractedPerson {
	name: string;
	role: string | null;
	affiliation: string | null;
	confidence: number | null;
}

export interface ExtractedLocationParts {
	name: string | null;
	street: string | null;
	city: string | null;
	state: string | null;
	postalCode: string | null;
	country: string | null;
	confidence: number | null;
}

export interface ExtractedFieldSuggestion {
	field: string;
	value: string | null;
	confidence: number | null;
	reason: string | null;
}

export interface ExtractedFieldConflict {
	field: string;
	existingValue: string | null;
	proposedValue: string | null;
	reason: string | null;
	confidence: number | null;
}

export interface AiExtractedFacts {
	offers: ExtractedOffer[];
	people: ExtractedPerson[];
	locationParts: ExtractedLocationParts | null;
	fieldSuggestions: ExtractedFieldSuggestion[];
	conflicts: ExtractedFieldConflict[];
	notes: string[];
	model?: string | null;
}

export interface StageDiagnostic {
	stage: IngestionStage;
	status: IngestionStageStatus;
	startedAt: string;
	completedAt?: string;
	durationMs: number;
	itemCount?: number;
	warnings: string[];
	errors: string[];
	metrics?: Record<string, unknown>;
	details?: Record<string, unknown>;
}

export type DetailEnrichmentField =
	| 'description'
	| 'image_url'
	| 'organization_name'
	| 'start_date'
	| 'location_name'
	| 'location_address'
	| 'location_city'
	| 'location_state'
	| 'location_zip'
	| 'cost'
	| 'registration_url';

export type DetailEnrichmentSelector =
	| string
	| {
			selector: string;
			extract?: 'text' | 'html' | 'href' | 'src' | 'attribute';
			attribute?: string;
	  };

export type DetailEnrichmentConfig = {
	enabled?: boolean;
	fetchFrom?: 'sourceItemUrl' | 'normalizedUrl';
	selectors?: Partial<Record<DetailEnrichmentField, DetailEnrichmentSelector>>;
	preferPageFields?: DetailEnrichmentField[];
};

export interface ParsedItem {
	fields: Record<string, unknown>;
	sourceItemId: string | null;
	sourceItemUrl: string | null;
}

export interface ParseError {
	itemIndex: number | null;
	message: string;
	context: string | null;
}

export interface NormalizeError {
	itemIndex: number;
	message: string;
	field: string | null;
	rawValue: unknown;
}

export interface FetchResult {
	success: boolean;
	status: FetchStatus;
	httpStatusCode: number | null;
	responseTimeMs: number;
	rawContent: string | null;
	contentHash: string | null;
	contentSizeBytes: number;
	errorMessage: string | null;
	errorCategory: FetchErrorCategory | null;
	headers: Record<string, string>;
}

export interface ParseResult {
	success: boolean;
	items: ParsedItem[];
	totalFound: number;
	errors: ParseError[];
}

interface NormalizedRecordBase {
	title: string;
	description: string | null;
	url: string | null;
	organization_name: string | null;
	organization_id: string | null;
	tags: string[];
	region: string | null;
	image_url: string | null;
}

export interface NormalizedEvent extends NormalizedRecordBase {
	coil: 'events';
	start_date: string;
	end_date: string | null;
	start_time: string | null;
	end_time: string | null;
	timezone: string | null;
	location_name: string | null;
	location_address: string | null;
	location_city: string | null;
	location_state: string | null;
	location_zip: string | null;
	venue_id?: string | null;
	is_virtual: boolean;
	virtual_url: string | null;
	is_recurring: boolean;
	recurrence_rule: string | null;
	event_type: string | null;
	registration_url: string | null;
	cost: string | null;
}

export interface NormalizedFunding extends NormalizedRecordBase {
	coil: 'funding';
	funding_type: 'grant' | 'fellowship' | 'scholarship' | 'loan' | 'award' | 'other';
	amount_min: number | null;
	amount_max: number | null;
	amount_description: string | null;
	deadline: string | null;
	is_rolling: boolean;
	eligibility: string | null;
	funder_name: string | null;
	funder_url: string | null;
	application_url: string | null;
	opportunity_number: string | null;
	cfda_number: string | null;
	status: 'open' | 'closed' | 'upcoming' | 'rolling';
}

export interface NormalizedJob extends NormalizedRecordBase {
	coil: 'jobs';
	job_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'fellowship' | 'temporary';
	salary_min: number | null;
	salary_max: number | null;
	salary_period: 'hourly' | 'annual' | 'monthly' | null;
	salary_description: string | null;
	location_city: string | null;
	location_state: string | null;
	is_remote: boolean;
	is_hybrid: boolean;
	closing_date: string | null;
	posted_date: string | null;
	indian_preference: boolean;
	department: string | null;
	application_url: string | null;
	contact_email: string | null;
}

export interface NormalizedRedPagesEntry extends NormalizedRecordBase {
	coil: 'red_pages';
	organization_type:
		| 'tribal_government'
		| 'nonprofit'
		| 'business'
		| 'health_facility'
		| 'education'
		| 'housing_authority'
		| 'legal_aid'
		| 'cultural_institution'
		| 'media'
		| 'cdfi'
		| 'other';
	address: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	service_area: string | null;
	tribal_affiliation: string | null;
	year_established: number | null;
}

export interface NormalizedToolboxItem extends NormalizedRecordBase {
	coil: 'toolbox';
	resource_type:
		| 'toolkit'
		| 'guide'
		| 'report'
		| 'data_portal'
		| 'training'
		| 'webinar'
		| 'template'
		| 'directory'
		| 'video'
		| 'podcast'
		| 'other';
	format: 'pdf' | 'html' | 'video' | 'interactive' | 'downloadable' | 'other';
	topics: string[];
	publisher: string | null;
	publication_date: string | null;
	last_verified_at: string | null;
	link_healthy: boolean;
	file_size: string | null;
}

export type NormalizedRecord =
	| NormalizedEvent
	| NormalizedFunding
	| NormalizedJob
	| NormalizedRedPagesEntry
	| NormalizedToolboxItem;

export interface NormalizeResult {
	success: boolean;
	records: NormalizedRecord[];
	errors: NormalizeError[];
}

export interface ConfigValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export interface DedupeMatch {
	strategy: DedupeStrategy;
	canonicalRecordId: string;
	confidence: number;
	canonicalTitle?: string | null;
	publishedRecordId?: string | null;
}

export interface DedupeCheckResult {
	result: DedupeResult;
	match: DedupeMatch | null;
	strategyUsed: DedupeStrategy | null;
}

export interface DedupeLookup {
	byFingerprint(coil: Coil, fingerprint: string): Promise<DedupeMatch | null>;
	byCompositeKey(coil: Coil, compositeHash: string): Promise<DedupeMatch | null>;
	byUrl(coil: Coil, url: string): Promise<DedupeMatch | null>;
	byExternalId(sourceId: string, externalId: string): Promise<DedupeMatch | null>;
	byTitleSimilarity(coil: Coil, title: string, threshold?: number): Promise<DedupeMatch | null>;
}

export interface PreviewCandidate {
	index: number;
	rawData: Record<string, unknown>;
	normalizedData: NormalizedRecord;
	sourceItemId: string | null;
	sourceItemUrl: string | null;
	contentFingerprint: string;
	compositeKeyRaw: string;
	compositeKeyHash: string;
	dedupe: DedupeCheckResult;
	priority: 'low' | 'normal' | 'high';
	sourceAttribution: string | null;
	expiresAt: Date | null;
	fieldProvenance: FieldProvenanceMap;
	urlRoles: UrlRoleMap;
	imageCandidates: ImageCandidate[];
	extractedFacts: AiExtractedFacts;
	qualityFlags: QualityFlag[];
	confidence: CandidateConfidence;
	diagnostics: Record<string, unknown>;
}

export interface IngestionPreviewResult {
	sourceId: string;
	adapterType: string;
	fetchResult: FetchResult;
	parseResult: ParseResult | null;
	normalizeResult: NormalizeResult | null;
	candidates: PreviewCandidate[];
	dedupeCounts: Record<DedupeResult, number>;
	durationMs: number;
	stages: StageDiagnostic[];
}

export interface IngestionResult extends IngestionPreviewResult {
	success: boolean;
	batchId: string | null;
	fetchLogId: string | null;
	candidatesCreated: number;
	duplicatesSkipped: number;
	updatesQueued: number;
	autoApprovedCount: number;
	errors: string[];
}

export type IngestionTrigger =
	| 'manual_preview'
	| 'manual_import'
	| 'admin_retry'
	| 'scheduler'
	| 'api';

export interface IngestionExecutionOptions {
	trigger?: IngestionTrigger | string;
	triggerRunId?: string | null;
	triggeredBy?: string | null;
	enableAutoApprove?: boolean;
}

export interface SchedulerSourceRunResult {
	sourceId: string;
	sourceName: string;
	success: boolean;
	batchId: string | null;
	fetchLogId: string | null;
	candidatesCreated: number;
	autoApprovedCount: number;
	error: string | null;
}

export interface SchedulerRunResult {
	trigger: string;
	triggerRunId: string;
	startedAt: string;
	completedAt: string;
	totalSelected: number;
	totalProcessed: number;
	totalSucceeded: number;
	totalFailed: number;
	totalCandidatesCreated: number;
	totalAutoApproved: number;
	results: SchedulerSourceRunResult[];
}

export interface IngestionAdapter {
	readonly adapterType: string;
	readonly displayName: string;
	readonly supportedCoils: Coil[];

	fetch(source: SourceRecord): Promise<FetchResult>;
	parse(rawContent: string, config: AdapterConfig): Promise<ParseResult>;
	normalize(items: ParsedItem[], coil: Coil, config: AdapterConfig): Promise<NormalizeResult>;
	validateConfig(config: AdapterConfig, source?: SourceRecord): ConfigValidationResult;
}
