#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const db = postgres(DATABASE_URL);

const organizationDefinitions = [
	{
		slug: 'indigenous-justice',
		name: 'Indigenous Justice',
		description:
			'Indigenous Justice is an Indigenous-led California organization advancing safety, healing, sovereignty, and justice for Indigenous peoples and communities.',
		website: 'https://www.indigenousjustice.org/',
		orgType: 'Nonprofit',
		region: 'California'
	},
	{
		slug: 'native-americans-in-philanthropy',
		name: 'Native Americans in Philanthropy',
		description:
			'Native Americans in Philanthropy is an Indigenous-led network connecting Tribal nations, Native nonprofits, and philanthropy to move resources in support of Native sovereignty and community priorities.',
		website: 'https://nativephilanthropy.org/',
		email: 'events@nativephilanthropy.org',
		orgType: 'Association'
	},
	{
		slug: 'carmel-band-of-rumsen-indians',
		name: 'Carmel Band of Rumsen Indians',
		description:
			'The Carmel Band of Rumsen Indians is a Tribal community working to sustain Rumsen Ohlone culture, community visibility, and ancestral relationships in Monterey County and beyond.',
		website: 'https://www.carmelbandofrumsenindians.com/',
		orgType: 'Tribal Government',
		tribalAffiliation: 'Rumsen Ohlone'
	},
	{
		slug: 'sherman-indian-high-school',
		name: 'Sherman Indian High School',
		description:
			'Sherman Indian High School is a Bureau of Indian Education boarding school in Riverside serving Native students and hosting community-centered cultural programming.',
		website: 'https://sih.bie.edu/',
		orgType: 'School',
		city: 'Riverside',
		state: 'CA'
	},
	{
		slug: 'maidu-museum-historic-site',
		name: 'Maidu Museum & Historic Site',
		aliases: ['Maidu Museum and Historic Site', 'Maidu Museum'],
		description:
			'Maidu Museum & Historic Site preserves and shares Maidu history, art, and place-based knowledge through exhibitions, education, and public programming in Roseville.',
		website:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site',
		orgType: 'Museum',
		region: 'Sacramento Valley',
		city: 'Roseville',
		state: 'CA'
	},
	{
		slug: 'northern-california-indian-development-council',
		name: 'Northern California Indian Development Council',
		aliases: ['NCIDC'],
		description:
			'Northern California Indian Development Council delivers community, economic development, education, and family support programs for Native communities across Northern California.',
		website: 'https://ncidc.org/',
		orgType: 'Nonprofit',
		region: 'North Coast'
	},
	{
		slug: 'malki-museum',
		name: 'Malki Museum',
		description:
			'Malki Museum is a Native-founded museum on the Morongo Reservation preserving and sharing Cahuilla history, collections, and cultural knowledge.',
		website: 'https://malkimuseum.org/',
		orgType: 'Museum',
		region: 'Southern California',
		city: 'Banning',
		state: 'CA',
		tribalAffiliation: 'Cahuilla'
	},
	{
		slug: 'indian-health-council',
		name: 'Indian Health Council',
		aliases: ['Indian Health Council, Inc.', 'IHC'],
		description:
			'Indian Health Council is a tribally governed health organization serving Native communities in San Diego County through health care, wellness, and community programming.',
		website: 'https://www.indianhealth.com/',
		orgType: 'Health Organization',
		region: 'Southern California',
		city: 'Valley Center',
		state: 'CA'
	},
	{
		slug: 'ucla-american-indian-student-association',
		name: 'UCLA American Indian Student Association',
		aliases: ['American Indian Student Association', 'AISA at UCLA'],
		description:
			'UCLA American Indian Student Association is a Native student organization that builds community on campus and hosts the annual UCLA Powwow.',
		website: 'https://community.ucla.edu/studentorg/2509',
		orgType: 'Student Organization',
		region: 'Southern California',
		city: 'Los Angeles',
		state: 'CA'
	},
	{
		slug: 'pala-band-of-mission-indians',
		name: 'Pala Band of Mission Indians',
		description:
			'The Pala Band of Mission Indians is a sovereign Tribal nation stewarding cultural, civic, and community life in Pala and hosting public cultural gatherings including Cupa Days.',
		website: 'https://www.palatribe.com/',
		orgType: 'Tribal Government',
		region: 'Southern California',
		city: 'Pala',
		state: 'CA'
	},
	{
		slug: 'yurok-tribe',
		name: 'Yurok Tribe',
		description:
			'The Yurok Tribe is a sovereign Tribal nation in Northern California advancing cultural revitalization, environmental stewardship, and community wellbeing.',
		website: 'https://www.yuroktribe.org/',
		orgType: 'Tribal Government',
		region: 'North Coast'
	},
	{
		slug: 'agua-caliente-cultural-museum',
		name: 'Agua Caliente Cultural Museum',
		description:
			'Agua Caliente Cultural Museum shares the history, culture, and living traditions of the Agua Caliente Band of Cahuilla Indians through exhibitions and public programs.',
		website: 'https://www.accmuseum.org/',
		orgType: 'Museum',
		region: 'Southern California',
		city: 'Palm Springs',
		state: 'CA',
		tribalAffiliation: 'Agua Caliente Band of Cahuilla Indians'
	},
	{
		slug: 'california-indian-studies-scholars-association',
		name: 'California Indian Studies & Scholars Association',
		aliases: ['CISSA'],
		description:
			'California Indian Studies & Scholars Association convenes scholars, students, artists, and community members to strengthen California Indian studies and relationships grounded in Indigenous knowledge.',
		website: 'https://www.californiaindianstudies.org/',
		orgType: 'Association'
	},
	{
		slug: 'progressive-tribal-alliance',
		name: 'Progressive Tribal Alliance',
		description:
			'Progressive Tribal Alliance is a Windsor-based Native-led nonprofit creating cultural, civic, and arts programming for Indigenous communities and the broader public.',
		website: 'https://progressivetribalalliance.com/',
		orgType: 'Nonprofit',
		region: 'North Bay',
		city: 'Windsor',
		state: 'CA'
	},
	{
		slug: 'intertribal-resource-center-uc-san-diego',
		name: 'Intertribal Resource Center, UC San Diego',
		aliases: ['Intertribal Resource Center', 'ITRC UC San Diego'],
		description:
			'The Intertribal Resource Center at UC San Diego supports Native and Indigenous student life, cultural programming, and community-centered campus events.',
		website: 'https://itrc.ucsd.edu/',
		orgType: 'University Program',
		region: 'Southern California',
		city: 'La Jolla',
		state: 'CA'
	},
	{
		slug: 'autry-museum-of-the-american-west',
		name: 'Autry Museum of the American West',
		aliases: ['Autry Museum'],
		description:
			'Autry Museum of the American West is a Los Angeles museum presenting art, history, and culture of the American West with strong Native and Indigenous programming.',
		website: 'https://theautry.org/',
		orgType: 'Museum',
		region: 'Southern California',
		city: 'Los Angeles',
		state: 'CA'
	},
	{
		slug: 'de-young-museum',
		name: 'de Young Museum',
		aliases: ['de Young'],
		description:
			'de Young Museum is a San Francisco museum presenting global art and major exhibitions, including installations focused on Native California art and artists.',
		website: 'https://www.famsf.org/visit/de-young',
		orgType: 'Museum',
		region: 'Bay Area',
		city: 'San Francisco',
		state: 'CA'
	},
	{
		slug: 'oakland-museum-of-california',
		name: 'Oakland Museum of California',
		aliases: ['OMCA'],
		description:
			'Oakland Museum of California explores California art, history, and natural sciences through exhibitions and public programs rooted in community collaboration.',
		website: 'https://museumca.org/',
		orgType: 'Museum',
		region: 'Bay Area',
		city: 'Oakland',
		state: 'CA'
	},
	{
		slug: 'grace-hudson-museum-sun-house',
		name: 'Grace Hudson Museum & Sun House',
		description:
			'Grace Hudson Museum & Sun House presents art, regional history, and Native-focused exhibitions in Ukiah with programming grounded in local relationships and collections.',
		website: 'https://www.gracehudsonmuseum.org/',
		orgType: 'Museum',
		region: 'North Coast',
		city: 'Ukiah',
		state: 'CA'
	}
];

const venueDefinitions = [
	{
		slug: 'riverside-convention-center',
		name: 'Riverside Convention Center',
		address: '3637 5th St',
		city: 'Riverside',
		state: 'CA',
		zip: '92501',
		website: 'http://riversidecvb.com/conventioncenter/',
		venueType: 'Convention Center'
	}
];

const venueOwnership = [
	['autry-museum-of-the-american-west', 'autry-museum-of-the-american-west'],
	['de-young-museum', 'de-young-museum'],
	['oakland-museum-of-california', 'oakland-museum-of-california'],
	['grace-hudson-museum-sun-house', 'grace-hudson-museum-sun-house'],
	['maidu-museum-historic-site', 'maidu-museum-historic-site'],
	['maidu-activity-center', 'maidu-museum-historic-site'],
	['del-norte-indian-education-center', 'northern-california-indian-development-council'],
	['malki-museum', 'malki-museum'],
	['rincon-government-center', 'indian-health-council'],
	['sherman-indian-high-school', 'sherman-indian-high-school'],
	['agua-caliente-cultural-museum', 'agua-caliente-cultural-museum'],
	['cupa-cultural-center-grounds', 'pala-band-of-mission-indians']
];

const eventUpdates = [
	{
		slug: 'cultural-protocols-community-response-community-gathering',
		organizationSlug: 'indigenous-justice',
		eventUrl: 'https://www.indigenousjustice.org/events',
		description: buildDescription({
			intro:
				'This Fresno County community gathering is rooted in honoring and remembering Indigenous relatives while strengthening sovereignty, cultural healing, and community response.',
			sections: [
				{
					title: 'What to expect',
					items: [
						'Families, survivors, cultural and spiritual leaders, and community partners gathering in prayer and support',
						'Space for cultural practices, youth participation, and community care',
						'A Native-led day centered on Indigenous safety, remembrance, and collective healing at Choinumni Park'
					]
				}
			]
		})
	},
	{
		slug: 'native-americans-in-philanthropy-s-2026-annual-conference',
		organizationSlug: 'native-americans-in-philanthropy',
		venueSlug: 'riverside-convention-center',
		eventUrl: 'https://conference.nativephilanthropy.org/savethedate',
		registrationUrl: 'https://nativeamericansinphilanthropy.regfox.com/napcon26',
		contactEmail: 'events@nativephilanthropy.org',
		description: buildDescription({
			intro:
				"Native Americans in Philanthropy's 2026 Annual Conference convenes Tribal leaders, Native nonprofits, advocates, funders, and partners in Riverside for three days focused on Indigenous values, Tribal sovereignty, and movement-building in philanthropy.",
			sections: [
				{
					title: 'Conference highlights',
					items: [
						'Attendee community includes Tribal leaders, Native and Tribal professionals in philanthropy, Native advocacy leaders, young leaders, Elders, and non-Native partners working with Native communities',
						'Learning Tours are available on April 14, 2026 with shuttle transportation to Inland Empire community organizations',
						'The full agenda and venue map are published through the conference Whova app'
					]
				},
				{
					title: 'Registration notes',
					items: [
						'Conference registration opens through the official NAP RegFox page',
						'Learning Tours carry an additional $100 fee',
						'The conference experience includes Whova-based agenda and venue details for registered attendees'
					]
				}
			]
		})
	},
	{
		slug: 'carmel-band-of-rumsen-indians-community-gathering-and-powwow',
		organizationSlug: 'carmel-band-of-rumsen-indians',
		eventUrl:
			'https://newsfromnativecalifornia.com/event/carmel-band-of-rumsen-indians-community-gathering-and-powwow/',
		description: buildDescription({
			intro:
				'The Carmel Band of Rumsen Indians Community Gathering and Powwow returns to Arcadia County Park for a three-day public gathering led by the Carmel Band of Rumsen Indians.',
			sections: [
				{
					title: 'What is confirmed',
					items: [
						'Save-the-date announcement for Friday, April 17 through Sunday, April 19, 2026',
						'Hosted by the Carmel Band of Rumsen Indians at Arcadia County Park in Arcadia',
						'A community powwow weekend bringing together dancers, singers, families, vendors, and supporters'
					]
				}
			]
		})
	},
	{
		slug: 'sherman-indian-school-powwow',
		organizationSlug: 'sherman-indian-high-school',
		eventUrl: 'https://sih.bie.edu/events/shermans-40th-annual-pow-wow',
		startDate: '2026-04-18T18:00:00.000Z',
		endDate: '2026-04-19T05:00:00.000Z',
		description: buildDescription({
			intro:
				"Sherman Indian High School's 40th Annual Pow Wow is an in-person day of intertribal gathering, school tradition, and community celebration on the Sherman campus in Riverside.",
			sections: [
				{
					title: 'Event details',
					items: [
						'Saturday, April 18, 2026 from 11:00 AM to 10:00 PM Pacific',
						'Hosted at Sherman Indian High School, 9010 Magnolia Avenue in Riverside',
						'Welcomes students, families, singers, dancers, vendors, and community supporters'
					]
				}
			]
		})
	},
	{
		slug: 'comic-creation',
		organizationSlug: 'maidu-museum-historic-site',
		eventUrl:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/events_exhibits',
		registrationUrl:
			'https://anc.apm.activecommunities.com/cityofroseville/activity/search/detail/14274?onlineSiteId=0&from_original_cui=true&locale=en-US',
		ageRestriction: 'Ages 6-12',
		audience: 'Youth ages 6-12',
		description: buildDescription({
			intro:
				'Comic Creation is a hands-on Maidu Museum workshop for ages 6-12 where participants learn visual storytelling with Native artist Devaney Rain Royalty.',
			sections: [
				{
					title: 'Workshop focus',
					items: [
						'Introduces panel layout, dialogue, storytelling, and comic-making techniques',
						'Led by Native artist Devaney Rain Royalty',
						'Registration is handled through the City of Roseville activity portal'
					]
				}
			]
		})
	},
	{
		slug: 'garden-box-workshop',
		organizationSlug: 'northern-california-indian-development-council',
		eventUrl: 'https://ncidc.org/event/garden-box-workshop-crescent-city',
		registrationUrl: 'https://go.ncidc.org/planters',
		capacity: 20,
		description: buildDescription({
			intro:
				"NCIDC's Garden Box Workshop in Crescent City gives community members a hands-on chance to build a planter box and get ready for spring and summer planting.",
			sections: [
				{
					title: 'Workshop details',
					items: [
						'Runs Saturday, April 18 and Sunday, April 19 from 10:00 AM to 3:00 PM',
						'Limited to 20 participants per day',
						'Hosted at the Del Norte Indian Education Center, 888 4th Street in Crescent City'
					]
				}
			]
		})
	},
	{
		slug: 'agave-roast-native-food-tasting-event-at-malki-museum',
		organizationSlug: 'malki-museum',
		eventUrl: 'https://malkimuseum.org/pages/agave-roast',
		cost: 'Free',
		description: buildDescription({
			intro:
				"Malki Museum's 2026 Agave Roast brings museum supporters and community members together for Native food education centered on desert agave and Cahuilla foodways.",
			sections: [
				{
					title: 'Event details',
					items: [
						'Features an educational agave-focused presentation along with the annual roast',
						'Free admission with a suggested $15 donation per food plate',
						'The 2026 season will not include a volunteer harvesting day'
					]
				}
			]
		})
	},
	{
		slug: 'yoom-n-a-celebration-of-spring',
		organizationSlug: 'maidu-museum-historic-site',
		eventUrl: 'https://www.roseville.ca.us/residents/city_events/yoomen',
		startDate: '2026-04-25T16:00:00.000Z',
		endDate: '2026-04-25T22:00:00.000Z',
		description: buildDescription({
			intro:
				"Yoomen: A Celebration of Spring is the Maidu Museum & Historic Site's annual public cultural event welcoming spring with Native arts, performance, and community gathering.",
			sections: [
				{
					title: 'Event details',
					items: [
						'Saturday, April 25, 2026 from 9:00 AM to 3:00 PM',
						'Free to the public',
						"Features Native performers, cultural demonstrators, Native artisan booths, children's art and game stations, and guided tours including the site's petroglyphs"
					]
				}
			]
		})
	},
	{
		slug: 'indigenous-stories-film-festival-and-art-walk',
		organizationSlug: 'indian-health-council',
		eventUrl: 'https://www.indianhealth.com/post/indigenous-stories-film-festival-1',
		registrationUrl: 'https://forms.monday.com/forms/0c97b357a816060e45b1ff834c8b6dce?r=use1',
		contactPhone: '760-749-1410',
		description: buildDescription({
			intro:
				"Indian Health Council's Indigenous Stories Film Festival and Art Walk is a second annual celebration of Indigenous creativity, culture, and community at the Rincon Government Center.",
			sections: [
				{
					title: 'Festival highlights',
					items: [
						'Indigenous-made films centering culture, resilience, and lived experience',
						'Filmmaker panels and community youth panels on representation and storytelling',
						'Art Walk and art contest featuring Indigenous artists from across the region',
						'Huge raffles and community gathering throughout the evening'
					]
				},
				{
					title: 'Registration note',
					items: ['Pre-registration is available through the official Monday.com signup form']
				}
			]
		})
	},
	{
		slug: '41st-annual-ucla-powwow',
		organizationSlug: 'ucla-american-indian-student-association',
		eventUrl: 'https://www.instagram.com/p/DToqpJGFJMi/',
		startDate: '2026-05-02T17:00:00.000Z',
		endDate: '2026-05-04T01:00:00.000Z',
		contactEmail: 'theuclapowwow@gmail.com',
		description: buildDescription({
			intro:
				"UCLA's 41st Annual Powwow, hosted by the American Indian Student Association, returns to Wallis Annenberg Stadium for two days of intertribal gathering and campus community.",
			sections: [
				{
					title: 'Event details',
					items: [
						'Saturday, May 2 from 10:00 AM to 10:00 PM',
						'Sunday, May 3 from 10:00 AM to 6:00 PM',
						'Hosted at Wallis Annenberg Stadium and open to the broader community',
						'Presented by the UCLA American Indian Student Association as a campus and community gathering'
					]
				}
			]
		})
	},
	{
		slug: '51st-cupa-days',
		organizationSlug: 'pala-band-of-mission-indians',
		eventUrl: 'https://www.palatribe.com/2026/03/06/announcement-51st-cupa-days/',
		startDate: '2026-05-02T17:00:00.000Z',
		endDate: '2026-05-03T23:30:00.000Z',
		contactName: "Na'Leigha Aguayo",
		contactEmail: 'naguayo@palatribe.com',
		contactPhone: '760-891-3590',
		description: buildDescription({
			intro:
				'The 51st Cupa Days, hosted by the Pala Band of Mission Indians and the Cupa Cultural Center, welcomes the public for a weekend of culture, food, games, and community gathering in Pala.',
			sections: [
				{
					title: 'Weekend schedule',
					items: [
						'Saturday, May 2 from 10:00 AM to dusk',
						'Sunday, May 3 from 11:00 AM to 4:30 PM',
						'Hosted at the Cupa Cultural Center Grounds'
					]
				},
				{
					title: 'What to expect',
					items: [
						'Cultural entertainment, Native arts and crafts, Cupa tacos, and Peon games',
						'No drugs, alcohol, vaping, or smoking permitted at the event',
						'Hosted as a public weekend gathering on the Cupa Cultural Center Grounds'
					]
				}
			]
		})
	},
	{
		slug: 'mmip-awareness-day-and-walk',
		organizationSlug: 'yurok-tribe',
		eventUrl:
			'https://www.facebook.com/TheYurokTribe/photos/please-join-us-may-5th-for-the-yurok-mmip-awareness-day-walk-this-event-will-be-/1371207611707043/',
		description: buildDescription({
			intro:
				"The Yurok Tribe's MMIP Awareness Day and Walk brings community members together in Eureka for prayer, remembrance, speakers, visibility, and support for Missing and Murdered Indigenous People awareness.",
			sections: [
				{
					title: 'Event details',
					items: [
						'Tuesday, May 5 from 12:30 PM to 4:30 PM at the Adorni Center in Eureka',
						'Community-centered gathering with speakers and a public awareness walk',
						'Built around remembrance, solidarity, and collective action'
					]
				}
			]
		})
	},
	{
		slug: 'drop-in-days-at-agua-caliente-cultural-museum',
		organizationSlug: 'agua-caliente-cultural-museum',
		eventUrl: 'https://www.accmuseum.org/events',
		registrationUrl: 'https://www.accmuseum.org/tickets',
		cost: 'Museum admission',
		description: buildDescription({
			intro:
				"Agua Caliente Cultural Museum's winter-spring Drop-in Days offer a flexible museum visit with guided tours and hands-on gallery experiences included in admission.",
			sections: [
				{
					title: 'Drop-in details',
					items: [
						'Group tours begin at 11:00 AM on a first-come basis and space is limited',
						'Drop in between 11:00 AM and 2:00 PM for object observation and gallery activities',
						"This listing reflects the Wednesday, May 6, 2026 drop-in date in the museum's 2026 series"
					]
				}
			]
		})
	},
	{
		slug: '4th-annual-california-indian-studies-conference-and-gathering',
		organizationSlug: 'california-indian-studies-scholars-association',
		eventUrl: 'https://www.californiaindianstudies.org/',
		description: buildDescription({
			intro:
				'The 4th Annual California Indian Studies Conference and Gathering brings scholars, students, artists, and community members together on UC Davis campus for California Indian studies, relationship-building, and shared learning.',
			sections: [
				{
					title: 'What is published so far',
					items: [
						'The event is announced as a multi-day 2026 gathering hosted at UC Davis',
						'CISSA positions the conference as a space for California Indian scholarship, dialogue, and community relationships',
						'Additional program and registration details have not yet been posted on the official site'
					]
				}
			]
		})
	},
	{
		slug: 'native-arts-festival',
		organizationSlug: 'progressive-tribal-alliance',
		eventUrl: 'https://progressivetribalalliance.com/',
		registrationUrl: 'https://www.eventbrite.com/e/native-arts-festival-tickets-1983388497387',
		description: buildDescription({
			intro:
				'The Native Arts Festival in Windsor brings together Native artists, dancers, storytellers, food vendors, and community celebration on the Windsor Town Green.',
			sections: [
				{
					title: 'Festival highlights',
					items: [
						'Native arts marketplace and public gathering centered on Indigenous creativity',
						'Hosted by Progressive Tribal Alliance',
						'Advance registration is handled through the official Eventbrite listing'
					]
				}
			]
		})
	},
	{
		slug: 'elderberry-clapper-stick-workshop',
		organizationSlug: 'maidu-museum-historic-site',
		eventUrl:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/events_exhibits',
		registrationUrl:
			'https://anc.apm.activecommunities.com/cityofroseville/activity/search/detail/14309?onlineSiteId=0&from_original_cui=true&locale=en-US',
		ageRestriction: 'Adults',
		audience: 'Adults',
		description: buildDescription({
			intro:
				'This Maidu Museum workshop invites adult participants to build an elderberry clapper stick while learning about California Indigenous musical traditions.',
			sections: [
				{
					title: 'Workshop focus',
					items: [
						'Explores cultural context as well as shaping, decorating, and assembling the instrument',
						'Intended for adult participants',
						'Registration is handled through the City of Roseville activity portal'
					]
				}
			]
		})
	},
	{
		slug: 'uc-san-diego-14th-annual-powwow',
		organizationSlug: 'intertribal-resource-center-uc-san-diego',
		eventUrl: 'https://www.instagram.com/p/DVRvcOQEok_/',
		startDate: '2026-05-17T07:00:00.000Z',
		endDate: null,
		description: buildDescription({
			intro:
				"UC San Diego's 14th Annual Powwow returns to Price Center for a campus and community gathering hosted by the Intertribal Resource Center.",
			sections: [
				{
					title: 'What is confirmed',
					items: [
						'Save-the-date announcement for May 17, 2026',
						'Hosted at Price Center, UC San Diego',
						'All are welcome, with more details still to come from the host organization'
					]
				}
			]
		})
	},
	{
		slug: 'future-imaginaries-indigenous-art-fashion-technology',
		organizationSlug: 'autry-museum-of-the-american-west',
		eventUrl: 'https://theautry.org/exhibitions/future-imaginaries',
		registrationUrl: 'https://feverup.com/m/405559?thm=7098',
		cost: 'Museum admission',
		description: buildDescription({
			intro:
				'Future Imaginaries: Indigenous Art, Fashion, Technology explores Indigenous futurism through contemporary art, fashion, and technology at the Autry Museum of the American West.',
			sections: [
				{
					title: 'Exhibition highlights',
					items: [
						'On view September 7, 2024 through June 21, 2026 in the Samuel & Minna Grodin Gallery',
						'Features more than 50 artworks by Native artists imagining expansive and self-determined futures',
						'Considers Indigenous futurism as a response to colonial trauma and a framework for more sustainable futures'
					]
				}
			]
		})
	},
	{
		slug: 'rooted-in-place-california-native-art',
		organizationSlug: 'de-young-museum',
		eventUrl: 'https://www.famsf.org/exhibitions/rooted-california-native-art',
		registrationUrl: 'https://ticketing.famsf.org/events/0191818b-e64c-6b6a-7ab6-00280806cda1',
		cost: 'Museum admission',
		description: buildDescription({
			intro:
				'Rooted in Place: California Native Art is the first in a series of de Young installations highlighting specific regions of Native California.',
			sections: [
				{
					title: 'Exhibition highlights',
					items: [
						'Focuses on the interconnections between art, ceremony, and land in Karuk, Yurok, Hupa, Tolowa, Tsnungwe, and Wiyot communities',
						'Brings together collection highlights, major loans, acquisitions, and commissions by contemporary artists',
						"Presented as part of the reimagining of the museum's Arts of Indigenous America galleries"
					]
				}
			]
		})
	},
	{
		slug: 'rose-b-simpson-lexicon',
		organizationSlug: 'de-young-museum',
		eventUrl: 'https://www.famsf.org/exhibitions/rose-b-simpson',
		registrationUrl: 'https://ticketing.famsf.org/events/0191818b-e64c-6b6a-7ab6-00280806cda1',
		cost: 'Museum admission',
		description: buildDescription({
			intro:
				'Rose B. Simpson: LEXICON brings together two customized cars by the Santa Clara Pueblo artist in a de Young installation that bridges Pueblo pottery and classic cars.',
			sections: [
				{
					title: 'Exhibition highlights',
					items: [
						'Presented in Wilsey Court at the de Young',
						'Explores scale, ancestral form, and contemporary visual language through transformed vehicles',
						'Centers the work of mixed-media artist Rose B. Simpson of Santa Clara Pueblo, New Mexico'
					]
				}
			]
		})
	},
	{
		slug: 'good-fire-tending-native-lands',
		organizationSlug: 'oakland-museum-of-california',
		eventUrl: 'https://museumca.org/on-view/good-fire-tending-native-lands/',
		registrationUrl:
			'https://tickets.museumca.org/orders/492/calendar?eventId=68b9d84215a4d74489bbf457&cart',
		cost: 'Museum admission',
		description: buildDescription({
			intro:
				'Good Fire: Tending Native Lands explores how Native communities in Northern California have long used cultural burning to care for the land and sustain traditions.',
			sections: [
				{
					title: 'Exhibition highlights',
					items: [
						"Now on view in OMCA's Great Hall from November 7, 2025 through May 31, 2026",
						'Includes fire-dependent plants, regalia, basketry, videos of cultural burns, and contemporary artworks',
						'Developed in collaboration with Native fire practitioners, artists, ecologists, and cultural leaders'
					]
				}
			]
		})
	},
	{
		slug: 'mom-m-wen-medicine-water-flowing-through-indian-country',
		organizationSlug: 'grace-hudson-museum-sun-house',
		eventUrl: 'https://www.gracehudsonmuseum.org/current-exhibit',
		description: buildDescription({
			intro:
				'Momim Wene: Medicine Water tells a story of Tribal relationships to waterways through paintings, basketry, beadwork, and regalia by more than 30 Native artists.',
			sections: [
				{
					title: 'Exhibition highlights',
					items: [
						'On view at Grace Hudson Museum from February 14 through May 10, 2026',
						'Arranged by the Shingle Springs Band of Miwok Indians and adapted in Ukiah with local regional voices',
						'Centers water, history, and lifeways across California Indian Country'
					]
				}
			]
		})
	},
	{
		slug: 'raymond-lebeau-field-s-of-view',
		organizationSlug: 'maidu-museum-historic-site',
		eventUrl:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/exhibitions/raymond_le_beau_fields_of_view',
		description: buildDescription({
			intro:
				'Raymond LeBeau: Field(s) of View is the debut solo exhibition by Native Pit River artist Raymond LeBeau at the Maidu Museum & Historic Site.',
			sections: [
				{
					title: 'Exhibition details',
					items: [
						'Opening reception takes place Saturday, March 7, 2026 from 5:00 PM to 7:00 PM',
						'Admission is free for the opening reception and refreshments will be provided',
						'The exhibition remains on view through July 26, 2026'
					]
				},
				{
					title: 'Artist focus',
					items: [
						'Features paintings, drawings, maps, and found-object assemblages',
						"Explores history, lived experience, memory, and place through LeBeau's perspective"
					]
				}
			]
		})
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

function escapeHtml(value) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function buildDescription({ intro, sections = [] }) {
	const parts = [];

	if (intro) {
		parts.push(`<p>${escapeHtml(intro)}</p>`);
	}

	for (const section of sections) {
		if (!section?.items?.length) continue;
		parts.push(`<h3>${escapeHtml(section.title)}</h3>`);
		parts.push(`<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
	}

	return parts.join('');
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

async function findOrganization(definition) {
	const rows = await db`
		select id, slug, name, aliases
		from organizations
		where slug = ${definition.slug}
			or lower(name) = lower(${definition.name})
		limit 1
	`;
	return rows[0] ?? null;
}

async function upsertOrganization(definition) {
	const existing = await findOrganization(definition);
	const aliases = dedupe([
		...(definition.aliases ?? []),
		...(existing?.aliases ?? []),
		existing && existing.name !== definition.name ? existing.name : null
	]);

	if (existing) {
		const rows = await db`
			update organizations
			set
				slug = ${definition.slug},
				name = ${definition.name},
				aliases = ${aliases},
				description = ${definition.description ?? null},
				website = ${definition.website ?? null},
				email = ${definition.email ?? null},
				phone = ${definition.phone ?? null},
				org_type = ${definition.orgType ?? null},
				region = ${definition.region ?? null},
				address = ${definition.address ?? null},
				city = ${definition.city ?? null},
				state = ${definition.state ?? null},
				zip = ${definition.zip ?? null},
				tribal_affiliation = ${definition.tribalAffiliation ?? null},
				updated_at = now()
			where id = ${existing.id}
			returning id, slug, name
		`;
		return rows[0];
	}

	const rows = await db`
		insert into organizations (
			slug,
			name,
			aliases,
			description,
			website,
			email,
			phone,
			org_type,
			region,
			address,
			city,
			state,
			zip,
			tribal_affiliation
		)
		values (
			${definition.slug},
			${definition.name},
			${aliases},
			${definition.description ?? null},
			${definition.website ?? null},
			${definition.email ?? null},
			${definition.phone ?? null},
			${definition.orgType ?? null},
			${definition.region ?? null},
			${definition.address ?? null},
			${definition.city ?? null},
			${definition.state ?? null},
			${definition.zip ?? null},
			${definition.tribalAffiliation ?? null}
		)
		returning id, slug, name
	`;
	return rows[0];
}

async function findVenue(definition) {
	const rows = await db`
		select id, slug, name
		from venues
		where slug = ${definition.slug}
			or lower(name) = lower(${definition.name})
		limit 1
	`;
	return rows[0] ?? null;
}

async function upsertVenue(definition) {
	const existing = await findVenue(definition);

	if (existing) {
		const rows = await db`
			update venues
			set
				slug = ${definition.slug},
				name = ${definition.name},
				address = ${definition.address ?? null},
				city = ${definition.city ?? null},
				state = ${definition.state ?? null},
				zip = ${definition.zip ?? null},
				website = ${definition.website ?? null},
				venue_type = ${definition.venueType ?? null},
				updated_at = now()
			where id = ${existing.id}
			returning id, slug, name, address, city, state, zip
		`;
		return rows[0];
	}

	const rows = await db`
		insert into venues (
			slug,
			name,
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
			${definition.address ?? null},
			${definition.city ?? null},
			${definition.state ?? null},
			${definition.zip ?? null},
			${definition.website ?? null},
			${definition.venueType ?? null}
		)
		returning id, slug, name, address, city, state, zip
	`;
	return rows[0];
}

async function getVenueBySlug(slug) {
	const rows = await db`
		select id, slug, name, address, city, state, zip
		from venues
		where slug = ${slug}
		limit 1
	`;
	return rows[0] ?? null;
}

async function linkVenueToOrganization(venueSlug, organizationId) {
	await db`
		update venues
		set organization_id = ${organizationId}, updated_at = now()
		where slug = ${venueSlug}
	`;
}

async function getEventBySlug(slug) {
	const rows = await db`
		select *
		from events
		where slug = ${slug}
		limit 1
	`;
	return rows[0] ?? null;
}

async function applyEventUpdate(update, organizationsBySlug) {
	const current = await getEventBySlug(update.slug);
	if (!current) {
		throw new Error(`No event row matched slug: ${update.slug}`);
	}

	const organizationId = update.organizationSlug
		? (organizationsBySlug.get(update.organizationSlug)?.id ?? null)
		: current.organization_id;
	const hostOrg =
		update.organizationSlug && organizationsBySlug.get(update.organizationSlug)
			? organizationsBySlug.get(update.organizationSlug).name
			: current.host_org;

	let venueId = current.venue_id;
	let location = current.location;
	let address = current.address;

	if (update.venueSlug) {
		const venue = await getVenueBySlug(update.venueSlug);
		if (!venue) {
			throw new Error(`No venue row matched slug: ${update.venueSlug}`);
		}
		venueId = venue.id;
		location = buildLocationLabel(venue);
		address = buildAddressLabel(venue);
	}

	const endDate = Object.prototype.hasOwnProperty.call(update, 'endDate')
		? update.endDate
			? new Date(update.endDate)
			: null
		: current.end_date;
	const contactEmail = Object.prototype.hasOwnProperty.call(update, 'contactEmail')
		? (update.contactEmail ?? null)
		: current.contact_email;
	const contactName = Object.prototype.hasOwnProperty.call(update, 'contactName')
		? (update.contactName ?? null)
		: current.contact_name;
	const contactPhone = Object.prototype.hasOwnProperty.call(update, 'contactPhone')
		? (update.contactPhone ?? null)
		: current.contact_phone;
	const cost = Object.prototype.hasOwnProperty.call(update, 'cost')
		? (update.cost ?? null)
		: current.cost;
	const audience = Object.prototype.hasOwnProperty.call(update, 'audience')
		? (update.audience ?? null)
		: current.audience;
	const capacity = Object.prototype.hasOwnProperty.call(update, 'capacity')
		? (update.capacity ?? null)
		: current.capacity;
	const ageRestriction = Object.prototype.hasOwnProperty.call(update, 'ageRestriction')
		? (update.ageRestriction ?? null)
		: current.age_restriction;

	await db`
		update events
		set
			description = ${update.description ?? current.description},
			event_url = ${update.eventUrl ?? current.event_url},
			registration_url = ${update.registrationUrl ?? current.registration_url},
			host_org = ${hostOrg ?? current.host_org},
			organization_id = ${organizationId ?? current.organization_id},
			venue_id = ${venueId},
			location = ${location},
			address = ${address},
			start_date = ${update.startDate ? new Date(update.startDate) : current.start_date},
			end_date = ${endDate},
			contact_email = ${contactEmail},
			contact_name = ${contactName},
			contact_phone = ${contactPhone},
			cost = ${cost},
			audience = ${audience},
			capacity = ${capacity},
			age_restriction = ${ageRestriction},
			updated_at = now()
		where slug = ${update.slug}
	`;

	console.log(`updated ${update.slug}`);
}

async function main() {
	const organizationsBySlug = new Map();

	for (const definition of organizationDefinitions) {
		const row = await upsertOrganization(definition);
		organizationsBySlug.set(definition.slug, row);
		console.log(`upserted org ${row.slug}`);
	}

	for (const definition of venueDefinitions) {
		const row = await upsertVenue(definition);
		console.log(`upserted venue ${row.slug}`);
	}

	for (const [venueSlug, organizationSlug] of venueOwnership) {
		const organization = organizationsBySlug.get(organizationSlug);
		if (!organization) {
			throw new Error(`No organization row matched slug: ${organizationSlug}`);
		}
		await linkVenueToOrganization(venueSlug, organization.id);
		console.log(`linked venue ${venueSlug} -> org ${organizationSlug}`);
	}

	for (const update of eventUpdates) {
		await applyEventUpdate(update, organizationsBySlug);
	}

	console.log(
		`\nEnriched ${eventUpdates.length} events and ${organizationDefinitions.length} organizations.`
	);
}

main()
	.catch(async (error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.end();
	});
