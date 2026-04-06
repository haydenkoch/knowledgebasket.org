import { desc, eq, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	account,
	bookmarks,
	events,
	funding,
	jobInterests,
	jobs,
	notificationPreferences,
	notifications,
	organizationClaimRequests,
	organizationInvites,
	orgFollows,
	personalCalendarFeeds,
	privacyRequests,
	redPagesBusinesses,
	session,
	toolboxResources,
	user,
	userOrgMemberships,
	verification
} from '$lib/server/db/schema';
import {
	assertAccountLifecycleSchemaHealthy,
	assertPrivacyRequestsSchemaHealthy
} from '$lib/server/privacy-schema';

export const PRIVACY_REQUEST_TYPES = [
	'export_data',
	'delete_account',
	'correct_content',
	'remove_content',
	'opt_out_marketing'
] as const;

export const PRIVACY_REQUEST_STATUSES = [
	'submitted',
	'in_review',
	'fulfilled',
	'declined'
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

type CreatePrivacyRequestInput = {
	userId: string;
	requestType: PrivacyRequestType;
	subject?: string;
	details?: Record<string, unknown>;
	status?: PrivacyRequestStatus;
	resolutionNotes?: string;
	fulfilledAt?: Date | null;
};

type SubmissionSummary = {
	coil: string;
	title: string;
	status: string | null;
	slug: string | null;
	createdAt: Date | null;
};

async function safePrivacyQuery<T>(label: string, query: Promise<T>, fallback: T): Promise<T> {
	try {
		return await query;
	} catch (error) {
		console.warn(
			`[privacy] ${label} query failed (run pnpm db:push if compliance tables are missing):`,
			error
		);
		return fallback;
	}
}

function redactSubmissionAdminNotes(column: unknown) {
	return sql<
		string | null
	>`nullif(trim(regexp_replace(coalesce(${column}, ''), '^Public submission contact[\\s\\S]*?(\\n\\n|$)', '', 'g')), '')`;
}

function buildDeletedEmail(userId: string): string {
	return `deleted+${userId}@knowledgebasket.invalid`;
}

export async function createPrivacyRequest(input: CreatePrivacyRequestInput) {
	await assertPrivacyRequestsSchemaHealthy();

	const [created] = await db
		.insert(privacyRequests)
		.values({
			userId: input.userId,
			requestType: input.requestType,
			subject: input.subject ?? null,
			details: input.details ?? {},
			status: input.status ?? 'submitted',
			resolutionNotes: input.resolutionNotes ?? null,
			fulfilledAt: input.fulfilledAt ?? null
		})
		.returning();

	return created;
}

export async function getPrivacyDashboard(userId: string) {
	const [userRecord, requestRows, eventRows, fundingRows, jobRows, redPagesRows, toolboxRows] =
		await Promise.all([
			safePrivacyQuery(
				'user dashboard',
				db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						role: user.role,
						newsletterOptIn: user.newsletterOptIn,
						createdAt: user.createdAt
					})
					.from(user)
					.where(eq(user.id, userId))
					.limit(1),
				[]
			),
			safePrivacyQuery(
				'privacy requests',
				db
					.select()
					.from(privacyRequests)
					.where(eq(privacyRequests.userId, userId))
					.orderBy(desc(privacyRequests.requestedAt))
					.limit(20),
				[]
			),
			safePrivacyQuery(
				'event submissions',
				db
					.select({
						coil: events.source,
						title: events.title,
						status: events.status,
						slug: events.slug,
						createdAt: events.createdAt
					})
					.from(events)
					.where(eq(events.submittedById, userId))
					.orderBy(desc(events.createdAt))
					.limit(5),
				[]
			),
			safePrivacyQuery(
				'funding submissions',
				db
					.select({
						coil: funding.source,
						title: funding.title,
						status: funding.status,
						slug: funding.slug,
						createdAt: funding.createdAt
					})
					.from(funding)
					.where(eq(funding.submittedById, userId))
					.orderBy(desc(funding.createdAt))
					.limit(5),
				[]
			),
			safePrivacyQuery(
				'job submissions',
				db
					.select({
						coil: jobs.source,
						title: jobs.title,
						status: jobs.status,
						slug: jobs.slug,
						createdAt: jobs.createdAt
					})
					.from(jobs)
					.where(eq(jobs.submittedById, userId))
					.orderBy(desc(jobs.createdAt))
					.limit(5),
				[]
			),
			safePrivacyQuery(
				'red pages submissions',
				db
					.select({
						coil: redPagesBusinesses.source,
						title: redPagesBusinesses.name,
						status: redPagesBusinesses.status,
						slug: redPagesBusinesses.slug,
						createdAt: redPagesBusinesses.createdAt
					})
					.from(redPagesBusinesses)
					.where(eq(redPagesBusinesses.submittedById, userId))
					.orderBy(desc(redPagesBusinesses.createdAt))
					.limit(5),
				[]
			),
			safePrivacyQuery(
				'toolbox submissions',
				db
					.select({
						coil: toolboxResources.source,
						title: toolboxResources.title,
						status: toolboxResources.status,
						slug: toolboxResources.slug,
						createdAt: toolboxResources.createdAt
					})
					.from(toolboxResources)
					.where(eq(toolboxResources.submittedById, userId))
					.orderBy(desc(toolboxResources.createdAt))
					.limit(5),
				[]
			)
		]);

	const submissions: SubmissionSummary[] = [
		...eventRows.map((row) => ({ ...row, coil: 'events' })),
		...fundingRows.map((row) => ({ ...row, coil: 'funding' })),
		...jobRows.map((row) => ({ ...row, coil: 'jobs' })),
		...redPagesRows.map((row) => ({ ...row, coil: 'red-pages' })),
		...toolboxRows.map((row) => ({ ...row, coil: 'toolbox' }))
	].sort((a, b) => {
		const aTs = a.createdAt?.getTime() ?? 0;
		const bTs = b.createdAt?.getTime() ?? 0;
		return bTs - aTs;
	});

	return {
		user: userRecord[0] ?? null,
		requests: requestRows,
		submissions,
		submissionCounts: {
			events: eventRows.length,
			funding: fundingRows.length,
			jobs: jobRows.length,
			redPages: redPagesRows.length,
			toolbox: toolboxRows.length
		}
	};
}

export async function exportUserPrivacyBundle(userId: string) {
	const userRows = await safePrivacyQuery(
		'export user',
		db.select().from(user).where(eq(user.id, userId)).limit(1),
		[]
	);
	const currentUser = userRows[0] ?? null;

	const [
		sessionRows,
		accountRows,
		verificationRows,
		requestRows,
		eventRows,
		fundingRows,
		jobRows,
		redPagesRows,
		toolboxRows
	] = await Promise.all([
		safePrivacyQuery(
			'export sessions',
			db
				.select({
					createdAt: session.createdAt,
					updatedAt: session.updatedAt,
					expiresAt: session.expiresAt,
					ipAddress: session.ipAddress,
					userAgent: session.userAgent
				})
				.from(session)
				.where(eq(session.userId, userId)),
			[]
		),
		safePrivacyQuery(
			'export accounts',
			db
				.select({
					providerId: account.providerId,
					scope: account.scope,
					createdAt: account.createdAt,
					updatedAt: account.updatedAt
				})
				.from(account)
				.where(eq(account.userId, userId)),
			[]
		),
		currentUser
			? safePrivacyQuery(
					'export verifications',
					db
						.select({
							identifier: verification.identifier,
							expiresAt: verification.expiresAt,
							createdAt: verification.createdAt
						})
						.from(verification)
						.where(
							or(
								eq(verification.identifier, currentUser.email),
								eq(verification.value, currentUser.email)
							)
						),
					[]
				)
			: Promise.resolve([]),
		safePrivacyQuery(
			'export privacy requests',
			db
				.select()
				.from(privacyRequests)
				.where(eq(privacyRequests.userId, userId))
				.orderBy(desc(privacyRequests.requestedAt)),
			[]
		),
		safePrivacyQuery(
			'export events',
			db.select().from(events).where(eq(events.submittedById, userId)),
			[]
		),
		safePrivacyQuery(
			'export funding',
			db.select().from(funding).where(eq(funding.submittedById, userId)),
			[]
		),
		safePrivacyQuery(
			'export jobs',
			db.select().from(jobs).where(eq(jobs.submittedById, userId)),
			[]
		),
		safePrivacyQuery(
			'export red pages',
			db.select().from(redPagesBusinesses).where(eq(redPagesBusinesses.submittedById, userId)),
			[]
		),
		safePrivacyQuery(
			'export toolbox',
			db.select().from(toolboxResources).where(eq(toolboxResources.submittedById, userId)),
			[]
		)
	]);

	return {
		exportedAt: new Date().toISOString(),
		user: currentUser,
		sessions: sessionRows,
		accounts: accountRows,
		verifications: verificationRows,
		privacyRequests: requestRows,
		submissions: {
			events: eventRows,
			funding: fundingRows,
			jobs: jobRows,
			redPages: redPagesRows,
			toolbox: toolboxRows
		}
	};
}

export async function deleteUserAccount(userId: string) {
	await assertAccountLifecycleSchemaHealthy();

	const [existingUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
	if (!existingUser) {
		throw new Error('User not found');
	}

	const request = await createPrivacyRequest({
		userId,
		requestType: 'delete_account',
		subject: 'Account deletion completed',
		status: 'fulfilled',
		details: { completedBy: 'self-serve' },
		resolutionNotes: 'Account anonymized and active login credentials removed.',
		fulfilledAt: new Date()
	});

	await Promise.all([
		db
			.update(events)
			.set({
				contactName: null,
				contactEmail: null,
				contactPhone: null,
				adminNotes: redactSubmissionAdminNotes(events.adminNotes)
			})
			.where(eq(events.submittedById, userId)),
		db
			.update(funding)
			.set({ adminNotes: redactSubmissionAdminNotes(funding.adminNotes) })
			.where(eq(funding.submittedById, userId)),
		db
			.update(jobs)
			.set({ adminNotes: redactSubmissionAdminNotes(jobs.adminNotes) })
			.where(eq(jobs.submittedById, userId)),
		db
			.update(redPagesBusinesses)
			.set({ adminNotes: redactSubmissionAdminNotes(redPagesBusinesses.adminNotes) })
			.where(eq(redPagesBusinesses.submittedById, userId)),
		db
			.update(toolboxResources)
			.set({ adminNotes: redactSubmissionAdminNotes(toolboxResources.adminNotes) })
			.where(eq(toolboxResources.submittedById, userId))
	]);

	await Promise.all([
		db.delete(session).where(eq(session.userId, userId)),
		db.delete(account).where(eq(account.userId, userId)),
		db
			.delete(verification)
			.where(
				or(
					eq(verification.identifier, existingUser.email),
					eq(verification.value, existingUser.email)
				)
			),
		db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId)),
		db.delete(notifications).where(eq(notifications.userId, userId)),
		db.delete(bookmarks).where(eq(bookmarks.userId, userId)),
		db.delete(personalCalendarFeeds).where(eq(personalCalendarFeeds.userId, userId)),
		db.delete(orgFollows).where(eq(orgFollows.userId, userId)),
		db
			.delete(organizationClaimRequests)
			.where(eq(organizationClaimRequests.requesterUserId, userId)),
		db.delete(organizationInvites).where(eq(organizationInvites.email, existingUser.email)),
		db.delete(userOrgMemberships).where(eq(userOrgMemberships.userId, userId)),
		db.delete(jobInterests).where(eq(jobInterests.userId, userId))
	]);

	await db
		.update(user)
		.set({
			name: 'Deleted User',
			email: buildDeletedEmail(userId),
			emailVerified: false,
			image: null,
			role: 'contributor',
			bio: null,
			avatarUrl: null,
			tribalAffiliation: null,
			location: null,
			newsletterOptIn: false
		})
		.where(eq(user.id, userId));

	return request;
}

export async function createContentPrivacyRequest(args: {
	userId: string;
	requestType: Extract<
		PrivacyRequestType,
		'correct_content' | 'remove_content' | 'opt_out_marketing'
	>;
	subject: string;
	message: string;
	contentUrl?: string;
}) {
	return createPrivacyRequest({
		userId: args.userId,
		requestType: args.requestType,
		subject: args.subject,
		details: {
			message: args.message,
			contentUrl: args.contentUrl ?? null
		}
	});
}
