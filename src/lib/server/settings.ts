/**
 * Site settings (branding, etc.) key-value store.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { siteSettings } from '$lib/server/db/schema';

export async function getSetting(key: string): Promise<string | null> {
	const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
	return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
	await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({
		target: siteSettings.key,
		set: { value }
	});
}

export const BRAND_LOGO_KEY = 'brand_logo_url';
export const BRAND_FAVICON_KEY = 'brand_favicon_url';
