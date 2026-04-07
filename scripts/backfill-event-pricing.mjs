#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const db = postgres(DATABASE_URL);

const pricingUpdates = [
	{
		slug: 'native-americans-in-philanthropy-s-2026-annual-conference',
		cost: 'Registration required',
		priceMin: null,
		priceMax: null,
		pricingTiers: []
	},
	{
		slug: 'garden-box-workshop',
		cost: 'Registration required',
		priceMin: null,
		priceMax: null,
		pricingTiers: []
	},
	{
		slug: 'agave-roast-native-food-tasting-event-at-malki-museum',
		cost: 'Free',
		priceMin: 0,
		priceMax: 15,
		pricingTiers: [
			{ label: 'Event admission', price: 0, sortOrder: 0 },
			{ label: 'Suggested donation per food plate', price: 15, sortOrder: 1 }
		]
	},
	{
		slug: 'comic-creation',
		cost: 'Paid',
		priceMin: 40,
		priceMax: 40,
		pricingTiers: [{ label: 'Per child', price: 40, sortOrder: 0 }]
	},
	{
		slug: 'yoom-n-a-celebration-of-spring',
		cost: 'Free',
		priceMin: 0,
		priceMax: 0,
		pricingTiers: [{ label: 'Public admission', price: 0, sortOrder: 0 }]
	},
	{
		slug: 'indigenous-stories-film-festival-and-art-walk',
		cost: 'Registration required',
		priceMin: null,
		priceMax: null,
		pricingTiers: []
	},
	{
		slug: '51st-cupa-days',
		cost: 'Free',
		priceMin: 0,
		priceMax: 0,
		pricingTiers: [{ label: 'Public admission', price: 0, sortOrder: 0 }]
	},
	{
		slug: 'drop-in-days-at-agua-caliente-cultural-museum',
		cost: 'Museum admission',
		priceMin: 5,
		priceMax: 10,
		pricingTiers: [
			{ label: 'Adult', price: 10, sortOrder: 0 },
			{ label: 'Senior (65+)', price: 5, sortOrder: 1 },
			{ label: 'Student', price: 5, sortOrder: 2 },
			{ label: 'Child (6-17)', price: 5, sortOrder: 3 },
			{ label: 'Coachella Valley local adult', price: 8, sortOrder: 4 },
			{ label: 'Child under 6', price: 0, sortOrder: 5 },
			{ label: 'Native Americans with Tribal ID', price: 0, sortOrder: 6 },
			{ label: 'Military and veterans', price: 0, sortOrder: 7 }
		]
	},
	{
		slug: 'native-arts-festival',
		cost: 'Free',
		priceMin: 0,
		priceMax: 0,
		pricingTiers: [{ label: 'Public admission', price: 0, sortOrder: 0 }]
	},
	{
		slug: 'elderberry-clapper-stick-workshop',
		cost: 'Paid',
		priceMin: 55,
		priceMax: 55,
		pricingTiers: [{ label: 'Per participant', price: 55, sortOrder: 0 }]
	},
	{
		slug: 'future-imaginaries-indigenous-art-fashion-technology',
		cost: 'Museum admission',
		priceMin: 9,
		priceMax: 20,
		pricingTiers: [
			{ label: 'Adult', price: 20, sortOrder: 0 },
			{ label: 'Student or senior', price: 15, sortOrder: 1 },
			{ label: 'Child (3-12)', price: 9, sortOrder: 2 },
			{ label: 'Autry member', price: 0, sortOrder: 3 },
			{ label: 'Active-duty military or veteran', price: 0, sortOrder: 4 },
			{ label: 'Child 2 and under', price: 0, sortOrder: 5 }
		]
	},
	{
		slug: 'mom-m-wen-medicine-water-flowing-through-indian-country',
		cost: 'Museum admission',
		priceMin: 5,
		priceMax: 15,
		pricingTiers: [
			{ label: 'Individual', price: 7, sortOrder: 0 },
			{ label: 'Senior or student', price: 5, sortOrder: 1 },
			{ label: 'Family', price: 15, sortOrder: 2 },
			{ label: 'Native American admission', price: 0, sortOrder: 3 },
			{ label: 'Standing military', price: 0, sortOrder: 4 },
			{ label: 'Member', price: 0, sortOrder: 5 }
		]
	},
	{
		slug: 'raymond-lebeau-field-s-of-view',
		cost: 'Museum admission',
		priceMin: 5,
		priceMax: 15,
		pricingTiers: [
			{ label: 'Opening reception', price: 0, sortOrder: 0 },
			{ label: 'Individual', price: 7, sortOrder: 1 },
			{ label: 'Senior or student', price: 5, sortOrder: 2 },
			{ label: 'Family', price: 15, sortOrder: 3 },
			{ label: 'Native American admission', price: 0, sortOrder: 4 },
			{ label: 'Standing military', price: 0, sortOrder: 5 },
			{ label: 'Member', price: 0, sortOrder: 6 }
		]
	}
];

async function updatePricing(update) {
	const rows = await db`
		update events
		set
			cost = ${update.cost},
			price_min = ${update.priceMin},
			price_max = ${update.priceMax},
			pricing_tiers = ${db.json(update.pricingTiers ?? [])}::jsonb,
			updated_at = now()
		where slug = ${update.slug}
		returning slug, title, cost, price_min, price_max, pricing_tiers
	`;

	if (!rows[0]) {
		throw new Error(`No event row matched slug: ${update.slug}`);
	}

	return rows[0];
}

async function main() {
	for (const update of pricingUpdates) {
		const row = await updatePricing(update);
		console.log(
			`${row.slug}: cost=${row.cost ?? 'null'} min=${row.price_min ?? 'null'} max=${row.price_max ?? 'null'} tiers=${Array.isArray(row.pricing_tiers) ? row.pricing_tiers.length : 0}`
		);
	}

	console.log(`\nBackfilled pricing for ${pricingUpdates.length} events.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.end();
	});
