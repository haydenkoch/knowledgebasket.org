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

function p(text) {
	return `<p>${escapeHtml(text)}</p>`;
}

function ul(items) {
	return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function body(...parts) {
	return parts.join('');
}

const updates = [
	{
		slug: 'future-imaginaries-indigenous-art-fashion-technology',
		description: body(
			p(
				'Future Imaginaries explores the rise of Futurism in contemporary Indigenous art as a means of enduring colonial trauma, creating alternative futures and advocating for Indigenous technologies in a more inclusive present and sustainable future. More than fifty artworks are on display, some interspersed throughout the museum, creating unexpected encounters and dialogues between contemporary Indigenous creations and historic Autry works. Artists such as Andy Everson, Ryan Singer and Neal Ambrose Smith wittily upend pop-culture icons by Indigenizing sci-fi characters and storylines; Wendy Red Star places Indigenous people in surreal spacescapes wearing fantastical regalia; Virgil Ortiz brings his own space odyssey, ReVOlt 1680/2180, to life in a new, site-specific installation. By intermingling science fiction, self-determination, and Indigenous technologies across a diverse array of Native cultures, Future Imaginaries envisions sovereign futures while countering historical myths and the ongoing impact of colonization, including environmental degradation and toxic stereotypes.'
			)
		)
	},
	{
		slug: 'rooted-in-place-california-native-art',
		description: body(
			p(
				'Part of the reimagining of our Arts of Indigenous America galleries, this is the first in a series of exhibitions that highlights specific regions of Native California. This installation explores the interconnections between art, ceremony, and the land in the Karuk, Yurok, Hupa, Tolowa, Tsnungwe, and Wiyot communities of northwestern California. The exhibition presents collection highlights alongside major loans, acquisitions, and commissions by contemporary artists.'
			)
		)
	},
	{
		slug: 'rose-b-simpson-lexicon',
		description: body(
			p(
				'This exhibition brings together two seemingly distinct art forms: Pueblo pottery and classic cars. In 2014, Rose B. Simpson, a mixed-media artist from Santa Clara Pueblo, New Mexico, refurbished a 1985 Chevy El Camino, transforming it with a black-on-black Tewa pottery motif. Simpson titled her work Maria in honor of renowned artist Maria Martinez (San Ildefonso Pueblo, 1887–1980), who popularized the distinctive black-on-black style. Ten years later, this exhibition debuts Simpson’s second customized car, Bosque, a 1964 Buick Riviera painted in vibrant polychrome. Both cars are presented against an expansive geometric design, evoking the environment of the Southwest and transforming Wilsey Court into a bold, contemporary expression of Pueblo pottery traditions. Through this use of scale and space, Simpson forges connections between the ancestral and contemporary, and forms a new visual vocabulary, or lexicon, to assert her cultural heritage and its continuity.'
			)
		)
	},
	{
		slug: 'good-fire-tending-native-lands',
		description: body(
			p(
				'Good Fire: Tending Native Lands explores how Native communities in Northern California have used controlled fire-also called "good fire" or "cultural burning"-to care for the land and sustain traditions for millennia. Organized in collaboration with Native Northern California fire practitioners, artists, ecologists, and cultural leaders, the exhibition reframes fire as not solely a destructive force, but as an essential tool for supporting healthy ecosystems and vibrant communities.'
			),
			p(
				'In this immersive exhibition, explore fire-dependent plants, regalia, basketry, videos of cultural burns, and artworks that help us understand how "good fire" benefits all life-humans, animals, and plants alike. Historical photographs, fire-scarred tree samples, and works by artists like Saif Azzuz (Yurok/Libyan), Renée Leann Castro-Ring (Lisjan Ohlone), and Brian D. Tripp (Karuk) highlight connections between the exclusion of Native peoples from their homelands and environmental decline. These elements illuminate ongoing efforts such as prairie restoration, Land Back campaigns, and the work of Native groups like the Cultural Fire Management Council.'
			),
			p(
				'Rooted in Native knowledge and stewardship, the exhibition challenges colonial narratives that have suppressed Native fire and land relationships in what is now known as Northern California. Good Fire: Tending Native Lands is ultimately a call to reimagine California’s relationship with fire, honoring Native sovereignty and building a future where fire once again sustains life.'
			)
		)
	},
	{
		slug: 'mom-m-wen-medicine-water-flowing-through-indian-country',
		description: body(
			p(
				'Momím Wené: Medicine Water tells a story of tribal relationships between the people and their waterways through the paintings, basketry, beadwork, and regalia of over 30 Native artists. Their work reflects the various tribal histories of California Indian Country, changing times, and lifeways. Arranged by the Shingle Springs Band of Miwok Indians, this exhibit began in central California and is now flowing to the home of the Ukiah Valley Pomo, where their regional voices will be added to the story.'
			)
		)
	},
	{
		slug: 'raymond-lebeau-field-s-of-view',
		description: body(
			p(
				'Roseville, CA - February 13, 2026 - Maidu Museum & Historic Site is pleased to announce the opening of Raymond LeBeau: Field(s) of View, a debut solo exhibition by Native Pit River artist, Raymond LeBeau. The exhibition will open with a reception on Saturday, March 7, 2026 from 5:00-7:00pm. Admission is free, refreshments will be provided, and all are welcome to celebrate! The exhibition will be on display through July 26, 2026.'
			),
			p(
				'Through paintings, drawings, maps, and found-object assemblages, Raymond LeBeau explores history, lived experiences, and the cultural influences that shape his world. LeBeau, a largely self-taught artist, utilizes humor, philosophy and human connection to create striking dichotomies that underscore ironies and absurdities woven throughout history and contemporary culture. Using pop culture iconography, religious imagery and protest signage, LeBeau addresses ideas of belief and warning, while also presenting the beauty of everyday moments, people, and his culture.'
			),
			p(
				'LeBeau’s work is, as he describes, "spontaneous and noisy." The installations are chaotic and perhaps nonsensical, but that is intentional. As he states art doesn’t need to "make sense" - often like the world we live in.'
			)
		)
	},
	{
		slug: '43rd-annual-ucr-powwow',
		eventUrl: 'https://nasp.ucr.edu/events/ucr-pow-wow',
		registrationUrl: null,
		hostOrg: 'Native American Student Programs, UC Riverside',
		location: 'Riverside Sports Complex, Riverside, CA',
		address: '1000 W. Blaine St, Riverside, CA 92507',
		startDate: '2026-05-23T00:00:00.000Z',
		endDate: '2026-05-24T20:00:00.000Z',
		description: body(
			p('Cahuilla Birdsingers'),
			ul([
				'May 22-24, 2026',
				'University of California, Riverside',
				'Riverside Sports Complex',
				'1000 W. Blaine St. Riverside, CA 92507',
				'Free Parking in Lot 26',
				'Admission is Free & Open to the Public',
				'All Dancers, Drums, and Birdsingers Welcome!!!'
			]),
			ul([
				'May 22nd - 5 p.m.: Bird Singing (Dancer Registration Opens)',
				'May 22nd - 6 p.m.: Gourd Dance',
				'May 22nd - 7 p.m.: Grand Entry',
				'May 23rd - 11 a.m.: Bird Singing',
				'May 23rd - 12 p.m.: Gourd Dance',
				'May 23rd - 5 p.m.: Bird Singing',
				'May 23rd - 6 p.m.: Coronation of New UCR Pow Wow Princess',
				'May 23rd - 1 p.m. & 7 p.m.: Grand Entry (Dancer Registrations closes at 1pm)',
				'May 24th - 11 a.m.: Danza Azteka Kalpulli Teuxihuitl',
				'May 24th - 12 p.m.: Gourd Dance',
				'May 24th - 1 p.m.: Grand Entry'
			])
		)
	},
	{
		slug: 'save-the-date-2026-salmon-run',
		eventUrl: 'https://www.instagram.com/p/DVNEl9rAccs/',
		hostOrg: 'Save California Salmon',
		location: 'Klamath River, CA',
		address: null,
		startDate: '2026-05-21T07:00:00.000Z',
		endDate: '2026-05-24T07:00:00.000Z',
		description: body(
			p('Save the date for the 2026 Salmon Run: May 21 - 24'),
			p('Stay tuned for updates!')
		)
	},
	{
		slug: 'uc-davis-big-time',
		eventUrl: 'https://www.ucdavis.edu/news/public-events-uc-davis-celebrate-cultures-communities',
		hostOrg:
			'UC Davis Powwow Committee, American Indian Recruitment & Retention (AIRR), and Native Dads Network',
		location: 'University Credit Union Center, Davis, CA',
		address: '750 Orchard Rd, Davis, CA 95616',
		description: body(
			p(
				'This inaugural Big Time at UC Davis will highlight California Native communities and traditions with shake-head dancing, Native vendors and community resource booths.'
			),
			p(
				'Big Time gatherings, a tradition among many California Native communities, serve as spaces for celebration, cultural expression and community resilience.'
			),
			p(
				'The Inaugural Big Time will be on Friday April 3rd, 2026 at the University Credit Union Center.'
			)
		)
	},
	{
		slug: 'ucr-44th-annual-medicine-ways-conference',
		eventUrl: 'https://nasp.ucr.edu/events/medicine-ways-conference',
		hostOrg:
			'Native American Student Association and Native American Student Programs, UC Riverside',
		location: 'Student Success Center, UC Riverside, Riverside, CA',
		address: '900 University Ave, Riverside, CA 92521',
		description: body(
			p(
				'For over four decades, UCR\'s Native American Student Association and Native American Student Programs have hosted the annual Medicine Ways Conference. Featured guests from across the nation are invited to partake in this event and admission is free to our students, faculty, staff, and community. This year\'s Medicine Ways Conference theme "Stories Passed Around the Fire".'
			),
			p(
				'Time Saturday, April 4, 2026 Theme "Stories Passed Around the Fire" Student Success Center (SSC)'
			),
			ul([
				'8:30am - 9:30am Registration and Breakfast',
				'9:30am - 10:00am Welcome, Blessing, and Birdsongs Michael Madrigal (Cahuilla)',
				'10:15am - 11:00am Keynote Speaker William Bauer (Round Valley Indian Tribes)',
				"11:10am - 12:00pm Keynote Speaker James Yee (Kaswa' Chumash)",
				'12:00pm - 1:00pm Lunch',
				'1:00pm - 1:50pm Pottery Workshop Izzi Reyes (Mexican Kikapú/Lepaí Ndé)',
				"1:00pm - 1:50pm NASA Ink Stamping Alikoi Parra (Kaswa' Chumash) and Francine Phillips (Fort Yuma Quechan Indian Tribe)",
				'1:50pm - 2:00pm Closing'
			])
		)
	},
	{
		slug: 'earth-building-workshop',
		eventUrl: 'https://newsfromnativecalifornia.com/event/earth-building-workshop/',
		location: 'San Diego County, CA',
		address: null,
		description: body(
			p(
				'queer sol’s LIVING LEGACY program is in its early building stages, inviting those with the heart to join and become a part of this epic endeavor: helping to build a new world, together.'
			),
			p(
				'This program is a community centered, multi-generational, eco-conscious housing concept that stems from the need to provide culturally supportive housing access to some of the most vulnerable members of the 2SLGBTQ+ community.'
			),
			p(
				'if this sounds like something you want to be a part of, join this workshop! led by the incredibly talented and beautiful soul sibling @sagestoneman'
			),
			p('Workshop takes place 9am-4pm on April 4th and 5th, 2026 in San Diego County.')
		)
	},
	{
		slug: 'cal-poly-humboldt-california-indian-big-time-and-social-gathering',
		eventUrl: 'https://www.humboldt.edu/itepp/california-indian-big-time-social-gathering',
		description: body(
			p('Save the Date: April 4th, 2026'),
			p(
				'The annual California Indian Big Time & Social Gathering is held each year on the first Saturday of the month.'
			)
		)
	},
	{
		slug: 'uc-davis-50th-annual-powwow',
		eventUrl: 'https://ccc.ucdavis.edu/programs-and-services/culture-days/powwow',
		location: 'University Credit Union Center, Davis, CA',
		address: '750 Orchard Rd, Davis, CA 95616',
		description: body(
			p(
				'Powwow, as practiced today, is a social gathering intended to provide the campus and local community a space to learn about, engage with, and celebrate the traditions and cultures of Indigenous peoples, and bring visibility to the vibrancy of Native American music, dance, and arts. Held in 1969, the first UC Davis Powwow was hosted in conjunction with the creation of the Native American Studies Department and has since been the culminating event for the Native American Culture Days events and programs.'
			),
			p(
				'The UC Davis Powwow is student-run and student-planned, standing as one of the longest running student powwows in California.'
			),
			p(
				'Those who serve on the UC Davis Powwow Committee are able to maintain their roots and build a stronger connection to their Indigenous identities, while navigating a Western educational institution. The annual event has gained national recognition for hosting vendors, dancers, judges, head staff, drum groups, and attendees from both California and all throughout Indian Country.'
			),
			p(
				'The UC Davis Powwow also benefits the campus community by promoting cross-cultural communication and alliances and supporting both the recruitment and retention of Native American students at UC Davis. Altogether, everything put into preparing and holding the annual UC Davis Powwow affords the opportunity for the campus and local Native community to build connections to address the social, cultural, historical and political issues facing Indigenous people today.'
			),
			p('All are welcome to join us at the Annual UC Davis Powwow.'),
			p(
				'The 50th Annual Powwow will be on Saturday April 4th, 2026, at the University Credit Union Center.'
			)
		)
	},
	{
		slug: 'cultural-protocols-community-response-community-gathering',
		registrationUrl:
			'https://docs.google.com/forms/d/e/1FAIpQLSfCSbvU_CPIT4lVXBkx1cgQ5Z6BFjHztMR0cdmLkeejpHO04A/viewform',
		description: body(
			p(
				'Join us for the Community Gathering, rooted in honoring and remembering our relatives, strengthening sovereignty, and uplifting cultural healing and community care.'
			),
			p(
				'Join families, survivors, cultural and spiritual leaders, and community partners for prayer, cultural practices, youth and family activities, and shared dialogue rooted in respect and tradition addressing the MMIP crisis.'
			),
			p(
				'We invite you to confirm your attendance to the MMIW/R community gathering by submitting your RSVP.'
			)
		)
	},
	{
		slug: 'native-americans-in-philanthropy-s-2026-annual-conference',
		description: body(
			p(
				'The Native Americans in Philanthropy 2026 Annual Conference brings together a community of leaders, practitioners, and learners at the intersection of philanthropy, Native advocacy, and Tribal sovereignty to collaborate on ways to be involved in the movement to Indigenize Philanthropy.'
			),
			p(
				'With a firm grounding in Indigenous cultures, the NAP conference honors the past, celebrates the present, and charts the map to the future - together.'
			),
			p(
				'These Tours are designed to give conference attendees the opportunity to learn more about the local community in the Inland Empire. They will be hosted by local community organizations located in the nearby area. Shuttles will be available to transport conference attendees to and from the Tours on April 14, 2026.'
			),
			p('A full map of the conference will be available on the Whova app.')
		)
	},
	{
		slug: 'carmel-band-of-rumsen-indians-community-gathering-and-powwow',
		description: body(
			p('Save the Date! Friday April 17th - Sunday April 19th 2026, Arcadia County Park.')
		)
	},
	{
		slug: 'comic-creation',
		description: body(
			p(
				'Explore the art of storytelling through illustrations and dialogue. From developing compelling characters and plots to mastering visual techniques and panel layout, this workshop will guide you through every step of creating a unique comic!'
			),
			p('Taught by Native American artist, Devaney Rain Royalty (Ponca/Cree/Tsalagi/Gaelic).')
		)
	},
	{
		slug: 'garden-box-workshop',
		description: body(
			p(
				'Learn to build your own Garden Box and get ready to plant for spring/summer! Limited Supplies available so sign up early!'
			),
			ul([
				'Saturday April 18th - 10 am - 3 pm',
				'Sunday April 19th - 10am - 3 pm',
				'Limit 20 participants per day',
				'Located in Crescent City at the DNIEC - 888 4th St. Crescent City, CA'
			])
		)
	},
	{
		slug: 'agave-roast-native-food-tasting-event-at-malki-museum',
		description: body(
			p(
				'Hello Malki Museum Supporters,We are excited to bring a bountiful and educational Agave Roast for the year of 2026!'
			),
			p(
				'PLEASE NOTE THAT WE WILL NOT BE HAVING THE VOLUNTEER HARVESTING DAY FOR THE YEAR OF 2026.'
			),
			p(
				'We wanted to share an informative presentation which gives facts about the desert agave and also the Cahuilla’s use of this helpful plant. We encourage everyone who is interested in learning about the desert Agave and the Malki Museum Agave and Roast history to take a look. We are thankful to have such great resources available at the museum to help create this presentation so please review the "Resources" portion at the end of the presentation to find out what resources were used.'
			),
			p(
				'The Agave Harvest and Tasting is an annual event sponsored by the Malki Museum. It is held on two consecutive Saturdays in mid- to late-April, when the Agave plants were traditionally gathered. The agave or amul was a basic food staple for the Cahuilla and Kumeyaay Indians of Southern California.'
			),
			p(
				"The harvested agave is brought back to the Malki Museum for the Agave Roast, held the following Saturday. The agave hearts are cooked in a traditional roasting pit and served with other customary Native foods. There are also community organization's presenting on Native plants and animals."
			)
		)
	},
	{
		slug: 'sherman-indian-school-powwow',
		description: body(
			p("Sherman's 40th Annual Pow Wow"),
			ul([
				'In-Person',
				'General Event',
				'Starts Saturday, April 18, 2026',
				'Time 11:00 am Pacific',
				'Ends Saturday, April 18, 2026',
				'Time 10:00 pm Pacific',
				'Physical Location',
				'9010 Magnolia Ave',
				'Riverside CA 92503'
			])
		)
	},
	{
		slug: 'yoom-n-a-celebration-of-spring',
		description: body(
			p(
				'Yoomén celebrates the coming of spring, a welcome time of new growth, and the guarantee of fresh foods and warmer weather. The cultural event features Native American performers and cultural demonstrators who showcase their exquisite skills working with natural materials to create baskets, jewelry, tools and more! The local Native artist community will also have artwork on view in the museum, and crafts and other goods will be sold by Native artisans. Native-inspired art and game stations for children and guided tours of the museum and site will also be available, including tours of the site’s famous ancient petroglyphs.'
			),
			p(
				'This popular annual event is FREE to the public as we strive to remain an accessible learning center for all!'
			)
		)
	},
	{
		slug: 'indigenous-stories-film-festival-and-art-walk',
		description: body(
			p('The Indigenous Stories Film Festival & Art Walk is BACK and bigger than ever!'),
			p(
				'Join us for our 2nd Annual celebration of Indigenous creativity, culture, and community on May 1st at the Rincon Government Center.'
			),
			ul([
				'Indigenous-Made Films',
				'Experience powerful stories told by Indigenous directors, creators, and communities-highlighting culture, resilience, and authentic lived experiences on screen.',
				'Filmmaker Panels',
				'Hear directly from the storytellers! Filmmakers will share behind-the-scenes insights, creative processes, and inspiration that shaped their work.',
				'Community Panels',
				'Engage in meaningful conversations with community youth members about representation, storytelling, and the importance of Indigenous voices in media.',
				'Huge Raffles',
				'Win incredible prizes throughout the event!',
				'Art Walk + Art Contest',
				'Explore an outdoor walk showcasing Indigenous artists from across the region-plus an art contest celebrating creativity in all forms.',
				'Pre-register using the QR code or Linktree to secure your spot before space runs out!',
				'We can’t wait to share this unforgettable day with you.'
			])
		)
	},
	{
		slug: '41st-annual-ucla-powwow',
		description: body(
			p(
				'Save the date!! Our 41st annual UCLA Powwow hosted by the American Indian Student Association will take place on May 2nd 10am-10pm & May 3rd 10am-6pm!'
			),
			p('It will be located in the Wallis Annenberg Stadium. We hope to see you all there!!')
		)
	},
	{
		slug: '51st-cupa-days',
		description: body(
			p(
				'The Pala Band of Mission Indians and the Cupa Cultural Center announce the 51st Cupa Days, which will take place on Saturday, May 2, 2026, from 10:00 a.m. to dusk, and Sunday, May 3, 2026, from 11:00 a.m. to 4:30 p.m. at the Cupa Cultural Center Grounds.'
			),
			p(
				'The Cupa Cultural Center’s dedication to protecting traditions and preserving history is best illustrated in the annual Cupa Days celebration, which takes place during the first weekend of May. This celebration, which has been held every year since 1974, commemorates the tragic removal of the Cupeño people from their ancestral village of Cupa in May 1903. In the spirit of cultural sharing, Cupa Days features traditional performances from various native groups. The event also features arts and crafts vendors and food booths.'
			)
		)
	},
	{
		slug: 'mmip-awareness-day-and-walk',
		description: body(
			p('Please join us May 5th for the Yurok MMIP Awareness Day & Walk.'),
			p(
				"This event will be held at the Adorni Center in Eureka from 12:30-4:30pm. This will be a powerful day of remembrance for missing and murdered Indigenous people with prayer, walk, speakers and dinner. To' Kee Skuy' Soo Ney-Wo-Chek'."
			)
		)
	},
	{
		slug: 'drop-in-days-at-agua-caliente-cultural-museum',
		description: body(
			p('Museum admission is $10 for adults 18+'),
			ul([
				'Museum admission is $5 for:',
				'Children 6-17',
				'Seniors 65+',
				'Students with valid student ID'
			]),
			ul([
				'Museum admission is free for:',
				'Agua Caliente Tribal members and guests of tribal members',
				'Children under 6',
				'Museum pass holders and guests of museum pass holders'
			])
		)
	},
	{
		slug: '4th-annual-california-indian-studies-conference-and-gathering',
		eventUrl: 'https://www.californiaindianstudies.org/conferencesymposium.html',
		description: body(
			p(
				'The California Indian Studies Conference and Gathering is set to be hosted in Patwin homelands at UC Davis.'
			),
			p('More info to come!')
		)
	},
	{
		slug: 'native-arts-festival',
		description: body(
			p(
				'Our Native Arts Festival is a vibrant celebration of Native art, artists, and community. This annual gathering brings together Native and non-Native community members in a shared space of respect, learning, and connection. Guests will experience powerful performances by Native dancers, singers, and storytellers, explore traditional and contemporary artwork from talented Native artists and painters, and enjoy cultural food and community engagement. The festival is a meaningful opportunity to uplift Native voices, promote artistic expression, and strengthen relationships across our broader community. All are welcome to join us in honoring creativity, culture, and connection.'
			)
		)
	},
	{
		slug: 'elderberry-clapper-stick-workshop',
		description: body(
			p('Make your own elderberry clapper stick.'),
			p(
				'Workshop attendees will discover the traditions and history of this California Indigenous musical instrument and also shape, decorate and assemble their own instrument to take home.'
			)
		)
	},
	{
		slug: 'uc-san-diego-14th-annual-powwow',
		description: body(
			p('Save the Date'),
			p('Join us at UC San Diego 14th Annual Powwow on May 17, 2026!'),
			p('All are welcome! Stay tuned for more details!')
		)
	}
];

async function getEventBySlug(slug) {
	const rows = await db`
		select *
		from events
		where slug = ${slug}
		limit 1
	`;
	return rows[0] ?? null;
}

async function applyUpdate(update) {
	const current = await getEventBySlug(update.slug);
	if (!current) {
		throw new Error(`No event row matched slug: ${update.slug}`);
	}

	const eventUrl = Object.prototype.hasOwnProperty.call(update, 'eventUrl')
		? update.eventUrl
		: current.event_url;
	const registrationUrl = Object.prototype.hasOwnProperty.call(update, 'registrationUrl')
		? update.registrationUrl
		: current.registration_url;
	const hostOrg = Object.prototype.hasOwnProperty.call(update, 'hostOrg')
		? update.hostOrg
		: current.host_org;
	const location = Object.prototype.hasOwnProperty.call(update, 'location')
		? update.location
		: current.location;
	const address = Object.prototype.hasOwnProperty.call(update, 'address')
		? update.address
		: current.address;
	const startDate = Object.prototype.hasOwnProperty.call(update, 'startDate')
		? update.startDate
			? new Date(update.startDate)
			: null
		: current.start_date;
	const endDate = Object.prototype.hasOwnProperty.call(update, 'endDate')
		? update.endDate
			? new Date(update.endDate)
			: null
		: current.end_date;

	const rows = await db`
		update events
		set
			description = ${update.description ?? current.description},
			event_url = ${eventUrl},
			registration_url = ${registrationUrl},
			host_org = ${hostOrg},
			location = ${location},
			address = ${address},
			start_date = ${startDate},
			end_date = ${endDate},
			updated_at = now()
		where slug = ${update.slug}
		returning slug
	`;

	if (!rows[0]) {
		throw new Error(`Update failed for slug: ${update.slug}`);
	}

	console.log(`updated ${rows[0].slug}`);
}

async function main() {
	for (const update of updates) {
		await applyUpdate(update);
	}

	console.log(`\nReconciled ${updates.length} event records with official-source copy.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.end();
	});
