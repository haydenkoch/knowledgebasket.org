#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const db = postgres(DATABASE_URL);

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
	return escapeHtml(value);
}

function buildAnchor({ href, label }) {
	return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderInline(value) {
	if (typeof value === 'string') return escapeHtml(value);
	if (value?.type === 'link') return buildAnchor(value);
	return '';
}

function renderFragments(fragments) {
	return fragments.map((fragment) => renderInline(fragment)).join('');
}

function renderItem(item) {
	if (typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
	if (Array.isArray(item)) return `<li>${renderFragments(item)}</li>`;
	if (item?.html) return `<li>${item.html}</li>`;
	return '';
}

function buildDescription({ intro, sections = [] }) {
	const parts = [];

	if (intro) {
		parts.push(`<p>${renderFragments(Array.isArray(intro) ? intro : [intro])}</p>`);
	}

	for (const section of sections) {
		if (!section?.items?.length) continue;
		parts.push(`<h3>${escapeHtml(section.title)}</h3>`);
		parts.push(`<ul>${section.items.map((item) => renderItem(item)).join('')}</ul>`);
	}

	return parts.join('');
}

const updates = [
	{
		slug: '43rd-annual-ucr-powwow',
		description: buildDescription({
			intro:
				'The 43rd Annual UCR Powwow brings dancers, drums, Birdsingers, families, and community members together at the Riverside Sports Complex for a public weekend gathering on UC Riverside campus.',
			sections: [
				{
					title: 'Event details',
					items: [
						'Friday, May 22 through Sunday, May 24, 2026',
						'Hosted at the Riverside Sports Complex, 1000 W. Blaine Street in Riverside',
						'Free parking is available in Lot 26',
						'Admission is free and open to the public',
						'All dancers, drums, and Birdsingers are welcome'
					]
				}
			]
		})
	},
	{
		slug: 'save-the-date-2026-salmon-run',
		description: buildDescription({
			intro:
				'Save the date for the 2026 Salmon Run, a multi-day community gathering scheduled for late May.',
			sections: [
				{
					title: 'What is confirmed',
					items: [
						'The 2026 Salmon Run is scheduled for May 21 through May 24',
						'Additional schedule, location, and participation details are still to come'
					]
				}
			]
		})
	},
	{
		slug: 'uc-davis-big-time',
		description: buildDescription({
			intro:
				'The UC Davis Powwow Committee, American Indian Recruitment and Retention, and Native Dads Network invite the community to the first annual UC Davis Big Time, an evening gathering centered on culture, identity, and community.',
			sections: [
				{
					title: 'Event details',
					items: [
						'Saturday, April 3, 2026 from 5:00 PM to 11:00 PM',
						'Hosted at the University Credit Union Center, 750 Orchard Road in Davis',
						'Features Traditional California shake head dancers, local Native vendors, and community resource booths',
						'Welcomes families, friends, and community members for an evening celebration of resilience and tradition'
					]
				}
			]
		})
	},
	{
		slug: 'ucr-44th-annual-medicine-ways-conference',
		description: buildDescription({
			intro:
				"For more than four decades, UC Riverside's Native American Student Association and Native American Student Programs have hosted the annual Medicine Ways Conference, welcoming students, staff, faculty, and community members to a day of gathering and learning.",
			sections: [
				{
					title: 'What is confirmed',
					items: [
						'Saturday, April 4, 2026',
						'Hosted at the Student Success Center, UC Riverside',
						'Admission is free for students, faculty, staff, and community attendees',
						'The 2026 conference theme has not yet been announced'
					]
				}
			]
		})
	},
	{
		slug: 'earth-building-workshop',
		description: buildDescription({
			intro:
				"The Queer Sol Collective's Earth Building Workshop supports the early development of the Living Legacy program, a community-centered housing concept rooted in multigenerational care, ecological building practices, and culturally supportive space for vulnerable members of the 2SLGBTQ+ community.",
			sections: [
				{
					title: 'Workshop details',
					items: [
						'Led by Sage Stone Man',
						'Runs from 9:00 AM to 4:00 PM on April 4 and April 5, 2026',
						'Hosted in San Diego County',
						'Invites participants to join a hands-on workshop connected to the broader Living Legacy vision'
					]
				}
			]
		})
	},
	{
		slug: 'cal-poly-humboldt-california-indian-big-time-and-social-gathering',
		description: buildDescription({
			intro:
				'Cal Poly Humboldt hosts its annual California Indian Big Time and Social Gathering at the Forbes Complex West Gym in Arcata.',
			sections: [
				{
					title: 'Event details',
					items: [
						'This annual gathering is held each year on the first Saturday of the month',
						'Hosted by Cal Poly Humboldt ITEPP at the Forbes Complex West Gym, 1 Harpst Street in Arcata',
						[
							'Vendor applications are available through the official ',
							{
								type: 'link',
								label: 'vendor application form',
								href: 'https://docs.google.com/forms/d/e/1FAIpQLSe0xgl7S7v-vRKfIbKlI9F3ZdEfmgx5xxi-nJ7n5G2KO8SXGg/viewform?usp=publish-editor'
							},
							'.'
						]
					]
				}
			]
		})
	},
	{
		slug: 'uc-davis-50th-annual-powwow',
		description: buildDescription({
			intro:
				'The UC Davis 50th Annual Powwow returns to the University Credit Union Center for a full day of community gathering, celebration, and intertribal exchange.',
			sections: [
				{
					title: 'Event details',
					items: [
						'Saturday, April 4, 2026 from 11:00 AM to 9:00 PM',
						'Hosted at the University Credit Union Center in Davis',
						'The 2026 theme is Indigenous Resistance: Honoring the Past, Stewarding the Future',
						'Additional program details are still to come'
					]
				}
			]
		})
	}
];

async function main() {
	for (const update of updates) {
		const rows = await db`
			update events
			set description = ${update.description}, updated_at = now()
			where slug = ${update.slug}
			returning slug
		`;

		if (!rows[0]) {
			throw new Error(`No event row matched slug: ${update.slug}`);
		}

		console.log(`updated ${rows[0].slug}`);
	}
}

try {
	await main();
} finally {
	await db.end();
}
