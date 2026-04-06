import { and, eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { account as accountTable, user as userTable } from '$lib/server/db/auth.schema';
import { GOOGLE_PROVIDER_ID } from '$lib/server/social-auth';

type LinkedGoogleAccount = {
	accountId: string;
};

type UserProfile = {
	name: string;
	image: string | null;
};

type GoogleAccountInfo = {
	user?: {
		name?: string | null;
		image?: string | null;
	};
};

type GoogleProfileDeps = {
	findLinkedGoogleAccount: (userId: string) => Promise<LinkedGoogleAccount | null>;
	getUserProfile: (userId: string) => Promise<UserProfile | null>;
	getGoogleAccountInfo: (accountId: string, headers: Headers) => Promise<GoogleAccountInfo>;
	updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
};

const defaultDeps: GoogleProfileDeps = {
	findLinkedGoogleAccount,
	getUserProfile: async (userId) => {
		const [profile] = await db
			.select({ name: userTable.name, image: userTable.image })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);

		return profile ?? null;
	},
	getGoogleAccountInfo: async (accountId, headers) =>
		auth.api.accountInfo({
			query: { accountId },
			headers
		}) as Promise<GoogleAccountInfo>,
	updateUserProfile: async (userId, updates) => {
		await db.update(userTable).set(updates).where(eq(userTable.id, userId));
	}
};

export async function findLinkedGoogleAccount(userId: string): Promise<LinkedGoogleAccount | null> {
	const [account] = await db
		.select({ accountId: accountTable.accountId })
		.from(accountTable)
		.where(and(eq(accountTable.userId, userId), eq(accountTable.providerId, GOOGLE_PROVIDER_ID)))
		.limit(1);

	return account ?? null;
}

export async function backfillGoogleProfile(
	userId: string,
	headers: Headers,
	deps: GoogleProfileDeps = defaultDeps
): Promise<{ linked: boolean; updated: boolean }> {
	const linkedAccount = await deps.findLinkedGoogleAccount(userId);
	if (!linkedAccount) {
		return { linked: false, updated: false };
	}

	const [profile, googleAccountInfo] = await Promise.all([
		deps.getUserProfile(userId),
		deps.getGoogleAccountInfo(linkedAccount.accountId, headers).catch(() => null)
	]);

	if (!profile || !googleAccountInfo?.user) {
		return { linked: true, updated: false };
	}

	const googleName = googleAccountInfo.user.name?.trim() ?? '';
	const googleImage = googleAccountInfo.user.image?.trim() ?? '';

	const updates: Partial<UserProfile> = {};

	if (!profile.name.trim() && googleName) {
		updates.name = googleName;
	}

	if (!profile.image?.trim() && googleImage) {
		updates.image = googleImage;
	}

	if (Object.keys(updates).length === 0) {
		return { linked: true, updated: false };
	}

	await deps.updateUserProfile(userId, updates);
	return { linked: true, updated: true };
}
