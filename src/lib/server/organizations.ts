import { eq, ilike, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organizations } from '$lib/server/db/schema';

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;

function slugify(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'org'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

export async function getOrganizations(opts?: {
	search?: string;
	page?: number;
	limit?: number;
}): Promise<{ orgs: OrganizationRow[]; total: number }> {
	const page = opts?.page ?? 1;
	const limit = opts?.limit ?? 50;
	const offset = (page - 1) * limit;

	const where = opts?.search ? ilike(organizations.name, `%${opts.search}%`) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizations)
		.where(where);
	const total = countResult?.count ?? 0;

	const orgs = await db
		.select()
		.from(organizations)
		.where(where)
		.orderBy(desc(organizations.updatedAt))
		.limit(limit)
		.offset(offset);

	return { orgs, total };
}

export async function getOrganizationById(id: string): Promise<OrganizationRow | null> {
	const [row] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
	return row ?? null;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRow | null> {
	const [row] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
	return row ?? null;
}

export async function getAllOrganizations(): Promise<OrganizationRow[]> {
	return db.select().from(organizations).orderBy(organizations.name);
}

export async function createOrganization(
	data: Omit<OrganizationInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
): Promise<OrganizationRow> {
	const slug = await uniqueSlug(slugify(data.name));
	const [row] = await db
		.insert(organizations)
		.values({ ...data, slug })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	return row;
}

export async function updateOrganization(
	id: string,
	data: Partial<Omit<OrganizationInsert, 'id' | 'createdAt'>>
): Promise<OrganizationRow | null> {
	const [row] = await db
		.update(organizations)
		.set(data)
		.where(eq(organizations.id, id))
		.returning();
	return row ?? null;
}

export async function deleteOrganization(id: string): Promise<boolean> {
	const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
	return result.length > 0;
}
