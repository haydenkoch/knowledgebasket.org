#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const db = postgres(DATABASE_URL);

const venueDefinitions = [
	{
		slug: 'autry-museum-of-the-american-west',
		name: 'Autry Museum of the American West',
		aliases: ['Autry Museum'],
		address: '4700 Western Heritage Way',
		city: 'Los Angeles',
		state: 'CA',
		zip: '90027',
		website: 'https://theautry.org/visit',
		venueType: 'Museum',
		locationLabel: 'Autry Museum of the American West, Los Angeles, CA',
		eventSlugs: ['future-imaginaries-indigenous-art-fashion-technology']
	},
	{
		slug: 'de-young-museum',
		name: 'de Young Museum',
		aliases: ['de Young', 'M. H. de Young Memorial Museum'],
		address: '50 Hagiwara Tea Garden Dr',
		city: 'San Francisco',
		state: 'CA',
		zip: '94118',
		website: 'https://www.famsf.org/visit/de-young',
		venueType: 'Museum',
		locationLabel: 'de Young Museum, San Francisco, CA',
		eventSlugs: ['rooted-in-place-california-native-art', 'rose-b-simpson-lexicon']
	},
	{
		slug: 'oakland-museum-of-california',
		name: 'Oakland Museum of California',
		aliases: ['OMCA'],
		address: '1000 Oak St',
		city: 'Oakland',
		state: 'CA',
		zip: '94607',
		website: 'https://museumca.org/',
		venueType: 'Museum',
		locationLabel: 'Oakland Museum of California, Oakland, CA',
		eventSlugs: ['good-fire-tending-native-lands']
	},
	{
		slug: 'grace-hudson-museum-sun-house',
		name: 'Grace Hudson Museum & Sun House',
		address: '431 S Main St',
		city: 'Ukiah',
		state: 'CA',
		zip: '95482',
		website: 'https://www.gracehudsonmuseum.org/',
		venueType: 'Museum',
		locationLabel: 'Grace Hudson Museum & Sun House, Ukiah, CA',
		eventSlugs: ['mom-m-wen-medicine-water-flowing-through-indian-country']
	},
	{
		slug: 'maidu-museum-historic-site',
		name: 'Maidu Museum & Historic Site',
		aliases: ['Maidu Museum and Historic Site', 'Maidu Museum'],
		address: '1970 Johnson Ranch Dr',
		city: 'Roseville',
		state: 'CA',
		zip: '95661',
		website:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site',
		venueType: 'Museum',
		locationLabel: 'Maidu Museum & Historic Site, Roseville, CA',
		eventSlugs: ['raymond-lebeau-field-s-of-view', 'yoom-n-a-celebration-of-spring']
	},
	{
		slug: 'maidu-activity-center',
		name: 'Maidu Activity Center',
		address: '1960 Johnson Ranch Dr',
		city: 'Roseville',
		state: 'CA',
		zip: '95661',
		website:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/events_exhibits',
		venueType: 'Community Center',
		locationLabel: 'Maidu Activity Center, Roseville, CA',
		eventSlugs: ['comic-creation', 'elderberry-clapper-stick-workshop']
	},
	{
		slug: 'choinumni-park',
		name: 'Choinumni Park',
		address: '26501 Pine Flat Rd',
		city: 'Sanger',
		state: 'CA',
		zip: '93657',
		venueType: 'Park',
		locationLabel: 'Choinumni Park, Sanger, CA',
		eventSlugs: ['cultural-protocols-community-response-community-gathering']
	},
	{
		slug: 'arcadia-county-park',
		name: 'Arcadia County Park',
		aliases: ['Arcadia Community Regional Park'],
		address: '405 S Santa Anita Ave',
		city: 'Arcadia',
		state: 'CA',
		zip: '91006',
		website: 'https://parks.lacounty.gov/arcadia-community-regional-park/',
		venueType: 'Park',
		locationLabel: 'Arcadia County Park, Arcadia, CA',
		eventSlugs: ['carmel-band-of-rumsen-indians-community-gathering-and-powwow']
	},
	{
		slug: 'sherman-indian-high-school',
		name: 'Sherman Indian High School',
		address: '9010 Magnolia Ave',
		city: 'Riverside',
		state: 'CA',
		zip: '92503',
		website: 'https://sih.bie.edu/',
		venueType: 'School',
		locationLabel: 'Sherman Indian High School, Riverside, CA',
		eventSlugs: ['sherman-indian-school-powwow']
	},
	{
		slug: 'del-norte-indian-education-center',
		name: 'Del Norte Indian Education Center',
		address: '888 4th St',
		city: 'Crescent City',
		state: 'CA',
		zip: '95531',
		website: 'https://ncidc.org/',
		venueType: 'Education Center',
		locationLabel: 'Del Norte Indian Education Center, Crescent City, CA',
		eventSlugs: ['garden-box-workshop']
	},
	{
		slug: 'malki-museum',
		name: 'Malki Museum',
		address: '11795 Malki Rd, Morongo Reservation',
		city: 'Banning',
		state: 'CA',
		zip: '92220',
		website: 'https://malkimuseum.org/',
		venueType: 'Museum',
		locationLabel: 'Malki Museum, Morongo Reservation, Banning, CA',
		addressLabel: '11795 Malki Rd, Morongo Reservation, Banning, CA 92220',
		eventSlugs: ['agave-roast-native-food-tasting-event-at-malki-museum']
	},
	{
		slug: 'rincon-government-center',
		name: 'Rincon Government Center',
		address: '1 Government Center Ln',
		city: 'Valley Center',
		state: 'CA',
		zip: '92082',
		website: 'https://www.indianhealth.com/',
		venueType: 'Government Center',
		locationLabel: 'Rincon Government Center, Valley Center, CA',
		eventSlugs: ['indigenous-stories-film-festival-and-art-walk']
	},
	{
		slug: 'wallis-annenberg-stadium',
		name: 'Wallis Annenberg Stadium',
		address: 'Wallis Annenberg Stadium',
		city: 'Los Angeles',
		state: 'CA',
		zip: '90095',
		website: 'https://uclabruins.com/facilities/wallis-annenberg-stadium/20',
		venueType: 'Stadium',
		locationLabel: 'Wallis Annenberg Stadium, Los Angeles, CA',
		addressLabel: 'Wallis Annenberg Stadium, Los Angeles, CA 90095',
		eventSlugs: ['41st-annual-ucla-powwow']
	},
	{
		slug: 'cupa-cultural-center-grounds',
		name: 'Cupa Cultural Center Grounds',
		address: '35008 Pala Temecula Rd',
		city: 'Pala',
		state: 'CA',
		zip: '92059',
		website: 'https://www.palatribe.com/',
		venueType: 'Cultural Center',
		locationLabel: 'Cupa Cultural Center Grounds, Pala, CA',
		eventSlugs: ['51st-cupa-days']
	},
	{
		slug: 'adorni-center',
		name: 'Adorni Center',
		address: '1011 Waterfront Dr',
		city: 'Eureka',
		state: 'CA',
		zip: '95501',
		website: 'https://www.eurekaca.gov/263/Adorni-Recreation-Center',
		venueType: 'Recreation Center',
		locationLabel: 'Adorni Center, Eureka, CA',
		eventSlugs: ['mmip-awareness-day-and-walk']
	},
	{
		slug: 'agua-caliente-cultural-museum',
		name: 'Agua Caliente Cultural Museum',
		address: '140 N Indian Canyon Dr',
		city: 'Palm Springs',
		state: 'CA',
		zip: '92262',
		website: 'https://www.accmuseum.org/',
		venueType: 'Museum',
		locationLabel: 'Agua Caliente Cultural Museum, Palm Springs, CA',
		eventSlugs: ['drop-in-days-at-agua-caliente-cultural-museum']
	},
	{
		slug: 'uc-davis',
		name: 'UC Davis',
		aliases: ['University of California, Davis'],
		address: '1 Shields Ave',
		city: 'Davis',
		state: 'CA',
		zip: '95616',
		website: 'https://www.ucdavis.edu/',
		venueType: 'Campus',
		locationLabel: 'UC Davis, Davis, CA',
		eventSlugs: ['4th-annual-california-indian-studies-conference-and-gathering']
	},
	{
		slug: 'windsor-town-green',
		name: 'Windsor Town Green',
		address: '701 McClelland Dr',
		city: 'Windsor',
		state: 'CA',
		zip: '95492',
		website: 'https://www.townofwindsor.com/Facilities',
		venueType: 'Town Green',
		locationLabel: 'Windsor Town Green, Windsor, CA',
		eventSlugs: ['native-arts-festival']
	},
	{
		slug: 'price-center-uc-san-diego',
		matchSlugs: ['9500-gilman-dr-la-jolla-ca-united-states'],
		name: 'Price Center, UC San Diego',
		aliases: ['Price Center'],
		address: '9500 Gilman Dr',
		city: 'La Jolla',
		state: 'CA',
		zip: '92093',
		website: 'https://universitycenters.ucsd.edu/',
		venueType: 'Student Center',
		locationLabel: 'Price Center, UC San Diego, La Jolla, CA',
		eventSlugs: ['uc-san-diego-14th-annual-powwow']
	}
];

function dedupe(values) {
	return Array.from(
		new Set(
			values
				.filter(Boolean)
				.map((value) => value.trim())
				.filter(Boolean)
		)
	);
}

function buildAddressLabel(definition) {
	if (definition.addressLabel) return definition.addressLabel;
	const cityStateZip = [
		definition.city,
		definition.state && definition.zip
			? `${definition.state} ${definition.zip}`
			: definition.state || definition.zip
	]
		.filter(Boolean)
		.join(', ');
	return [definition.address, cityStateZip].filter(Boolean).join(', ');
}

async function findVenue(definition) {
	for (const slug of dedupe([definition.slug, ...(definition.matchSlugs ?? [])])) {
		const rows = await db`
			select id, slug, name, aliases
			from venues
			where slug = ${slug}
			limit 1
		`;
		if (rows[0]) return rows[0];
	}

	const rows = await db`
		select id, slug, name, aliases
		from venues
		where lower(name) = lower(${definition.name})
		limit 1
	`;
	if (rows[0]) return rows[0];

	return null;
}

async function upsertVenue(definition) {
	const existing = await findVenue(definition);
	const aliases = dedupe([
		...(definition.aliases ?? []),
		...(existing?.aliases ?? []),
		existing && existing.name !== definition.name ? existing.name : null
	]);

	if (existing) {
		const rows = await db`
			update venues
			set
				slug = ${definition.slug},
				name = ${definition.name},
				aliases = ${aliases},
				address = ${definition.address ?? null},
				city = ${definition.city ?? null},
				state = ${definition.state ?? null},
				zip = ${definition.zip ?? null},
				website = ${definition.website ?? null},
				venue_type = ${definition.venueType ?? null},
				updated_at = now()
			where id = ${existing.id}
			returning id, slug, name
		`;
		return { row: rows[0], action: 'updated' };
	}

	const rows = await db`
		insert into venues (
			slug,
			name,
			aliases,
			address,
			city,
			state,
			zip,
			website,
			venue_type
		)
		values (
			${definition.slug},
			${definition.name},
			${aliases},
			${definition.address ?? null},
			${definition.city ?? null},
			${definition.state ?? null},
			${definition.zip ?? null},
			${definition.website ?? null},
			${definition.venueType ?? null}
		)
		returning id, slug, name
	`;

	return { row: rows[0], action: 'created' };
}

async function attachVenueToEvents(definition, venueId) {
	const locationLabel =
		definition.locationLabel ??
		[definition.name, definition.city, definition.state].filter(Boolean).join(', ');
	const addressLabel = buildAddressLabel(definition);

	for (const slug of definition.eventSlugs) {
		const rows = await db`
			update events
			set
				venue_id = ${venueId},
				location = ${locationLabel},
				address = ${addressLabel},
				updated_at = now()
			where slug = ${slug}
			returning slug, title
		`;

		if (rows.length === 0) {
			throw new Error(`No event row matched slug: ${slug}`);
		}

		console.log(`  linked ${rows[0].slug}`);
	}
}

async function main() {
	for (const definition of venueDefinitions) {
		const { row, action } = await upsertVenue(definition);
		console.log(`${action} venue ${row.slug}`);
		await attachVenueToEvents(definition, row.id);
	}

	console.log(`\nStandardized ${venueDefinitions.length} canonical venues for upcoming events.`);
}

main()
	.catch(async (error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.end();
	});
