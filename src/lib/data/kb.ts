export type CoilKey = 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox';

// ── Status enums ──────────────────────────────────────────

export const ITEM_STATUSES = ['published', 'pending', 'draft', 'rejected'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const USER_ROLES = ['contributor', 'moderator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_FORMATS = ['in_person', 'online', 'hybrid'] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

export const WORK_ARRANGEMENTS = ['on_site', 'remote', 'hybrid'] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export const CONTENT_MODES = ['link', 'hosted', 'file'] as const;
export type ContentMode = (typeof CONTENT_MODES)[number];

export const coilLabels: Record<CoilKey, string> = {
	events: 'Events',
	funding: 'Funding',
	redpages: 'Red Pages',
	jobs: 'Job Board',
	toolbox: 'Toolbox'
};

export interface BaseItem {
	id: string;
	title: string;
	description?: string;
	coil: CoilKey;
	provenance?: SourceProvenance;
}

export interface SourceProvenance {
	sourceName: string;
	sourceSlug?: string;
	sourceUrl?: string;
	sourceItemUrl?: string;
	attributionText: string;
	lastSyncedAt?: string;
	sourceCount: number;
}

export interface PricingTier {
	label: string;
	price: number;
	validUntil?: string;
	description?: string;
	sortOrder?: number;
}

export interface EventItem extends BaseItem {
	slug?: string;
	location?: string;
	address?: string;
	lat?: number;
	lng?: number;
	region?: string;
	type?: string;
	types?: string[];
	audience?: string;
	cost?: string;
	eventUrl?: string;
	startDate?: string;
	endDate?: string;
	hostOrg?: string;
	imageUrl?: string;
	imageUrls?: string[];

	organizationId?: string;
	venueId?: string;
	venueName?: string;
	organizationName?: string;
	organizationSlug?: string;
	venueSlug?: string;
	parentEventId?: string;

	pricingTiers?: PricingTier[];
	priceMin?: number | null;
	priceMax?: number | null;

	registrationUrl?: string;
	registrationDeadline?: string;

	eventFormat?: string; // in_person | online | hybrid
	timezone?: string;
	doorsOpenAt?: string;
	capacity?: number | null;
	soldOut?: boolean;
	ageRestriction?: string;
	accessibilityNotes?: string;
	virtualEventUrl?: string;
	waitlistUrl?: string;

	tags?: string[];

	isAllDay?: boolean;

	featured?: boolean;
	unlisted?: boolean;
	status?: string;
	publishedAt?: string;
	cancelledAt?: string;
	rejectedAt?: string;

	contactEmail?: string;
	contactName?: string;
	contactPhone?: string;

	adminNotes?: string;
	rejectionReason?: string;
	submittedById?: string;
	reviewedById?: string;
	source?: string;
}

export interface FundingItem extends BaseItem {
	slug?: string;
	funderName?: string;
	organizationId?: string;
	organizationName?: string;
	organizationSlug?: string;

	fundingType?: string;
	fundingTypes?: string[];
	eligibilityType?: string;
	eligibilityTypes?: string[];
	focusAreas?: string[];
	tags?: string[];

	applicationStatus?: string;
	openDate?: string;
	deadline?: string;
	awardDate?: string;
	fundingCycleNotes?: string;
	isRecurring?: boolean;
	recurringSchedule?: string;

	amountMin?: number | null;
	amountMax?: number | null;
	amountDescription?: string;
	fundingTerm?: string;
	matchRequired?: boolean;
	matchRequirements?: string;

	eligibleCosts?: string;

	region?: string;
	geographicRestrictions?: string;

	applyUrl?: string;
	contactEmail?: string;
	contactName?: string;
	contactPhone?: string;

	imageUrl?: string;

	status?: string;
	source?: string;
	featured?: boolean;
	unlisted?: boolean;
	publishedAt?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	adminNotes?: string;
	submittedById?: string;
	reviewedById?: string;
}

export interface RedPagesItem extends BaseItem {
	slug?: string;
	name?: string;
	organizationId?: string;
	organizationName?: string;
	organizationSlug?: string;
	ownerName?: string;

	serviceType?: string;
	serviceTypes?: string[];
	serviceArea?: string;
	tags?: string[];

	tribalAffiliation?: string;
	tribalAffiliations?: string[];
	ownershipIdentity?: string[];

	website?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	state?: string;
	zip?: string;
	lat?: number;
	lng?: number;
	region?: string;

	businessHours?: { day: string; open: string; close: string }[];

	logoUrl?: string;
	imageUrl?: string;
	imageUrls?: string[];

	certifications?: string[];
	socialLinks?: Record<string, string>;

	status?: string;
	source?: string;
	featured?: boolean;
	unlisted?: boolean;
	publishedAt?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	adminNotes?: string;
	submittedById?: string;
	reviewedById?: string;
	verified?: boolean;
}

export interface JobItem extends BaseItem {
	slug?: string;
	qualifications?: string;

	employerName?: string;
	organizationId?: string;
	organizationName?: string;
	organizationSlug?: string;

	jobType?: string;
	seniority?: string;
	sector?: string;
	sectors?: string[];
	department?: string;
	tags?: string[];

	workArrangement?: string;
	location?: string;
	address?: string;
	city?: string;
	state?: string;
	zip?: string;
	lat?: number;
	lng?: number;
	region?: string;

	compensationType?: string;
	compensationMin?: number | null;
	compensationMax?: number | null;
	compensationDescription?: string;
	benefits?: string;

	applyUrl?: string;
	applicationDeadline?: string;
	applicationInstructions?: string;

	indigenousPriority?: boolean;
	tribalPreference?: string;

	imageUrl?: string;

	status?: string;
	source?: string;
	featured?: boolean;
	unlisted?: boolean;
	publishedAt?: string;
	closedAt?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	adminNotes?: string;
	submittedById?: string;
	reviewedById?: string;

	interestCount?: number;
	userInterested?: boolean;
}

export interface ToolboxItem extends BaseItem {
	slug?: string;
	body?: string;

	sourceName?: string;
	organizationId?: string;
	organizationName?: string;
	organizationSlug?: string;

	resourceType?: string;
	mediaType?: string;
	category?: string;
	categories?: string[];
	tags?: string[];

	contentMode?: string;
	externalUrl?: string;
	fileUrl?: string;

	imageUrl?: string;

	author?: string;
	publishDate?: string;
	lastReviewedAt?: string;

	status?: string;
	source?: string;
	featured?: boolean;
	unlisted?: boolean;
	publishedAt?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	adminNotes?: string;
	submittedById?: string;
	reviewedById?: string;
}

export interface KBData {
	events: EventItem[];
	funding: FundingItem[];
	redpages: RedPagesItem[];
	jobs: JobItem[];
	toolbox: ToolboxItem[];
}

export type SearchResults = Partial<Record<CoilKey, BaseItem[]>>;

export const coilPaths: Record<CoilKey, string> = {
	events: 'events',
	funding: 'funding',
	redpages: 'red-pages',
	jobs: 'jobs',
	toolbox: 'toolbox'
};

export function getCoilPath(coil: CoilKey): string {
	return coilPaths[coil];
}
