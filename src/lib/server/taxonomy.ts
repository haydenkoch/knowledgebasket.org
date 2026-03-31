/**
 * Taxonomy CRUD: tags and options (regions, audiences, cost) for events.
 */
import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { taxonomyTags, taxonomyOptions } from '$lib/server/db/schema';

export type TaxonomyTag = typeof taxonomyTags.$inferSelect;
export type TaxonomyTagInsert = typeof taxonomyTags.$inferInsert;
export type TaxonomyOption = typeof taxonomyOptions.$inferSelect;
export type TaxonomyOptionInsert = typeof taxonomyOptions.$inferInsert;

function slugify(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

// ── Tags ───────────────────────────────────────────────────
export async function getTags(filters?: { group?: string }): Promise<TaxonomyTag[]> {
	let q = db.select().from(taxonomyTags).orderBy(asc(taxonomyTags.sortOrder), asc(taxonomyTags.label));
	if (filters?.group) {
		q = q.where(eq(taxonomyTags.group, filters.group)) as typeof q;
	}
	return q;
}

export async function getTagById(id: string): Promise<TaxonomyTag | null> {
	const rows = await db.select().from(taxonomyTags).where(eq(taxonomyTags.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function getTagBySlug(slug: string): Promise<TaxonomyTag | null> {
	const rows = await db.select().from(taxonomyTags).where(eq(taxonomyTags.slug, slug)).limit(1);
	return rows[0] ?? null;
}

async function uniqueTagSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	for (;;) {
		const existing = await db.select().from(taxonomyTags).where(eq(taxonomyTags.slug, slug)).limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

export async function createTag(
	data: Omit<TaxonomyTagInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
): Promise<TaxonomyTag> {
	const slug = await uniqueTagSlug(slugify(data.label));
	const [row] = await db
		.insert(taxonomyTags)
		.values({
			...data,
			slug
		})
		.returning();
	if (!row) throw new Error('Failed to create tag');
	return row;
}

export async function updateTag(
	id: string,
	data: Partial<Omit<TaxonomyTagInsert, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TaxonomyTag | null> {
	const [row] = await db.update(taxonomyTags).set(data).where(eq(taxonomyTags.id, id)).returning();
	return row ?? null;
}

export async function deleteTag(id: string): Promise<boolean> {
	const result = await db.delete(taxonomyTags).where(eq(taxonomyTags.id, id));
	return (result.rowCount ?? 0) > 0;
}

// ── Options (region, audience, cost) ─────────────────────
export async function getOptions(key: string): Promise<TaxonomyOption[]> {
	return db
		.select()
		.from(taxonomyOptions)
		.where(eq(taxonomyOptions.key, key))
		.orderBy(asc(taxonomyOptions.sortOrder), asc(taxonomyOptions.label));
}

export async function getAllOptions(): Promise<TaxonomyOption[]> {
	return db.select().from(taxonomyOptions).orderBy(asc(taxonomyOptions.key), asc(taxonomyOptions.sortOrder));
}

export async function getOptionById(id: string): Promise<TaxonomyOption | null> {
	const rows = await db.select().from(taxonomyOptions).where(eq(taxonomyOptions.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function createOption(
	data: Omit<TaxonomyOptionInsert, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TaxonomyOption> {
	const [row] = await db.insert(taxonomyOptions).values(data).returning();
	if (!row) throw new Error('Failed to create option');
	return row;
}

export async function updateOption(
	id: string,
	data: Partial<Omit<TaxonomyOptionInsert, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TaxonomyOption | null> {
	const [row] = await db.update(taxonomyOptions).set(data).where(eq(taxonomyOptions.id, id)).returning();
	return row ?? null;
}

export async function deleteOption(id: string): Promise<boolean> {
	const result = await db.delete(taxonomyOptions).where(eq(taxonomyOptions.id, id));
	return (result.rowCount ?? 0) > 0;
}
