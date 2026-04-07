#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';
import { load } from 'cheerio';
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketPolicyCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';

const {
	DATABASE_URL,
	MINIO_ENDPOINT,
	MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY,
	MINIO_BUCKET,
	PUBLIC_ASSET_BASE_URL
} = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

if (
	!MINIO_ENDPOINT ||
	!MINIO_ACCESS_KEY ||
	!MINIO_SECRET_KEY ||
	!MINIO_BUCKET ||
	!PUBLIC_ASSET_BASE_URL
) {
	console.error(
		'MinIO env vars not set. Need: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, PUBLIC_ASSET_BASE_URL'
	);
	process.exit(1);
}

const db = postgres(DATABASE_URL);
const s3 = new S3Client({
	region: 'us-east-1',
	endpoint: MINIO_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: MINIO_ACCESS_KEY,
		secretAccessKey: MINIO_SECRET_KEY
	}
});

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';

const imageCache = new Map();
const pageCache = new Map();

function slugify(value) {
	return (
		value
			.toLowerCase()
			.trim()
			.replace(/&/g, ' and ')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.replace(/-{2,}/g, '-') || 'event'
	);
}

function cleanText(value) {
	return String(value ?? '')
		.replace(/\u00a0/g, ' ')
		.replace(/&#8211;/g, '-')
		.replace(/&#8212;/g, '-')
		.replace(/&#8216;/g, "'")
		.replace(/&#8217;/g, "'")
		.replace(/&#8220;/g, '"')
		.replace(/&#8221;/g, '"')
		.replace(/&#038;/g, '&')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();
}

function paragraphsToHtml(paragraphs) {
	return paragraphs.filter(Boolean).map((paragraph) => `<p>${paragraph}</p>`).join('\n');
}

function resolveUrl(base, value) {
	if (!value || typeof value !== 'string') return null;
	try {
		return new URL(value, base).toString();
	} catch {
		return null;
	}
}

function buildPublicBucketPolicy(bucket) {
	return JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Sid: 'PublicReadGetObject',
				Effect: 'Allow',
				Principal: '*',
				Action: ['s3:GetObject'],
				Resource: [`arn:aws:s3:::${bucket}/*`]
			}
		]
	});
}

async function ensureBucket() {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
		console.log(`Created bucket: ${MINIO_BUCKET}`);
	}

	await s3.send(
		new PutBucketPolicyCommand({
			Bucket: MINIO_BUCKET,
			Policy: buildPublicBucketPolicy(MINIO_BUCKET)
		})
	);
}

function extensionFrom(contentType, url) {
	if (contentType?.includes('png')) return '.png';
	if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return '.jpg';
	if (contentType?.includes('webp')) return '.webp';

	try {
		const pathname = new URL(url).pathname.toLowerCase();
		if (pathname.endsWith('.png')) return '.png';
		if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
		if (pathname.endsWith('.webp')) return '.webp';
	} catch {
		// ignore URL parsing issues
	}

	return '.jpg';
}

function contentTypeFrom(extension, responseType) {
	if (responseType?.startsWith('image/')) return responseType;
	switch (extension) {
		case '.png':
			return 'image/png';
		case '.webp':
			return 'image/webp';
		default:
			return 'image/jpeg';
	}
}

function buildPublicUrl(objectKey) {
	const base = PUBLIC_ASSET_BASE_URL.replace(/\/+$/, '');
	return `${base}/${objectKey}`;
}

function isMeaningfulImageUrl(url) {
	if (!url || typeof url !== 'string') return false;
	if (url.startsWith('data:')) return false;

	const lower = url.toLowerCase();
	if (
		lower.includes('favicon') ||
		lower.includes('/logo') ||
		lower.includes('logo-') ||
		lower.includes('-logo') ||
		lower.includes('site-icon') ||
		lower.includes('icon-') ||
		lower.includes('apple-touch-icon')
	) {
		return false;
	}

	return /^https?:\/\//.test(url);
}

async function uploadRemoteImage(slug, sourceUrl) {
	if (!isMeaningfulImageUrl(sourceUrl)) return null;
	if (imageCache.has(sourceUrl)) return imageCache.get(sourceUrl);

	const response = await fetch(sourceUrl, {
		redirect: 'follow',
		headers: { 'user-agent': USER_AGENT }
	});

	if (!response.ok) {
		throw new Error(`Image download failed (${response.status}) for ${sourceUrl}`);
	}

	const responseType = response.headers.get('content-type') ?? '';
	const extension = extensionFrom(responseType, response.url || sourceUrl);
	const contentType = contentTypeFrom(extension, responseType);
	const objectKey = `events/official-native/${slug}${extension}`;
	const body = Buffer.from(await response.arrayBuffer());

	await s3.send(
		new PutObjectCommand({
			Bucket: MINIO_BUCKET,
			Key: objectKey,
			Body: body,
			ContentType: contentType,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	const publicUrl = buildPublicUrl(objectKey);
	imageCache.set(sourceUrl, publicUrl);
	return publicUrl;
}

async function fetchHtml(url) {
	const response = await fetch(url, {
		redirect: 'follow',
		headers: {
			'user-agent': USER_AGENT,
			accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
		}
	});

	if (!response.ok) {
		throw new Error(`HTML fetch failed (${response.status}) for ${url}`);
	}

	return response.text();
}

async function fetchJson(url) {
	const response = await fetch(url, {
		redirect: 'follow',
		headers: {
			'user-agent': USER_AGENT,
			accept: 'application/json,text/plain;q=0.9,*/*;q=0.8'
		}
	});

	if (!response.ok) {
		throw new Error(`JSON fetch failed (${response.status}) for ${url}`);
	}

	return response.json();
}

function firstMeaningfulLink($, $root, pageUrl) {
	let registrationUrl = null;

	$root.find('a[href]').each((_, anchor) => {
		if (registrationUrl) return;
		const href = resolveUrl(pageUrl, $(anchor).attr('href'));
		if (!href) return;
		const text = cleanText($(anchor).text()).toLowerCase();
		if (
			text.includes('register') ||
			text.includes('sign up') ||
			text.includes('rsvp') ||
			text.includes('ticket') ||
			text.includes('purchase') ||
			text.includes('reserve') ||
			href.includes('eventbrite.com') ||
			href.includes('forms.office.com') ||
			href.includes('docs.google.com/forms') ||
			href.includes('/tickets.') ||
			href.includes('/Performance.aspx') ||
			href.includes('/PatronEducation.aspx')
		) {
			registrationUrl = href;
		}
	});

	return registrationUrl;
}

function sanitizeDescriptionHtml(rawHtml, pageUrl) {
	if (!rawHtml) return { html: null, registrationUrl: null };

	const $ = load(`<div id="root">${rawHtml}</div>`);
	const $root = $('#root');

	$root.find('script, style, iframe, noscript, form').remove();
	let registrationUrl = firstMeaningfulLink($, $root, pageUrl);

	$root.find('p, li, div').each((_, element) => {
		const $element = $(element);
		const text = cleanText($element.text());
		if (!text) {
			$element.remove();
			return;
		}

		if (
			/@/.test(text) ||
			/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(text) ||
			/^for more information/i.test(text) ||
			/^contact\b/i.test(text) ||
			/^phone\b/i.test(text) ||
			/^email\b/i.test(text)
		) {
			$element.remove();
		}
	});

	$root.find('*').each((_, element) => {
		const $element = $(element);
		for (const attr of Object.keys(element.attribs ?? {})) {
			if (!['href', 'target', 'rel'].includes(attr)) {
				$element.removeAttr(attr);
			}
		}
	});

	$root.find('a[href]').each((_, anchor) => {
		const $anchor = $(anchor);
		const href = resolveUrl(pageUrl, $anchor.attr('href'));
		if (!href) {
			$anchor.replaceWith($anchor.text());
			return;
		}
		$anchor.attr('href', href);
		$anchor.attr('target', '_blank');
		$anchor.attr('rel', 'noreferrer');
	});

	const html = $root.html()?.trim() ?? null;
	return {
		html: html && html !== '<br>' ? html : null,
		registrationUrl
	};
}

function walkJson(value, collector) {
	if (Array.isArray(value)) {
		for (const item of value) walkJson(item, collector);
		return;
	}

	if (!value || typeof value !== 'object') return;
	collector(value);
	for (const nested of Object.values(value)) walkJson(nested, collector);
}

function extractEventJsonLd($) {
	let eventObject = null;

	$('script[type="application/ld+json"]').each((_, script) => {
		if (eventObject) return;
		const raw = $(script).contents().text().trim();
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw);
			walkJson(parsed, (candidate) => {
				if (eventObject) return;
				const type = candidate?.['@type'];
				const types = Array.isArray(type) ? type : [type];
				if (types.some((item) => String(item).toLowerCase() === 'event')) {
					eventObject = candidate;
				}
			});
		} catch {
			// ignore malformed json-ld
		}
	});

	return eventObject;
}

function extractJsonLdImage(eventObject, pageUrl) {
	const image = eventObject?.image;
	if (typeof image === 'string') return resolveUrl(pageUrl, image);
	if (Array.isArray(image)) {
		for (const item of image) {
			if (typeof item === 'string') return resolveUrl(pageUrl, item);
			if (item?.url) return resolveUrl(pageUrl, item.url);
		}
	}
	if (image?.url) return resolveUrl(pageUrl, image.url);
	return null;
}

async function fetchPageDetails(url) {
	if (pageCache.has(url)) return pageCache.get(url);

	const html = await fetchHtml(url);
	const $ = load(html);
	const eventJsonLd = extractEventJsonLd($);
	const registrationUrl = firstMeaningfulLink($, $('main, article, body').first(), url);
	const imageSourceUrl =
		resolveUrl(url, $('meta[property="og:image"]').attr('content')) ??
		resolveUrl(url, $('meta[name="twitter:image"]').attr('content')) ??
		extractJsonLdImage(eventJsonLd, url) ??
		resolveUrl(url, $('main img').first().attr('src')) ??
		resolveUrl(url, $('article img').first().attr('src')) ??
		resolveUrl(url, $('img').first().attr('src')) ??
		null;

	const value = {
		html,
		$,
		eventJsonLd,
		registrationUrl,
		imageSourceUrl: isMeaningfulImageUrl(imageSourceUrl) ? imageSourceUrl : null
	};

	pageCache.set(url, value);
	return value;
}

async function safeFetchPageDetails(url) {
	try {
		return await fetchPageDetails(url);
	} catch (error) {
		console.warn(`Skipping page scrape for ${url}: ${error.message}`);
		const $ = load('<main></main>');
		return {
			html: null,
			$,
			eventJsonLd: null,
			registrationUrl: null,
			imageSourceUrl: null
		};
	}
}

async function fetchYbgEventDetails(url) {
	const page = await fetchPageDetails(url);
	const apiHref = page.$('link[rel="alternate"][href*="/wp-json/tribe/events/v1/events/"]').attr('href');
	if (!apiHref) return null;

	const payload = await fetchJson(apiHref);
	const sanitized = sanitizeDescriptionHtml(payload.description ?? null, url);
	return {
		title: cleanText(payload.title),
		descriptionHtml: sanitized.html,
		registrationUrl: sanitized.registrationUrl ?? page.registrationUrl,
		imageSourceUrl: payload.image?.url ?? page.imageSourceUrl,
		startDate: payload.start_date ? new Date(`${payload.start_date.replace(' ', 'T')}-07:00`) : null,
		endDate: payload.end_date ? new Date(`${payload.end_date.replace(' ', 'T')}-07:00`) : null,
		cost: cleanText(payload.cost) || null
	};
}

function buildLocationLabel(venue) {
	return [venue.name, venue.city, venue.state].filter(Boolean).join(', ');
}

function buildAddressLabel(venue) {
	const cityStateZip = [
		venue.city,
		venue.state && venue.zip ? `${venue.state} ${venue.zip}` : venue.state || venue.zip
	]
		.filter(Boolean)
		.join(', ');
	return [venue.address, cityStateZip].filter(Boolean).join(', ');
}

async function upsertOrganization(definition) {
	const rows = await db`
		insert into organizations (
			slug,
			name,
			aliases,
			description,
			website,
			org_type,
			region,
			city,
			state
		)
		values (
			${definition.slug},
			${definition.name},
			${[]},
			${definition.description ?? null},
			${definition.website ?? null},
			${definition.orgType ?? null},
			${definition.region ?? null},
			${definition.city ?? null},
			${definition.state ?? null}
		)
		on conflict (slug) do update
		set
			name = excluded.name,
			description = coalesce(excluded.description, organizations.description),
			website = coalesce(excluded.website, organizations.website),
			org_type = coalesce(excluded.org_type, organizations.org_type),
			region = coalesce(excluded.region, organizations.region),
			city = coalesce(excluded.city, organizations.city),
			state = coalesce(excluded.state, organizations.state),
			updated_at = now()
		returning id, slug, name
	`;

	return rows[0];
}

async function upsertVenue(definition, organizationId) {
	if (!definition?.name) return null;

	const slug = slugify([definition.name, definition.city, definition.state].filter(Boolean).join(' '));
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
			venue_type,
			organization_id
		)
		values (
			${slug},
			${definition.name},
			${[]},
			${definition.address ?? null},
			${definition.city ?? null},
			${definition.state ?? null},
			${definition.zip ?? null},
			${definition.website ?? null},
			${definition.venueType ?? null},
			${organizationId}
		)
		on conflict (slug) do update
		set
			name = excluded.name,
			address = coalesce(excluded.address, venues.address),
			city = coalesce(excluded.city, venues.city),
			state = coalesce(excluded.state, venues.state),
			zip = coalesce(excluded.zip, venues.zip),
			website = coalesce(excluded.website, venues.website),
			venue_type = coalesce(excluded.venue_type, venues.venue_type),
			organization_id = coalesce(venues.organization_id, excluded.organization_id),
			updated_at = now()
		returning id, slug, name, address, city, state, zip
	`;

	return rows[0];
}

const OFFICIAL_EVENTS = [
	{
		slug: '80-years-of-native-american-arts-a-program-dedicated-to-indigenous-artistic-excellence',
		title: '80 Years of Native American Arts - A Program Dedicated to Indigenous Artistic Excellence | Spring Michael Kabotie Lecture Series',
		url: 'https://idyllwildarts.org/event/80-years-of-native-american-arts-a-program-dedicated-to-indigenous-artistic-excellence-spring-michael-kabotie-lecture-series/',
		type: 'Lecture',
		region: 'Southern California',
		startDate: new Date('2026-01-22T19:00:00-08:00'),
		endDate: new Date('2026-01-22T19:30:00-08:00'),
		cost: null,
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'idyllwild-arts-native-american-arts-center',
			name: 'Idyllwild Arts Native American Arts Center',
			website: 'https://idyllwildarts.org/nativeamericanarts/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Idyllwild',
			state: 'CA'
		},
		venue: {
			name: 'Birchard, Idyllwild Arts',
			address: '52500 Temecula Road #38',
			city: 'Idyllwild',
			state: 'CA',
			zip: '92549',
			venueType: 'Campus Space'
		}
	},
	{
		slug: 'mapping-genocide-project-elevating-untold-stories-and-native-resilience-through-art-and-placekeeping-in-yelamu',
		title:
			'Mapping Genocide Project: Elevating Untold Stories & Native Resilience Through Art & Placekeeping in Yelamu',
		url: 'https://americanindianculturaldistrict.org/events',
		type: 'Panel',
		region: 'Bay Area',
		startDate: new Date('2026-02-28T13:00:00-08:00'),
		endDate: new Date('2026-02-28T16:00:00-08:00'),
		cost: 'Free',
		registrationUrl: 'https://forms.gle/sQ8S8BhK1cqjy8Y19',
		descriptionHtml: paragraphsToHtml([
			'Join the American Indian Cultural District for the Mapping Genocide Project: Elevating Untold Stories & Native Resilience Through Art & Placekeeping in Yelamu at SFMOMA on February 28th. The program features a deep dive into the Mapping Genocide Project, a panel, an art exhibition (film, graphics, murals, sculpture) by artists Jackie Fawn (Yurok, Washoe, Surigaonon) and Redbird Willie (Pomo, Wintu, Paiute, Wailaki), and a reception with local leaders to discuss next steps.',
			'The Mapping Genocide Project exposes San Francisco place names and Civic Art statues that commemorate American Indian genocide. The Project also elevates American Indian artists and voices to reimagine these artworks and place names. The Mapping Genocide Project was done in collaboration with the AICD Monuments & Memorials Advisory Committee: American Indian Cultural Center, Association of Ramaytush Ohlone, and Indigenous Justice.',
			'Doors open at 12:45 PM, this event is free and open to the public. Seating is limited, please RSVP to secure your spot.'
		]),
		organization: {
			slug: 'american-indian-cultural-district',
			name: 'American Indian Cultural District',
			website: 'https://americanindianculturaldistrict.org/',
			orgType: 'Community Initiative',
			region: 'Bay Area',
			city: 'San Francisco',
			state: 'CA'
		},
		venue: {
			name: 'SFMOMA',
			city: 'San Francisco',
			state: 'CA',
			venueType: 'Museum'
		},
		priceMin: 0,
		priceMax: 0,
		skipAutoImage: true
	},
	{
		slug: '53rd-annual-csulb-pow-wow-at-puvungna',
		title: '53rd Annual CSULB Pow Wow at Puvungna',
		url: 'https://www.csulb.edu/student-affairs/student-life-development/pow-wow',
		type: 'Powwow',
		region: 'Southern California',
		startDate: new Date('2026-03-14T11:00:00-07:00'),
		endDate: new Date('2026-03-15T18:00:00-07:00'),
		cost: 'Free admission and parking',
		descriptionHtml: paragraphsToHtml([
			"California State University, Long Beach's annual Pow Wow at Puvungna, an American Indian social celebration, is the largest spring event of its kind in Southern California. The Pow Wow is focused on displaying the university's strong American Indian presence. Admission and parking are free.",
			'The two-day event, which will feature American Indian dancing, arts, crafts and food begins at 11 AM each day and runs until 10 PM on Saturday and 6 PM on Sunday. In addition to dance contests and inter-tribal dancing, there will be California Indian Cultural Presentations, Gourd dancing with Dancer Registration closing at 2 PM on Saturday. All dancers and drums are invited.',
			'Native foods, such as mutton and beef stew, Navajo tacos, fry bread, and Indian burgers will be on sale at the event, and American Indian vendors will be selling both traditional and contemporary American Indian art.'
		]),
		organization: {
			slug: 'csulb-american-indian-studies-program',
			name: 'American Indian Studies Program at California State University, Long Beach',
			website: 'https://www.csulb.edu/ais',
			orgType: 'Educational Institution',
			region: 'Southern California',
			city: 'Long Beach',
			state: 'CA'
		},
		venue: {
			name: 'Intramural Rugby and Soccer Fields',
			city: 'Long Beach',
			state: 'CA',
			venueType: 'Campus Field'
		},
		priceMin: 0,
		priceMax: 0,
		skipAutoImage: true
	},
	{
		slug: '2026-miramar-college-pow-wow',
		title: '2026 Miramar College Pow Wow',
		url: 'https://www.sandiego.gov/event/2026-miramar-college-pow-wow',
		type: 'Powwow',
		region: 'Southern California',
		startDate: new Date('2026-03-21T10:00:00-07:00'),
		endDate: new Date('2026-03-21T18:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'San Diego Miramar College in collaboration with San Diego Unified School District Indian Education Program, proudly present the 2nd annual Pow Wow.'
		]),
		organization: {
			slug: 'san-diego-miramar-college',
			name: 'San Diego Miramar College',
			website: 'https://www.miramarcollege.edu/',
			orgType: 'Educational Institution',
			region: 'Southern California',
			city: 'San Diego',
			state: 'CA'
		},
		venue: {
			name: 'Hourglass Park',
			address: '10440 Black Mountain Road',
			city: 'San Diego',
			state: 'CA',
			zip: '92126',
			venueType: 'Park'
		},
		skipAutoImage: true
	},
	{
		slug: 'modesto-junior-college-tradition-is-our-medicine-knowledge-is-our-fire-intertribal-powwow-2026',
		title: "Modesto Junior College Tradition is Our Medicine; Knowledge is Our Fire Intertribal Powwow 2026",
		url: 'https://www.mjc.edu/events/powwow.html',
		type: 'Powwow',
		region: 'Central Valley',
		startDate: new Date('2026-03-28T10:00:00-07:00'),
		endDate: new Date('2026-03-28T19:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'The Modesto Junior College Tradition is Our Medicine; Knowledge is Our Fire Intertribal Powwow 2026 is a social gathering that brings together Native American communities from various tribes within California and throughout Turtle Island (USA) to celebrate and honor their cultural heritage here on the Yokut and Me-Wuk peoples\' land.',
			'This event serves as a platform for dancing, singing, feasting, and the exchange of arts, crafts, and traditions, fostering unity and cultural pride among participants.',
			'In addition, this powwow will provide an opportunity to uphold and share tribal customs, languages, and values, ensuring their preservation for future generations. While rooted in indigenous traditions, MJC\'s powwow is open to the public, inviting non-Native attendees to experience and appreciate the rich cultural expressions of Native American peoples.'
		]),
		organization: {
			slug: 'modesto-junior-college',
			name: 'Modesto Junior College',
			website: 'https://www.mjc.edu/',
			orgType: 'Educational Institution',
			region: 'Central Valley',
			city: 'Modesto',
			state: 'CA'
		},
		venue: {
			name: 'East Campus Quad, Modesto Junior College',
			address: '435 College Ave',
			city: 'Modesto',
			state: 'CA',
			zip: '95354',
			venueType: 'Campus Quad'
		},
		skipAutoImage: true
	},
	{
		slug: 'american-indian-cultural-district-sixth-anniversary-and-state-recognition-celebration',
		title: 'American Indian Cultural District Sixth Anniversary & State Recognition Celebration',
		url: 'https://americanindianculturaldistrict.org/events',
		type: 'Celebration',
		region: 'Bay Area',
		startDate: new Date('2026-03-28T10:00:00-07:00'),
		endDate: new Date('2026-03-28T15:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'On March 28, 2026, we will celebrate the Sixth Anniversary of the American Indian Cultural District and our recognition as a state-designated cultural district. The celebration will feature a block party on Valencia Street, spanning 15th to 18th Streets, and will include a ribbon-cutting ceremony, special guest speakers, including elected officials and tribal leaders, and a parade highlighting American Indian and Indigenous cultures. The event will also feature live music, drag performances, and more.',
			'The American Indian Cultural District (AICD) was officially recognized as a state-designated Cultural District by the California Arts Council (CAC) on Friday, December 12th, 2025. Established on March 31st, 2020, it is the only recognized American Indian Cultural District of its kind and size in California and the United States, dedicated to recognizing, honoring, and celebrating the American Indian legacy, culture, people, and contributions throughout Yelamu (San Francisco).'
		]),
		organization: {
			slug: 'american-indian-cultural-district',
			name: 'American Indian Cultural District',
			website: 'https://americanindianculturaldistrict.org/',
			orgType: 'Community Initiative',
			region: 'Bay Area',
			city: 'San Francisco',
			state: 'CA'
		},
		venue: {
			name: 'Valencia Street Block Party',
			city: 'San Francisco',
			state: 'CA',
			venueType: 'Street Festival'
		}
	},
	{
		slug: 'the-confluence-of-beauty-cultural-intersectionality-and-individualism-in-art-and-beadwork-with-mikailah-thompson',
		title:
			'The Confluence of Beauty - Cultural Intersectionality and Individualism in Art and Beadwork with Mikailah Thompson | Spring Michael Kabotie Lecture Series',
		url: 'https://idyllwildarts.org/event/the-confluence-of-beauty-cultural-intersectionality-and-individualism-in-art-and-beadwork-with-mikailah-thompson-spring-michael-kabotie-lecture-series/',
		type: 'Lecture',
		region: 'Southern California',
		startDate: new Date('2026-03-19T19:00:00-07:00'),
		endDate: new Date('2026-03-19T19:30:00-07:00'),
		cost: null,
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'idyllwild-arts-native-american-arts-center',
			name: 'Idyllwild Arts Native American Arts Center',
			website: 'https://idyllwildarts.org/nativeamericanarts/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Idyllwild',
			state: 'CA'
		},
		venue: {
			name: 'Birchard, Idyllwild Arts',
			address: '52500 Temecula Road #38',
			city: 'Idyllwild',
			state: 'CA',
			zip: '92549',
			venueType: 'Campus Space'
		}
	},
	{
		slug: 'ataloa-a-beautiful-song-sung-to-promote-native-arts-and-culture-with-america-meredith',
		title:
			'Ataloa, A Beautiful Song Sung to Promote Native Arts and Culture with America Meredith | Spring Michael Kabotie Lecture Series',
		url: 'https://idyllwildarts.org/event/ataloa-a-beautiful-song-sung-to-promote-native-arts-and-culture-with-america-meredith-spring-michael-kabotie-lecture-series/',
		type: 'Lecture',
		region: 'Southern California',
		startDate: new Date('2026-03-26T19:00:00-07:00'),
		endDate: new Date('2026-03-26T19:30:00-07:00'),
		cost: null,
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'idyllwild-arts-native-american-arts-center',
			name: 'Idyllwild Arts Native American Arts Center',
			website: 'https://idyllwildarts.org/nativeamericanarts/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Idyllwild',
			state: 'CA'
		},
		venue: {
			name: 'Birchard, Idyllwild Arts',
			address: '52500 Temecula Road #38',
			city: 'Idyllwild',
			state: 'CA',
			zip: '92549',
			venueType: 'Campus Space'
		}
	},
	{
		slug: 'second-annual-festival-celebrating-southern-california-indigenous-communities',
		title: '2nd Annual Festival - Celebrating Southern California Indigenous Communities',
		url: 'https://socalindigenousarts.com/',
		type: 'Festival',
		region: 'Southern California',
		startDate: new Date('2026-04-18T10:00:00-07:00'),
		endDate: new Date('2026-04-18T16:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'Celebrating Southern California Indigenous Communities.',
			'A full day of traditional bird singing, dancing, language, arts, and education - with artisans, cultural bearers, and community vendors.'
		]),
		organization: {
			slug: 'southern-california-indigenous-arts',
			name: 'Southern California Indigenous Arts',
			website: 'https://socalindigenousarts.com/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Escondido',
			state: 'CA'
		},
		venue: {
			name: 'Grape Day Park',
			address: '321 N Broadway',
			city: 'Escondido',
			state: 'CA',
			zip: '92025',
			venueType: 'Park'
		},
		imageSourceUrl: 'https://socalindigenousarts.com/wp-content/uploads/2026/03/SCIA-2026-Final-Flyer.png'
	},
	{
		slug: '55th-annual-stanford-powwow',
		title: '55th Annual Stanford Powwow',
		url: 'https://www.stanfordpowwow.com/',
		type: 'Powwow',
		region: 'Bay Area',
		startDate: new Date('2026-05-08T10:00:00-07:00'),
		endDate: new Date('2026-05-10T18:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'Inviting everyone to the 55th Annual Stanford Powwow! Save the dates May 8-10, 2026 at Stanford University. Our Stanford Native student committee is excited to welcome everyone this Mother\'s Day Weekend for our dancing and singing, specials, vendors, food, and celebrating this year\'s theme of Dancing for Seven Generations.',
			"This poster's beautiful artwork was done by Nico Vargas. We'd love to thank him for his amazing work and helping us bring our vision together!",
			'Please share widely, bring your loved ones, and we will see you all at Stanford soon!'
		]),
		organization: {
			slug: 'stanford-powwow',
			name: 'Stanford Powwow',
			website: 'https://www.stanfordpowwow.com/',
			orgType: 'Student Organization',
			region: 'Bay Area',
			city: 'Stanford',
			state: 'CA'
		},
		venue: {
			name: 'Stanford University',
			city: 'Stanford',
			state: 'CA',
			venueType: 'University Campus'
		},
		imageSourceUrl:
			'https://scontent-iad3-2.cdninstagram.com/v/t51.82787-15/655963458_18257620183289747_3176870256821019774_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=105&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=x1NQzEIPavQQ7kNvwGPBS2F&_nc_oc=Ado7JegswujimyBclGlngAZvXXipMh99OKURhMLGJiQ-uHf2OyphqWl0WbU2gQTi14k&_nc_zt=23&_nc_ht=scontent-iad3-2.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=UqFf8EEBRRglT8AUAf6LXw&_nc_tpa=Q5bMBQGiCJRCcmHztshARDIQxZtrYQYqzeY6bUMXmaehjgtqdmu0X7LjaShi4WVmW3wv6d9RZEFS2a3z&oh=00_Af160PFvjZ4eykNIajVcaDVUZMXZSRGgqUaEHFjo-LHS_Q&oe=69DAA0C4',
		skipAutoImage: true
	},
	{
		slug: 'regional-roundtable-6-tribal-affairs-and-tribal-energy-sovereignty',
		title:
			'Regional Roundtable 6: CEC Order Instituting an Informational Proceeding on Tribal Affairs and Tribal Energy Sovereignty (25-OIIP-01) – North Central Region',
		url: 'https://www.energy.ca.gov/event/2026-04/regional-roundtable-6-cec-order-instituting-informational-proceeding-tribal',
		type: 'Conference',
		region: 'North State',
		startDate: new Date('2026-04-14T09:00:00-07:00'),
		endDate: new Date('2026-04-14T16:00:00-07:00'),
		cost: 'Free registration',
		descriptionHtml: paragraphsToHtml([
			'The California Energy Commission (CEC) is hosting a series of Regional Roundtables on the CEC’s Order Instituting an Informational Proceeding (OIIP) on Tribal Affairs and Tribal Energy Sovereignty (25-OIIP-01). The Regional Roundtables are open to all California Native American tribes. Regional Roundtable 6 is scheduled for April 14, 2026, in Corning, in collaboration with the Paskenta Band of Nomlaki Indians.',
			'The public can participate consistent with the attendance instructions below. The CEC aims to begin promptly at the start time posted and the end time is an estimate based on the proposed agenda. The event may end sooner or later than the posted end time.'
		]),
		organization: {
			slug: 'california-energy-commission',
			name: 'California Energy Commission',
			website: 'https://www.energy.ca.gov/',
			orgType: 'Government Agency',
			region: 'Sacramento Valley',
			city: 'Sacramento',
			state: 'CA'
		},
		venue: {
			name: 'Rolling Hills Casino Resort',
			address: '2655 Everett Freeman Way',
			city: 'Corning',
			state: 'CA',
			zip: '96021',
			venueType: 'Resort'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'regional-roundtable-7-tribal-affairs-and-tribal-energy-sovereignty',
		title:
			'Regional Roundtable 7: CEC Order Instituting an Informational Proceeding on Tribal Affairs and Tribal Energy Sovereignty (25-OIIP-01) – Northeast Region',
		url: 'https://www.energy.ca.gov/event/2026-04/regional-roundtable-7-cec-order-instituting-informational-proceeding-tribal',
		type: 'Conference',
		region: 'North State',
		startDate: new Date('2026-04-15T09:00:00-07:00'),
		endDate: new Date('2026-04-15T16:00:00-07:00'),
		cost: 'Free registration',
		descriptionHtml: paragraphsToHtml([
			'The California Energy Commission (CEC) is hosting a series of Regional Roundtables on the CEC’s Order Instituting an Informational Proceeding (OIIP) on Tribal Affairs and Tribal Energy Sovereignty (25-OIIP-01). The Regional Roundtables are open to all California Native American tribes. Regional Roundtable 7 is scheduled for April 15, 2026, in Susanville, in collaboration with the Susanville Indian Rancheria.',
			'The public can participate consistent with the attendance instructions below. The CEC aims to begin promptly at the start time posted and the end time is an estimate based on the proposed agenda. The event may end sooner or later than the posted end time.'
		]),
		organization: {
			slug: 'california-energy-commission',
			name: 'California Energy Commission',
			website: 'https://www.energy.ca.gov/',
			orgType: 'Government Agency',
			region: 'Sacramento Valley',
			city: 'Sacramento',
			state: 'CA'
		},
		venue: {
			name: 'Diamond Mountain Casino & Hotel',
			address: '900 Skyline Road',
			city: 'Susanville',
			state: 'CA',
			zip: '96130',
			venueType: 'Hotel'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'land-language-family-cahuilla-land-stewardship-spring-michael-kabotie-lecture-series',
		title: 'Land, Language, Family: Cahuilla Land Stewardship | Spring Michael Kabotie Lecture Series',
		url: 'https://idyllwildarts.org/event/land-language-family-cahuilla-land-stewardship-spring-michael-kabotie-lecture-series/',
		type: 'Lecture',
		region: 'Southern California',
		startDate: new Date('2026-04-16T19:00:00-07:00'),
		endDate: new Date('2026-04-16T19:30:00-07:00'),
		cost: 'Free',
		descriptionHtml: paragraphsToHtml([
			'As we celebrate the 80th anniversary of the founding of Idyllwild Arts, the Native American Arts Center is holding a series of Thursday evening engagements from January to April where we will meet in person to learn more about the history of Native American Arts at Idyllwild Arts and explore goals for the future! We are thrilled to host these in-person engagements in the newly renovated Birchard Building, which is now the official home of the Native American Arts Center.',
			'Be sure to mark your calendars and join us for evenings full of inspiring stories, light appetizers and beverages. The Michael Kabotie Lecture series is named after Native Arts summer faculty program collaborator, Michael Kabotie, 1942-2009, (Hopi). Michael’s inquisitive and trickster spirit lives on in these compelling conversations that Michael advocated for greatly during his time at Idyllwild Arts.',
			'To culminate our spring Michael Kabotie Lecture Series, we will welcome tribal members and leadership from the Cahuilla Band of Indians and Santa Rosa Cahuilla Band of Indians, as well as others from the community, to share about the importance of cultural and land stewardship in these ever-evolving times. Even in what is a very tumultuous time, there remains an enduring and strong connection between people and land that supports cultural healing and growth.',
			'This conversation will be a community-led discussion and celebration in recognition of Earth Day 2026.',
			'We welcome attendees to join us for a meal at 5:30 pm and time to enjoy nature before we start the program at 7 pm.'
		]),
		organization: {
			slug: 'idyllwild-arts-native-american-arts-center',
			name: 'Idyllwild Arts Native American Arts Center',
			website: 'https://idyllwildarts.org/nativeamericanarts/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Idyllwild',
			state: 'CA'
		},
		venue: {
			name: 'Birchard, Idyllwild Arts',
			address: '52500 Temecula Road #38',
			city: 'Idyllwild',
			state: 'CA',
			zip: '92549',
			venueType: 'Campus Space'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'native-plant-workshop-with-dr-sean-milanovich',
		title: 'Native Plant Workshop with Dr. Sean Milanovich',
		url: 'https://www.accmuseum.org/events',
		type: 'Workshop',
		region: 'Southern California',
		startDate: new Date('2026-04-18T10:00:00-07:00'),
		endDate: new Date('2026-04-18T15:00:00-07:00'),
		cost: 'Workshop ticket required',
		registrationUrl:
			'https://tickets.accmuseum.org/Performance.aspx?pid=32958&cal=https%3a%2f%2ftickets.accmuseum.org%3a443%2fcalendar.aspx',
		descriptionHtml: paragraphsToHtml([
			'Learn more about native plants and their traditional uses, past and present, with Agua Caliente Band of Cahuilla Indians Tribal Member Dr. Sean Milanovich.',
			'This workshop includes guided hands-on identification practice in the Education Garden and additional plant talks in the Education Classroom.',
			'Participants will learn how to use a few plants for food, games, and fun, such as significant trees and plants like the palm (mául).',
			'Participants will also learn about the processes of making traditional foods like acorn soup (hépal), acorn mush (wíwis), mesquite cookies, agave (ámul), and at the end, enjoy tasting foods and sharing stories.'
		]),
		organization: {
			slug: 'agua-caliente-cultural-museum',
			name: 'Agua Caliente Cultural Museum',
			website: 'https://www.accmuseum.org/',
			orgType: 'Museum',
			region: 'Southern California',
			city: 'Palm Springs',
			state: 'CA'
		},
		venue: {
			name: 'Agua Caliente Cultural Museum',
			address: '140 N Indian Canyon Dr',
			city: 'Palm Springs',
			state: 'CA',
			zip: '92262',
			venueType: 'Museum'
		},
		priceMin: 100,
		priceMax: 100,
		pricingTiers: [{ label: 'Workshop ticket', price: 100, sortOrder: 0 }],
		skipAutoImage: true
	},
	{
		slug: 'tribal-wildfire-resiliency-conference',
		title: 'Tribal Wildfire Resiliency Conference',
		url: 'https://www.iipaynationofsantaysabel-nsn.gov/events-1/tribal-wildfire-resiliency-conference',
		type: 'Conference',
		region: 'Southern California',
		startDate: new Date('2026-04-20T09:00:00-07:00'),
		endDate: new Date('2026-04-21T09:00:00-07:00'),
		cost: 'Registration required',
		descriptionHtml: null,
		organization: {
			slug: 'iipay-nation-of-santa-ysabel',
			name: 'Iipay Nation of Santa Ysabel',
			website: 'https://www.iipaynationofsantaysabel-nsn.gov/',
			orgType: 'Tribal Nation',
			region: 'Southern California',
			city: 'Santa Ysabel',
			state: 'CA'
		},
		venue: {
			name: "Harrah's Rincon Resort and Casino",
			address: '777 S Resort Dr',
			city: 'Valley Center',
			state: 'CA',
			zip: '92082',
			venueType: 'Resort'
		},
		skipAutoImage: false
	},
	{
		slug: 'summit-on-tribal-energy-enterprise-and-workforce-development-day-1',
		title: 'Summit on Tribal Energy Enterprise and Workforce Development - Day 1',
		url: 'https://www.energy.ca.gov/event/outreach/2026-04/summit-tribal-energy-enterprise-and-workforce-development-day-1',
		type: 'Conference',
		region: 'Sacramento Valley',
		startDate: new Date('2026-04-23T09:00:00-07:00'),
		endDate: new Date('2026-04-23T16:00:00-07:00'),
		cost: 'Free RSVP',
		descriptionHtml: paragraphsToHtml([
			'The California Energy Commission (CEC) is hosting a Statewide Summit on Tribal Energy Enterprise and Workforce Development in collaboration with the Yocha Dehe Wintun Nation as part of its Order Instituting an Informational Proceeding (OIIP) on Tribal Affairs and Tribal Energy Sovereignty.',
			'This summit builds on a broader series of regional roundtables being held with tribes across California to better understand tribal priorities in energy development and identify ways the CEC can support tribal energy sovereignty, economic development, and workforce opportunities.',
			'The first day of the summit will focus on presentations and discussion with representatives from multiple California state agencies and institutions working at the intersection of energy, infrastructure, and workforce development. The second day will be led by the CEC through the OIIP on Tribal Affairs and Tribal Energy Sovereignty.',
			'This day will feature case studies from tribes; panels on workforce pipelines and tribal energy enterprises; and discussions on tribal energy ownership.'
		]),
		organization: {
			slug: 'california-energy-commission',
			name: 'California Energy Commission',
			website: 'https://www.energy.ca.gov/',
			orgType: 'Government Agency',
			region: 'Sacramento Valley',
			city: 'Sacramento',
			state: 'CA'
		},
		venue: {
			name: 'Cache Creek Casino Resort',
			address: '14455 CA Highway 16',
			city: 'Brooks',
			state: 'CA',
			zip: '95606',
			venueType: 'Resort'
		},
		priceMin: 0,
		priceMax: 0,
		skipAutoImage: true
	},
	{
		slug: 'summit-on-tribal-energy-enterprise-and-workforce-development-day-2',
		title: 'Summit on Tribal Energy Enterprise and Workforce Development - Day 2',
		url: 'https://www.energy.ca.gov/event/outreach/2026-04/summit-tribal-energy-enterprise-and-workforce-development-day-2',
		type: 'Conference',
		region: 'Sacramento Valley',
		startDate: new Date('2026-04-24T09:00:00-07:00'),
		endDate: new Date('2026-04-24T16:00:00-07:00'),
		cost: 'Free RSVP',
		descriptionHtml: paragraphsToHtml([
			'The California Energy Commission (CEC) is hosting a Statewide Summit on Tribal Energy Enterprise and Workforce Development in collaboration with the Yocha Dehe Wintun Nation as part of its Order Instituting an Informational Proceeding (OIIP) on Tribal Affairs and Tribal Energy Sovereignty.',
			'This summit builds on a broader series of regional roundtables being held with tribes across California to better understand tribal priorities in energy development and identify ways the CEC can support tribal energy sovereignty, economic development, and workforce opportunities.',
			'The first day of the summit will focus on presentations and discussion with representatives from multiple California state agencies and institutions working at the intersection of energy, infrastructure, and workforce development. The second day will be led by the CEC through the OIIP on Tribal Affairs and Tribal Energy Sovereignty.',
			'This day will feature case studies from tribes; panels on workforce pipelines and tribal energy enterprises; and discussions on tribal energy ownership.'
		]),
		organization: {
			slug: 'california-energy-commission',
			name: 'California Energy Commission',
			website: 'https://www.energy.ca.gov/',
			orgType: 'Government Agency',
			region: 'Sacramento Valley',
			city: 'Sacramento',
			state: 'CA'
		},
		venue: {
			name: 'Cache Creek Casino Resort',
			address: '14455 CA Highway 16',
			city: 'Brooks',
			state: 'CA',
			zip: '95606',
			venueType: 'Resort'
		},
		priceMin: 0,
		priceMax: 0,
		skipAutoImage: true
	},
	{
		slug: 'dyani-white-hawk',
		title: 'Dyani White Hawk',
		url: 'https://arts.ucdavis.edu/event/dyani-white-hawk',
		type: 'Artist Talk',
		region: 'Sacramento Valley',
		startDate: new Date('2026-04-30T16:30:00-07:00'),
		endDate: new Date('2026-04-30T18:00:00-07:00'),
		cost: 'Free',
		descriptionHtml: paragraphsToHtml([
			'As part of The California Studio: Manetti Shrem Artist Residencies, Dyani White Hawk will be discussing her work and practice.',
			'Dyani White Hawk (Sičáŋǧu Lakota) is a multidisciplinary artist based in Minneapolis. Her practice, strongly rooted in painting and beadwork, extends into sculpture, installation, video, and performance, reflecting upon cross-cultural experiences through the amalgamation of influences from Lakota and Euro/American abstraction.',
			'A mid-career survey Dyani White Hawk: Love Language, co-organized by the Walker Art Center and Remai Modern, will open at Remai Modern on April 25, 2026.',
			'White Hawk is the spring quarter spotlight artist in residence in The California Studio: Manetti Shrem Artist Residencies.',
			'Organized by The California Studio: Manetti Shrem Artist Residencies in the Maria Manetti Shrem Art Studio Program. Co-presented by the Gorman Museum of Native American Art and the Manetti Shrem Museum.'
		]),
		organization: {
			slug: 'gorman-museum-of-native-american-art',
			name: 'Gorman Museum of Native American Art',
			website: 'https://gormanmuseum.ucdavis.edu/',
			orgType: 'Museum',
			region: 'Sacramento Valley',
			city: 'Davis',
			state: 'CA'
		},
		venue: {
			name: 'Jan Shrem and Maria Manetti Shrem Museum',
			city: 'Davis',
			state: 'CA',
			venueType: 'Museum'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'kewet',
		title: 'Kewet',
		url: 'https://malkimuseum.org/pages/kewet',
		type: 'Celebration',
		region: 'Southern California',
		startDate: new Date('2026-05-24T10:00:00-07:00'),
		endDate: new Date('2026-05-24T17:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'The Annual Fiesta includes honoring Native American veterans, arts and crafts, fry bread, bird songs, and dances. The Malki Museum sponsors three main events each year which are designed to be traditional and educational.',
			'Malki’s annual Fiesta is a time of gathering together to share culture and traditions. It is also the major fundraising event for the Museum.',
			'Each year hundreds of both natives and non-natives come to participate in this unique event which has been an annual celebration since 1966, when the Kewét (the Cahuilla word for fiesta) tradition was revived after 20 years.',
			'The Indian dancers and singers represent several tribes from southern California, and many of the vendors in the Ramada booths are Native Americans from all over the Southwestern States.',
			'The Fiesta is held each year on the Sunday of Memorial weekend in May.'
		]),
		organization: {
			slug: 'malki-museum',
			name: 'Malki Museum',
			website: 'https://malkimuseum.org/',
			orgType: 'Museum',
			region: 'Southern California',
			city: 'Banning',
			state: 'CA'
		},
		venue: {
			name: 'Malki Museum',
			address: '11795 Malki Rd',
			city: 'Banning',
			state: 'CA',
			zip: '92220',
			venueType: 'Museum'
		}
	},
	{
		slug: 'american-indian-arts-marketplace',
		title: 'American Indian Arts Marketplace',
		url: 'https://theautry.org/events/family-activities/american-indian-arts-marketplace',
		type: 'Arts Market',
		region: 'Southern California',
		startDate: new Date('2026-06-06T10:00:00-07:00'),
		endDate: new Date('2026-06-07T17:00:00-07:00'),
		cost: null,
		descriptionHtml: paragraphsToHtml([
			'The Autry’s signature Marketplace returns! Discover the artistry, stories, and creativity of Native artists from across the nation in a joyful, open-air festival setting.',
			'Browse and buy stunning works—jewelry, pottery, beadwork, textiles, sculpture, and more—while enjoying performances, demonstrations, and hands-on activities for all ages.',
			'From timeless traditions to bold contemporary expression, this is where creativity and community come together. Whether you’re a collector, a casual browser, or simply looking for a great day at the museum, the American Indian Arts Marketplace offers something for everyone.',
			'More details coming soon—don’t miss it!'
		]),
		organization: {
			slug: 'autry-museum-of-the-american-west',
			name: 'Autry Museum of the American West',
			website: 'https://theautry.org/',
			orgType: 'Museum',
			region: 'Southern California',
			city: 'Los Angeles',
			state: 'CA'
		},
		venue: {
			name: 'The Autry Museum of the American West',
			address: '4700 Western Heritage Way',
			city: 'Los Angeles',
			state: 'CA',
			zip: '90027-1462',
			venueType: 'Museum'
		}
	},
	{
		slug: 'native-american-arts-workshops-2026',
		title: 'Native American Arts Workshops',
		url: 'https://idyllwildarts.org/program/arts-focus/native-american-arts/',
		type: 'Workshop Series',
		region: 'Southern California',
		startDate: new Date('2026-06-07T09:00:00-07:00'),
		endDate: new Date('2026-06-27T17:00:00-07:00'),
		cost: 'Registration required',
		descriptionHtml: paragraphsToHtml([
			'Since its founding in 1946, Idyllwild Arts has always been firmly rooted in respect for and reverence of Native American arts and culture.',
			'While the Summer Program has offered dynamic Native American Arts workshops and programming for over 70 years, the Native American Arts Center opened in 2022 to expand these offerings year-round, effectively establishing Idyllwild Arts as a leader in supporting Indigenous artistic expression and cultural affirmation.',
			'Thought-provoking workshops stimulate conversations, empower creative contributions, and strengthen community.'
		]),
		organization: {
			slug: 'idyllwild-arts-native-american-arts-center',
			name: 'Idyllwild Arts Native American Arts Center',
			website: 'https://idyllwildarts.org/nativeamericanarts/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Idyllwild',
			state: 'CA'
		},
		venue: {
			name: 'Idyllwild Arts',
			address: '52500 Temecula Road #38',
			city: 'Idyllwild',
			state: 'CA',
			zip: '92549',
			venueType: 'Arts Campus'
		}
	},
	{
		slug: 'native-american-arts-festival-week-2026',
		title: 'Native American Arts Festival Week',
		url: 'https://idyllwildarts.org/nativeamericanarts/festival-week/',
		type: 'Festival',
		region: 'Southern California',
		startDate: new Date('2026-06-15T09:00:00-07:00'),
		endDate: new Date('2026-06-19T21:00:00-07:00'),
		cost: 'Free',
		descriptionHtml: paragraphsToHtml([
			'The Native American Arts Center produces and hosts the annual Native American Arts Festival Week, designed to enhance and add depth to the Summer Program workshop experience.',
			'The week-long festival provides a provocative learning experience by bringing together distinguished artists, scholars, and cultural specialists to present performances, demonstrations, films, exhibitions, showcases, and the popular Michael Kabotie Lecture Series.',
			'All events are free and open to the public!'
		]),
		organization: {
			slug: 'idyllwild-arts-native-american-arts-center',
			name: 'Idyllwild Arts Native American Arts Center',
			website: 'https://idyllwildarts.org/nativeamericanarts/',
			orgType: 'Arts Organization',
			region: 'Southern California',
			city: 'Idyllwild',
			state: 'CA'
		},
		venue: {
			name: 'Idyllwild Arts',
			address: '52500 Temecula Road #38',
			city: 'Idyllwild',
			state: 'CA',
			zip: '92549',
			venueType: 'Arts Campus'
		},
		priceMin: 0,
		priceMax: 0,
		imageSourceUrl:
			'https://idyllwildarts.org/wp-content/uploads/2024/05/IndigenousPeoplesDay_IdyllwildArts_CierraBreezePhotography-117-2048x1365.jpg'
	},
	{
		slug: 'ethnobotany-summer-camp-at-the-agua-caliente-cultural-museum',
		title: 'Ethnobotany Summer Camp at the Agua Caliente Cultural Museum',
		url: 'https://www.accmuseum.org/events',
		type: 'Camp',
		region: 'Southern California',
		startDate: new Date('2026-07-06T08:30:00-07:00'),
		endDate: new Date('2026-07-10T12:30:00-07:00'),
		cost: 'Registration Fee Required',
		registrationUrl:
			'https://tickets.accmuseum.org/PatronEducation.aspx?pid=35394&cal=https%3a%2f%2ftickets.accmuseum.org%3a443%2fcalendar.aspx',
		descriptionHtml: paragraphsToHtml([
			'The Agua Caliente Cultural Museum will be offering an Ethnobotany Summer Camp on July 6- July 10, 2026.',
			'Learn about the relationship between the Agua Caliente People and plants of this desert environment through artifact and plant investigation, gallery exploration, and art activities.',
			'Space is limited.'
		]),
		organization: {
			slug: 'agua-caliente-cultural-museum',
			name: 'Agua Caliente Cultural Museum',
			website: 'https://www.accmuseum.org/',
			orgType: 'Museum',
			region: 'Southern California',
			city: 'Palm Springs',
			state: 'CA'
		},
		venue: {
			name: 'Agua Caliente Cultural Museum',
			address: '140 N Indian Canyon Dr',
			city: 'Palm Springs',
			state: 'CA',
			zip: '92262',
			venueType: 'Museum'
		},
		priceMin: 125,
		priceMax: 150,
		pricingTiers: [
			{ label: 'Annual passholders', price: 125, sortOrder: 0 },
			{ label: 'General public', price: 150, sortOrder: 1 }
		],
		skipAutoImage: true
	},
	{
		slug: 'native-contemporary-arts-festival',
		title: 'Native Contemporary Arts Festival',
		url: 'https://ybgfestival.org/event/native-contemporary-arts-festival-2026/',
		type: 'Festival',
		region: 'Bay Area',
		startDate: new Date('2026-06-20T12:00:00-07:00'),
		endDate: new Date('2026-06-20T15:00:00-07:00'),
		cost: 'Free',
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'yerba-buena-gardens-festival',
			name: 'Yerba Buena Gardens Festival',
			website: 'https://ybgfestival.org/',
			orgType: 'Arts Organization',
			region: 'Bay Area',
			city: 'San Francisco',
			state: 'CA'
		},
		venue: {
			name: 'Great Lawn, Yerba Buena Gardens',
			address: 'Mission St. between 3rd & 4th Sts.',
			city: 'San Francisco',
			state: 'CA',
			zip: '94103',
			venueType: 'Park'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'honoring-our-relatives-a-missing-and-murdered-indigenous-peoples-gathering',
		title: 'Honoring Our Relatives: A Missing and Murdered Indigenous Peoples Gathering',
		url: 'https://ybgfestival.org/event/voices-of-resistance/',
		type: 'Community Gathering',
		region: 'Bay Area',
		startDate: new Date('2026-07-12T12:00:00-07:00'),
		endDate: new Date('2026-07-12T17:00:00-07:00'),
		cost: 'Free',
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'yerba-buena-gardens-festival',
			name: 'Yerba Buena Gardens Festival',
			website: 'https://ybgfestival.org/',
			orgType: 'Arts Organization',
			region: 'Bay Area',
			city: 'San Francisco',
			state: 'CA'
		},
		venue: {
			name: 'Great Lawn, Yerba Buena Gardens',
			address: 'Mission St. between 3rd & 4th Sts.',
			city: 'San Francisco',
			state: 'CA',
			zip: '94103',
			venueType: 'Park'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'eddie-madril-kids-show-11am',
		title: 'Eddie Madril (Kids’ Show)',
		url: 'https://ybgfestival.org/event/eddie-madril-2026-1/',
		type: 'Children’s Program',
		region: 'Bay Area',
		startDate: new Date('2026-08-07T11:00:00-07:00'),
		endDate: new Date('2026-08-07T11:30:00-07:00'),
		cost: 'Free',
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'yerba-buena-gardens-festival',
			name: 'Yerba Buena Gardens Festival',
			website: 'https://ybgfestival.org/',
			orgType: 'Arts Organization',
			region: 'Bay Area',
			city: 'San Francisco',
			state: 'CA'
		},
		venue: {
			name: 'Children’s Garden, Yerba Buena Gardens',
			address: 'Mission St. between 3rd & 4th Sts.',
			city: 'San Francisco',
			state: 'CA',
			zip: '94103',
			venueType: 'Park'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'eddie-madril-kids-show-12pm',
		title: 'Eddie Madril (Kids’ Show)',
		url: 'https://ybgfestival.org/event/eddie-madril-2026-2/',
		type: 'Children’s Program',
		region: 'Bay Area',
		startDate: new Date('2026-08-07T12:00:00-07:00'),
		endDate: new Date('2026-08-07T12:30:00-07:00'),
		cost: 'Free',
		descriptionHtml: null,
		useYbgApi: true,
		organization: {
			slug: 'yerba-buena-gardens-festival',
			name: 'Yerba Buena Gardens Festival',
			website: 'https://ybgfestival.org/',
			orgType: 'Arts Organization',
			region: 'Bay Area',
			city: 'San Francisco',
			state: 'CA'
		},
		venue: {
			name: 'Children’s Garden, Yerba Buena Gardens',
			address: 'Mission St. between 3rd & 4th Sts.',
			city: 'San Francisco',
			state: 'CA',
			zip: '94103',
			venueType: 'Park'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: '23rd-annual-table-mountain-rancheria-pow-wow',
		title: '23rd Annual Table Mountain Rancheria Pow Wow',
		url: 'https://tablemountainrancheria.com/events/',
		type: 'Powwow',
		region: 'Central Valley',
		startDate: new Date('2026-08-21T10:00:00-07:00'),
		endDate: new Date('2026-08-23T18:00:00-07:00'),
		cost: 'Free admission and parking',
		descriptionHtml: paragraphsToHtml([
			'23rd Annual Table Mountain Rancheria Pow Wow',
			'Free Admission and parking',
			'Open to the public'
		]),
		organization: {
			slug: 'table-mountain-rancheria',
			name: 'Table Mountain Rancheria',
			website: 'https://tablemountainrancheria.com/',
			orgType: 'Tribal Nation',
			region: 'Central Valley',
			city: 'Friant',
			state: 'CA'
		},
		venue: {
			name: 'Beverly J. Hunter Pow Wow Arena',
			city: 'Friant',
			state: 'CA',
			venueType: 'Arena'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: 'moompetam-american-indian-festival',
		title: 'Moompetam American Indian Festival',
		url: 'https://www.aquariumofpacific.org/events/info/moompetam',
		type: 'Festival',
		region: 'Southern California',
		startDate: new Date('2026-09-12T09:00:00-07:00'),
		endDate: new Date('2026-09-13T17:00:00-07:00'),
		cost: 'Included with general admission',
		registrationUrl: 'https://www.aquariumofpacific.org/visit/tickets',
		descriptionHtml: paragraphsToHtml([
			'You are invited to join the Aquarium of the Pacific for its twenty-second annual Moompetam American Indian Festival. Moompetam (pronounced \'mohm peh tahm), meaning "People of the Ocean," is derived from the word for \'saltwater\' in the Tongva language. For the California Indigenous coastal peoples, the ocean has always been a sacred entity.',
			'The festival celebrates Indigenous California maritime cultures, including Tongva, Acjachemen, Chumash, Costanoan, Kumeyaay, and Luiseno. This celebration features traditional cultural craft demonstrations, storytelling, music, and dance, and an award ceremony.',
			'Live festival presentations are scheduled for the following times in the following locations. All programs subject to change and weather dependent. Festival programming is 15-20 minutes: 10:00 a.m. Honda Blue Cavern; 10:45 a.m. Honda Blue Cavern; 11:30 a.m. Honda Pacific Visions Theater; 12:15 p.m. Honda Blue Cavern; 1:00 p.m. Honda Pacific Visions Theater; 1:45 p.m. Honda Blue Cavern; 2:30 p.m. Honda Pacific Visions Theater; 3:15 p.m. Honda Blue Cavern; 4:00 p.m. Honda Pacific Visions Theater.'
		]),
		organization: {
			slug: 'aquarium-of-the-pacific',
			name: 'Aquarium of the Pacific',
			website: 'https://www.aquariumofpacific.org/',
			orgType: 'Museum',
			region: 'Southern California',
			city: 'Long Beach',
			state: 'CA'
		},
		venue: {
			name: 'Aquarium of the Pacific',
			city: 'Long Beach',
			state: 'CA',
			venueType: 'Aquarium'
		},
		priceMin: 34.95,
		priceMax: 44.95,
		pricingTiers: [
			{ label: 'Child (ages 3-11)', price: 34.95, sortOrder: 0 },
			{ label: 'Senior (ages 62+)', price: 41.95, sortOrder: 1 },
			{ label: 'Adult (ages 12+)', price: 44.95, sortOrder: 2 },
			{ label: 'Aquarium members', price: 0, sortOrder: 3 },
			{ label: 'Children under age three', price: 0, sortOrder: 4 }
		],
		imageSourceUrl:
			'https://www.aquariumofpacific.org/images/made_new/images-events-20240914AOP_JB29882_900_q85.jpg'
	},
	{
		slug: '59th-annual-california-native-american-day',
		title: '59th Annual California Native American Day',
		url: 'https://californianativeamericanday.com/',
		type: 'Celebration',
		region: 'Sacramento Valley',
		startDate: new Date('2026-09-25T10:00:00-07:00'),
		endDate: new Date('2026-09-25T14:00:00-07:00'),
		cost: 'Free',
		descriptionHtml: paragraphsToHtml([
			'"Inherent Sovereignty: Tribal Nations Fighting to Protect Our Land and Defend Our People"',
			'Join us for the 59th Annual California Native American Day at the California State Capital Building!'
		]),
		organization: {
			slug: 'california-native-american-day',
			name: 'California Native American Day',
			website: 'https://californianativeamericanday.com/',
			orgType: 'Community Initiative',
			region: 'Sacramento Valley',
			city: 'Sacramento',
			state: 'CA'
		},
		venue: {
			name: 'California State Capitol',
			city: 'Sacramento',
			state: 'CA',
			venueType: 'Government Building'
		},
		priceMin: 0,
		priceMax: 0
	},
	{
		slug: '32nd-annual-heart-of-tataviam-pow-wow',
		title: '32nd Annual Heart of Tataviam Pow wow',
		url: 'https://www.tataviam-nsn.us/event/32-tataviam-pw/',
		type: 'Powwow',
		region: 'Southern California',
		startDate: new Date('2026-10-03T00:00:00-07:00'),
		endDate: new Date('2026-10-04T23:59:59-07:00'),
		cost: 'Free',
		descriptionHtml: paragraphsToHtml([
			'Since 1994, the Hart of the West Pow Wow has been a beloved annual community gathering at William S. Hart Park in Newhall. Originally named in honor of silent film star William S. Hart—whose legacy and residence continue to shape the park’s history—the Pow Wow has grown into a major cultural event for the Santa Clarita Valley and Los Angeles County.',
			'Over the past three decades, the Pow Wow has evolved into a powerful expression of Native identity, resilience, and community. In 2019, the Pow Wow Committee formed a partnership with the Fernandeño Tataviam Band of Mission Indians (FTBMI), a historic California State–recognized Native American tribe that continues to seek federal recognition.',
			'Today, the Pow Wow not only celebrates the enduring heritage of Indigenous peoples but also serves as a dynamic platform for cultural education, intertribal exchange, and community connection.',
			'The 2026 Heart of Tataviam Pow Wow will take place on October 3rd & 4th, 2026 at William S. Hart Park.'
		]),
		organization: {
			slug: 'fernandeno-tataviam-band-of-mission-indians',
			name: 'Fernandeño Tataviam Band of Mission Indians',
			website: 'https://www.tataviam-nsn.us/',
			orgType: 'Tribal Nation',
			region: 'Southern California',
			city: 'Santa Clarita',
			state: 'CA'
		},
		venue: {
			name: 'William S. Hart Regional Park',
			address: '24151 Newhall Ave',
			city: 'Santa Clarita',
			state: 'CA',
			zip: '91321',
			venueType: 'Regional Park'
		},
		priceMin: 0,
		priceMax: 0,
		imageSourceUrl: 'https://d3fd2cznj6kriy.cloudfront.net/wp-content/uploads/2025/11/20093014/HOT-FB-cover.jpg',
		skipAutoImage: true
	}
];

async function upsertEventRecord(eventConfig) {
	const organization = await upsertOrganization(eventConfig.organization);
	const venue = await upsertVenue(eventConfig.venue, organization.id);
	const pageDetails = await safeFetchPageDetails(eventConfig.url);
	const ybgDetails = eventConfig.useYbgApi ? await fetchYbgEventDetails(eventConfig.url) : null;

	const title = eventConfig.title ?? ybgDetails?.title;
	if (!title) {
		throw new Error(`Missing title for ${eventConfig.url}`);
	}

	const descriptionHtml = eventConfig.descriptionHtml ?? ybgDetails?.descriptionHtml ?? null;
	const registrationUrl =
		eventConfig.registrationUrl ?? ybgDetails?.registrationUrl ?? pageDetails.registrationUrl ?? null;
	const imageSourceUrl = eventConfig.skipAutoImage
		? null
		: eventConfig.imageSourceUrl ?? ybgDetails?.imageSourceUrl ?? pageDetails.imageSourceUrl ?? null;
	let imageUrl = null;
	if (imageSourceUrl) {
		try {
			imageUrl = await uploadRemoteImage(eventConfig.slug, imageSourceUrl);
		} catch (error) {
			console.warn(`Skipping image import for ${eventConfig.slug}: ${error.message}`);
		}
	}

	const locationLabel = venue ? buildLocationLabel(venue) : null;
	const addressLabel = venue ? buildAddressLabel(venue) : null;
	const cost = eventConfig.cost ?? ybgDetails?.cost ?? null;

	const rows = await db`
		insert into events (
			slug,
			title,
			description,
			location,
			address,
			region,
			cost,
			event_url,
			host_org,
			type,
			start_date,
			end_date,
			image_url,
			status,
			source,
			organization_id,
			venue_id,
			registration_url,
			event_format,
			timezone,
			is_all_day,
			price_min,
			price_max,
			pricing_tiers,
			published_at
		)
		values (
			${eventConfig.slug},
			${title},
			${descriptionHtml},
			${locationLabel},
			${addressLabel},
			${eventConfig.region ?? null},
			${cost},
			${eventConfig.url},
			${eventConfig.organization.name},
			${eventConfig.type ?? 'Community Event'},
			${eventConfig.startDate},
			${eventConfig.endDate ?? null},
			${imageUrl},
			${'published'},
			${'official-curation'},
			${organization.id},
			${venue?.id ?? null},
			${registrationUrl},
			${'in_person'},
			${'America/Los_Angeles'},
			${Boolean(eventConfig.isAllDay)},
			${eventConfig.priceMin ?? null},
			${eventConfig.priceMax ?? null},
			${db.json(eventConfig.pricingTiers ?? [])}::jsonb,
			now()
		)
		on conflict (slug) do update
		set
			title = excluded.title,
			description = excluded.description,
			location = excluded.location,
			address = excluded.address,
			region = excluded.region,
			cost = excluded.cost,
			event_url = excluded.event_url,
			host_org = excluded.host_org,
			type = excluded.type,
			start_date = excluded.start_date,
			end_date = excluded.end_date,
			image_url = coalesce(excluded.image_url, events.image_url),
			status = excluded.status,
			source = excluded.source,
			organization_id = excluded.organization_id,
			venue_id = excluded.venue_id,
			registration_url = coalesce(excluded.registration_url, events.registration_url),
			event_format = excluded.event_format,
			timezone = excluded.timezone,
			is_all_day = excluded.is_all_day,
			price_min = excluded.price_min,
			price_max = excluded.price_max,
			pricing_tiers = excluded.pricing_tiers,
			updated_at = now()
		returning slug, title
	`;

	return rows[0];
}

async function main() {
	await ensureBucket();

	let processed = 0;
	const failures = [];
	for (const eventConfig of OFFICIAL_EVENTS) {
		try {
			const row = await upsertEventRecord(eventConfig);
			processed += 1;
			console.log(`Imported ${row.slug}`);
		} catch (error) {
			failures.push({ slug: eventConfig.slug, message: error.message });
			console.error(`Failed ${eventConfig.slug}: ${error.message}`);
		}
	}

	console.log(`Processed ${processed} verified Native-focused official events.`);
	if (failures.length) {
		console.error(JSON.stringify({ failures }, null, 2));
		process.exitCode = 1;
	}
}

main()
	.catch(async (error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.end();
	});
