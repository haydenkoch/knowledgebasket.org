import { eq, ilike, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { venues } from '$lib/server/db/schema';

export type VenueRow = typeof venues.$inferSelect;
export type VenueInsert = typeof venues.$inferInsert;

function slugify(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'venue'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const existing = await db
			.select({ id: venues.id })
			.from(venues)
			.where(eq(venues.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

export async function getVenues(opts?: {
	search?: string;
	page?: number;
	limit?: number;
}): Promise<{ venues: VenueRow[]; total: number }> {
	const page = opts?.page ?? 1;
	const limit = opts?.limit ?? 50;
	const offset = (page - 1) * limit;

	const where = opts?.search ? ilike(venues.name, `%${opts.search}%`) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(venues)
		.where(where);
	const total = countResult?.count ?? 0;

	const rows = await db
		.select()
		.from(venues)
		.where(where)
		.orderBy(desc(venues.updatedAt))
		.limit(limit)
		.offset(offset);

	return { venues: rows, total };
}

export async function getVenueById(id: string): Promise<VenueRow | null> {
	const [row] = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
	return row ?? null;
}

export async function getVenueBySlug(slug: string): Promise<VenueRow | null> {
	const [row] = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
	return row ?? null;
}

export async function getAllVenues(): Promise<VenueRow[]> {
	return db.select().from(venues).orderBy(venues.name);
}

export async function createVenue(
	data: Omit<VenueInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
): Promise<VenueRow> {
	const slug = await uniqueSlug(slugify(data.name));
	const [row] = await db
		.insert(venues)
		.values({ ...data, slug })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	return row;
}

export async function updateVenue(
	id: string,
	data: Partial<Omit<VenueInsert, 'id' | 'createdAt'>>
): Promise<VenueRow | null> {
	const [row] = await db.update(venues).set(data).where(eq(venues.id, id)).returning();
	return row ?? null;
}

export async function deleteVenue(id: string): Promise<boolean> {
	const result = await db.delete(venues).where(eq(venues.id, id)).returning();
	return result.length > 0;
}
