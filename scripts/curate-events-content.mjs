#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';
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

const updates = [
	{
		slug: 'cultural-protocols-community-response-community-gathering',
		eventUrl: 'https://www.indigenousjustice.org/events',
		description:
			'Community gathering rooted in honoring and remembering Indigenous relatives, strengthening sovereignty, and uplifting cultural healing and community care. The day brings together families, survivors, cultural and spiritual leaders, and community partners for prayer, cultural practices, youth programming, and mutual support at Choinumni Park.',
		hostOrg: 'Indigenous Justice',
		location: 'Choinumni Park, Sanger, CA',
		address: '26501 Pine Flat Rd, Sanger, CA 93657',
		region: 'Central Valley',
		type: 'Community Gathering',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://cdn.prod.website-files.com/68a627b75d5b7960a121b59b/69a0df63258a66cda5355b3f_Screenshot%202026-02-25%20at%2010.41.09.png',
		cost: null
	},
	{
		slug: 'native-americans-in-philanthropy-s-2026-annual-conference',
		eventUrl: 'https://conference.nativephilanthropy.org/savethedate',
		description:
			'Native Americans in Philanthropy’s 2026 Annual Conference brings together changemakers, culture keepers, and philanthropic leaders in Riverside for three days focused on Tribal sovereignty, Indigenous advocacy, and community-led philanthropy. The gathering centers Indigenous values while connecting practitioners across philanthropy, Native nonprofits, and Tribal communities.',
		hostOrg: 'Native Americans in Philanthropy',
		location: 'Riverside, CA',
		address: 'Riverside, CA',
		region: 'Southern California',
		type: 'Conference',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://cdn.uploads.webconnex.com/186615/hz_turq_26%20%281%29.png?1764206746107',
		cost: null
	},
	{
		slug: 'carmel-band-of-rumsen-indians-community-gathering-and-powwow',
		eventUrl:
			'https://newsfromnativecalifornia.com/event/carmel-band-of-rumsen-indians-community-gathering-and-powwow/',
		description:
			'Annual community gathering and powwow hosted by the Carmel Band of Rumsen Indians at Arcadia County Park. The weekend brings together dancers, singers, vendors, and community members for a public celebration rooted in Rumsen leadership and cultural continuity.',
		hostOrg: 'Carmel Band of Rumsen Indians',
		location: 'Arcadia County Park, Arcadia, CA',
		address: '405 S Santa Anita Ave, Arcadia, CA 91006',
		region: 'Southern California',
		type: 'Powwow',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://static.wixstatic.com/media/b1a3a6_78bb030848b54ba4bc6d9d68c33d93aa~mv2.jpg',
		cost: null
	},
	{
		slug: 'comic-creation',
		eventUrl:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/events_exhibits',
		registrationUrl:
			'https://anc.apm.activecommunities.com/cityofroseville/activity/search/detail/14274?onlineSiteId=0&from_original_cui=true&locale=en-US',
		description:
			'Hands-on comic workshop for ages 6-12 at the Maidu Museum & Historic Site. Students learn storytelling, panel layout, dialogue, and visual techniques with Native artist Devaney Rain Royalty while creating their own comic work.',
		hostOrg: 'Maidu Museum & Historic Site',
		location: 'Maidu Activity Center, Roseville, CA',
		address: '1960 Johnson Ranch Dr, Roseville, CA 95661',
		region: 'Sacramento Valley',
		type: 'Workshop',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_7964838/Image/Library/MMHS/MMHS%20Programs/Winter%20Spring%202026%20Website%20Program%20Images-3.png',
		cost: 'Registration Fee Required'
	},
	{
		slug: 'sherman-indian-school-powwow',
		eventUrl: 'https://sih.bie.edu/events/shermans-40th-annual-pow-wow',
		description:
			'Sherman Indian High School’s 40th Annual Pow Wow returns to Riverside for a day of intertribal gathering, school tradition, and community celebration on campus. The event welcomes students, families, singers, dancers, vendors, and supporters for a full day of powwow activity at Sherman Indian High School.',
		hostOrg: 'Sherman Indian High School',
		location: 'Sherman Indian High School, Riverside, CA',
		address: '9010 Magnolia Ave, Riverside, CA 92503',
		region: 'Southern California',
		type: 'Powwow',
		eventFormat: 'in_person',
		imageSourceUrl: 'https://sih.bie.edu/sites/sih/files/images/POw%20Wow%20Flyer.png',
		cost: null
	},
	{
		slug: 'garden-box-workshop',
		eventUrl: 'https://ncidc.org/event/garden-box-workshop-crescent-city',
		registrationUrl: 'https://go.ncidc.org/planters',
		description:
			'NCIDC’s planter box workshop invites community members to build and take home a garden box in Crescent City. Space is limited each day, and the workshop includes hands-on instruction plus direct signup through NCIDC.',
		hostOrg: 'Northern California Indian Development Council',
		location: 'Del Norte Indian Education Center, Crescent City, CA',
		address: '888 4th St, Crescent City, CA 95531',
		region: 'North Coast',
		type: 'Workshop',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://ncidc.org/sites/default/files/styles/full/public/2026-02/Garden%20Box%20Workshop%20Flyer%20.png?itok=HaY0l_k1',
		cost: null
	},
	{
		slug: 'agave-roast-native-food-tasting-event-at-malki-museum',
		eventUrl: 'https://malkimuseum.org/pages/agave-roast',
		description:
			'Annual Malki Museum agave roast and tasting highlights the traditional importance of agave to Cahuilla and Kumeyaay foodways. Guests experience roasted agave alongside other Native foods, cultural interpretation, and food demonstrations at the museum on the Morongo Reservation.',
		hostOrg: 'Malki Museum',
		location: 'Malki Museum, Morongo Reservation, Banning, CA',
		address: '11795 Malki Rd, Morongo Reservation, Banning, CA 92220',
		region: 'Southern California',
		type: 'Food Sovereignty',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://malkimuseum.org/cdn/shop/files/2026_Agave_Roast_Flyer.jpg?v=1772654502&width=1070',
		cost: null
	},
	{
		slug: 'yoom-n-a-celebration-of-spring',
		eventUrl: 'https://www.roseville.ca.us/residents/city_events/yoomen',
		description:
			'Free spring cultural event at the Maidu Museum & Historic Site featuring Native performers and cultural demonstrators. Visitors can watch basketry, jewelry, tools, and other natural-material arts while spending the day with Indigenous artists and culture bearers.',
		hostOrg: 'Maidu Museum & Historic Site',
		location: 'Maidu Museum & Historic Site, Roseville, CA',
		address: '1970 Johnson Ranch Dr, Roseville, CA 95661',
		region: 'Sacramento Valley',
		type: 'Community',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_7964838/Image/Library/MMHS/MMHS%20Events/Yoom%C3%A9n/Yoomen26%20website%20banner_DEMOS.png',
		cost: 'Free/Sponsored'
	},
	{
		slug: 'indigenous-stories-film-festival-and-art-walk',
		eventUrl: 'https://www.indianhealth.com/post/indigenous-stories-film-festival-1',
		description:
			'The Indigenous Stories Film Festival and Art Walk highlights Native-made short films, visual art, and community storytelling at the Rincon Government Center. Hosted by Indian Health Council, the evening features youth and adult film categories, screenings, art, and community gathering centered on Indigenous voices.',
		hostOrg: 'Indian Health Council',
		location: 'Rincon Government Center, Valley Center, CA',
		address: '1 Government Center Ln, Valley Center, CA 92082',
		region: 'Southern California',
		type: 'Film Festival',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://static.wixstatic.com/media/6a7ada_ff154d7b38274133a0b9536177142fe8~mv2.jpg',
		cost: null
	},
	{
		slug: '41st-annual-ucla-powwow',
		eventUrl: 'https://www.instagram.com/p/DToqpJGFJMi/',
		description:
			'UCLA’s 41st Annual Powwow, hosted by the American Indian Student Association, returns to Wallis Annenberg Stadium for two days of intertribal gathering. The event welcomes community members for grand entry, dancing, vendors, and campus celebration.',
		hostOrg: 'UCLA American Indian Student Association',
		location: 'Wallis Annenberg Stadium, Los Angeles, CA',
		address: 'Wallis Annenberg Stadium, Los Angeles, CA 90095',
		region: 'Southern California',
		type: 'Powwow',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://scontent-lax3-2.cdninstagram.com/v/t51.82787-15/618749038_17994856973871820_9216273019264257832_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=106&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=3RyguZmCL90Q7kNvwEGtfon&_nc_oc=Adolkads-zZNy0miFWH8QzCvR_ywx1LaqZT7kBC04bML-DPkL1bEostShoMTwsjKtg4&_nc_zt=23&_nc_ht=scontent-lax3-2.cdninstagram.com&_nc_gid=FxlWYQnaI8hW4dWE26oCkg&_nc_ss=7a389&oh=00_Af3NesJA6JPRcD4EBc2scHTMlM9ujVl9p0S-Mpmv6wL_kw&oe=69DA793F',
		cost: null
	},
	{
		slug: '51st-cupa-days',
		eventUrl: 'https://www.palatribe.com/2026/03/06/announcement-51st-cupa-days/',
		description:
			'51st Cupa Days returns to the Cupa Cultural Center Grounds with opening ceremonies, peon games, vendors, and public welcome across the weekend. Hosted by the Pala Band of Mission Indians, the gathering celebrates culture, community, and the living traditions of Cupa.',
		hostOrg: 'Pala Band of Mission Indians',
		location: 'Cupa Cultural Center Grounds, Pala, CA',
		address: '35008 Pala Temecula Rd, Pala, CA 92059',
		region: 'Southern California',
		type: 'Celebration',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://www.palatribe.com/wp-content/uploads/2026/03/Img-Pala-Post-PBMI-CCC-51st-Cultural-Center-Cupa-Days-2026-1024x1325-1-791x1024.jpg',
		cost: 'Free/Sponsored'
	},
	{
		slug: 'mmip-awareness-day-and-walk',
		eventUrl:
			'https://www.facebook.com/TheYurokTribe/photos/please-join-us-may-5th-for-the-yurok-mmip-awareness-day-walk-this-event-will-be-/1371207611707043/',
		description:
			'Yurok Tribe’s MMIP Awareness Day and Walk in Eureka is a day of prayer, remembrance, speakers, walking, and dinner in honor of missing and murdered Indigenous people. The event centers community support, visibility, and collective action for MMIP awareness.',
		hostOrg: 'Yurok Tribe',
		location: 'Adorni Center, Eureka, CA',
		address: '1011 Waterfront Dr, Eureka, CA 95501',
		region: 'North Coast',
		type: 'MMIP',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://scontent-lax7-1.xx.fbcdn.net/v/t39.30808-6/629871410_1371207615040376_8530751080837575226_n.jpg?stp=dst-jpg_p206x206_tt6&_nc_cat=111&ccb=1-7&_nc_sid=8f211c&_nc_ohc=gwl1kVhWSpEQ7kNvwEbwJAX&_nc_oc=AdrNrGAUBkiVLtEVln2RnX_j3cN4ugeCHaSYlBmh6s3KB5awPj6MJCTO4q8cQq5y9d0&_nc_zt=23&_nc_ht=scontent-lax7-1.xx&_nc_gid=RJcDdJuOklmCY3tSVTXxSg&_nc_ss=7a389&oh=00_Af2iMKhVM7Rb7oBLOrRW7oTSSJir3yJPBIdARQWpA75l9A&oe=69DA6C83',
		cost: null
	},
	{
		slug: 'drop-in-days-at-agua-caliente-cultural-museum',
		eventUrl: 'https://www.accmuseum.org/events',
		description:
			'Monthly drop-in museum day includes guided tours, hands-on object observation, and gallery activities at the Agua Caliente Cultural Museum. Activities run midday and are included with museum admission.',
		hostOrg: 'Agua Caliente Cultural Museum',
		location: 'Agua Caliente Cultural Museum, Palm Springs, CA',
		address: '140 N Indian Canyon Dr, Palm Springs, CA 92262',
		region: 'Southern California',
		type: 'Museum Program',
		eventFormat: 'in_person',
		imageSourceUrl: 'https://www.accmuseum.org/imgs/upEventImg.jpg',
		cost: 'Registration Fee Required'
	},
	{
		slug: '4th-annual-california-indian-studies-conference-and-gathering',
		eventUrl: 'https://www.californiaindianstudies.org/',
		description:
			'The fourth annual California Indian Studies Conference and Gathering brings scholars, students, artists, and community members together at UC Davis on Patwin homelands. The gathering focuses on California Indian studies, relationship-building, and shared learning across disciplines and communities.',
		hostOrg: 'California Indian Studies & Scholars Association',
		location: 'UC Davis, Davis, CA',
		address: '1 Shields Ave, Davis, CA 95616',
		region: 'Sacramento Valley',
		type: 'Conference',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://newsfromnativecalifornia.com/wp-content/uploads/2025/11/CISSA-conference-and-gathering-2026-Save-the-Date-Flyer-.jpg',
		cost: null
	},
	{
		slug: 'native-arts-festival',
		eventUrl: 'https://nafestival.org/',
		registrationUrl: 'https://www.eventbrite.com/e/native-arts-festival-tickets-1983388497387',
		description:
			'Native Arts Festival in Windsor brings together Native artists, dancers, storytellers, food vendors, and community celebration at the Town Green. The festival highlights original artwork, handcrafted goods, live performance, and Native-led arts programming in a public community setting.',
		hostOrg: 'Progressive Tribal Alliance',
		location: 'Windsor Town Green, Windsor, CA',
		address: '701 McClelland Dr, Windsor, CA 95492',
		region: 'North Bay',
		type: 'Festival',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1177769020%252F2991278974025%252F1%252Foriginal.20260217-205902%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.5%26fp-y%3D0.5%26s%3D229d1c59ca427b8d9bd2cd1ec7f3091c&w=940&q=75',
		cost: null
	},
	{
		slug: 'elderberry-clapper-stick-workshop',
		eventUrl:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/events_exhibits',
		registrationUrl:
			'https://anc.apm.activecommunities.com/cityofroseville/activity/search/detail/14309?onlineSiteId=0&from_original_cui=true&locale=en-US',
		description:
			'Adults build their own elderberry clapper stick and learn about the instrument’s place in California Indigenous musical traditions. The Maidu Museum workshop covers cultural context as well as shaping, decorating, and assembling the instrument.',
		hostOrg: 'Maidu Museum & Historic Site',
		location: 'Maidu Activity Center, Roseville, CA',
		address: '1960 Johnson Ranch Dr, Roseville, CA 95661',
		region: 'Sacramento Valley',
		type: 'Workshop',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_7964838/Image/Library/MMHS/MMHS%20Programs/Winter%20Spring%202026%20Website%20Program%20Images-4.png',
		cost: 'Registration Fee Required'
	},
	{
		slug: 'uc-san-diego-14th-annual-powwow',
		eventUrl: 'https://www.instagram.com/p/DVRvcOQEok_/',
		description:
			'UC San Diego’s 14th Annual Powwow welcomes the community to Price Center for an intertribal gathering hosted by the Intertribal Resource Center. The event is open to all, with more details to follow from UC San Diego’s Native student community.',
		hostOrg: 'Intertribal Resource Center, UC San Diego',
		location: 'Price Center, UC San Diego, La Jolla, CA',
		address: '9500 Gilman Dr, La Jolla, CA 92093',
		region: 'Southern California',
		type: 'Powwow',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://scontent-lax7-1.cdninstagram.com/v/t51.82787-15/640438212_18181176394374493_3919481866242744176_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=M5FTmvc9I1YQ7kNvwF8VyPd&_nc_oc=Adp4QXBswU9jPUAor6GU4RnXZ34HpIDqtSTN343jEJkqNx981Oc01K82E5YScLHrCDc&_nc_zt=23&_nc_ht=scontent-lax7-1.cdninstagram.com&_nc_gid=--Nqe9Te689_qOihYSvVAQ&_nc_ss=7a389&oh=00_Af3RGk1gak_1dD6jMyATZzTZ3JAxyr8Xn5qeAyuEHK-S3g&oe=69DA79BE',
		cost: null
	},
	{
		slug: 'future-imaginaries-indigenous-art-fashion-technology',
		eventUrl: 'https://theautry.org/exhibitions/future-imaginaries',
		description:
			'Future Imaginaries explores Indigenous futurism in contemporary art, fashion, and technology through works that reframe science fiction, sovereignty, and Indigenous technologies. Presented at the Autry Museum of the American West, the exhibition brings together more than 50 works by Native artists imagining expansive and self-determined futures.',
		hostOrg: 'Autry Museum of the American West',
		location: 'Autry Museum of the American West, Los Angeles, CA',
		address: '4700 Western Heritage Way, Los Angeles, CA 90027',
		region: 'Southern California',
		type: 'Exhibition',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://theautry.org/sites/default/files/styles/max_650x650/public/2023-05/ex-if-pst-three-sisters-romero.jpg?itok=UfIAqGbz',
		cost: null
	},
	{
		slug: 'rooted-in-place-california-native-art',
		eventUrl: 'https://www.famsf.org/exhibitions/rooted-california-native-art',
		description:
			'Rooted in Place: California Native Art is the first in a series of de Young installations focused on Native California regions. The exhibition explores the interconnections between art, ceremony, and land in Karuk, Yurok, Hupa, Tolowa, Tsnungwe, and Wiyot communities through collection highlights, major loans, acquisitions, and contemporary commissions.',
		hostOrg: 'de Young Museum',
		location: 'de Young Museum, San Francisco, CA',
		address: '50 Hagiwara Tea Garden Dr, San Francisco, CA 94118',
		region: 'Bay Area',
		type: 'Exhibition',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://www.famsf.org/storage/images/a93bfa86-e0f0-459c-831b-2f437092b6ae/rick-bartow-magical-mind-rural-america-2015.jpg?crop=4916,2574,x0,y0&format=jpg&quality=80',
		cost: null
	},
	{
		slug: 'rose-b-simpson-lexicon',
		eventUrl: 'https://www.famsf.org/exhibitions/rose-b-simpson',
		description:
			'Rose B. Simpson: LEXICON brings together two customized cars by the Santa Clara Pueblo artist in a de Young installation that bridges Pueblo pottery traditions and contemporary sculpture. Presented in Wilsey Court, the exhibition connects ancestral form, scale, and contemporary visual language through Simpson’s transformed vehicles.',
		hostOrg: 'de Young Museum',
		location: 'de Young Museum, San Francisco, CA',
		address: '50 Hagiwara Tea Garden Dr, San Francisco, CA 94118',
		region: 'Bay Area',
		type: 'Exhibition',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://www.famsf.org/storage/images/17e06ad1-3149-4779-addd-79dbe237ee87/2014-rose-simpson-maria-car-krussel-3000.jpg?crop=,,x,y&format=jpg&quality=80',
		cost: null
	},
	{
		slug: 'good-fire-tending-native-lands',
		eventUrl: 'https://museumca.org/on-view/good-fire-tending-native-lands/',
		description:
			'Good Fire: Tending Native Lands explores how Native communities in Northern California have long used controlled fire and cultural burning to care for land and sustain traditions. Organized with Native fire practitioners, artists, ecologists, and cultural leaders, the exhibition reframes fire as a vital practice for healthy ecosystems and vibrant communities.',
		hostOrg: 'Oakland Museum of California',
		location: 'Oakland Museum of California, Oakland, CA',
		address: '1000 Oak St, Oakland, CA 94607',
		region: 'Bay Area',
		type: 'Exhibition',
		eventFormat: 'in_person',
		imageSourceUrl: 'https://museumca.org/wp-content/uploads/2025/09/Good-Fire-website-header.png',
		cost: null
	},
	{
		slug: 'mom-m-wen-medicine-water-flowing-through-indian-country',
		eventUrl: 'https://www.gracehudsonmuseum.org/current-exhibit',
		description:
			'Momim Wene | Medicine Water: Flowing through Indian Country brings together paintings, basketry, jewelry, and other works by more than 30 Native artists in an exhibition centered on water. Curated by the Shingle Springs Band of Miwok Indians Exhibits and Collections Center, the exhibition continues its journey at Grace Hudson Museum with local context added in Ukiah.',
		hostOrg: 'Grace Hudson Museum & Sun House',
		location: 'Grace Hudson Museum & Sun House, Ukiah, CA',
		address: '431 S Main St, Ukiah, CA 95482',
		region: 'North Coast',
		type: 'Exhibition',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://images.squarespace-cdn.com/content/v1/577fcdeab3db2bbb8519136a/73983976-59f4-47fe-b6a3-9ecdc9c71b6f/Liwanwalli+by+Michelle+Napoli.png',
		cost: null
	},
	{
		slug: 'raymond-lebeau-field-s-of-view',
		eventUrl:
			'https://www.roseville.ca.us/government/departments/library/maidu_museum_historic_site/exhibitions/raymond_le_beau_fields_of_view',
		description:
			'Raymond LeBeau: Field(s) of View is a solo exhibition by Pit River, Lakota, and Cahuilla artist Raymond LeBeau. Through paintings, drawings, maps, and found-object assemblages, the exhibition explores memory, place, history, and the cultural influences that shape his perspective across northeastern California homelands and coastal environments.',
		hostOrg: 'Maidu Museum & Historic Site',
		location: 'Maidu Museum & Historic Site, Roseville, CA',
		address: '1970 Johnson Ranch Dr, Roseville, CA 95661',
		region: 'Sacramento Valley',
		type: 'Exhibition',
		eventFormat: 'in_person',
		imageSourceUrl:
			'https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_7964838/Image/Library/MMHS/Exhibitions/Raymond%20LeBeau_FOV/Post%20card_Raymond%20Lebeau%20FOV_front.png',
		cost: null
	}
];

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
	if (contentType?.includes('svg')) return '.svg';

	try {
		const pathname = new URL(url).pathname.toLowerCase();
		if (pathname.endsWith('.png')) return '.png';
		if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
		if (pathname.endsWith('.webp')) return '.webp';
		if (pathname.endsWith('.svg')) return '.svg';
	} catch {
		// fall through
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
		case '.svg':
			return 'image/svg+xml';
		default:
			return 'image/jpeg';
	}
}

function buildPublicUrl(objectKey) {
	const base = PUBLIC_ASSET_BASE_URL.replace(/\/+$/, '');
	return `${base}/${objectKey}`;
}

async function uploadRemoteImage(slug, sourceUrl) {
	if (!sourceUrl) return null;

	const response = await fetch(sourceUrl, {
		redirect: 'follow',
		headers: {
			'user-agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
		}
	});

	if (!response.ok) {
		throw new Error(`Image download failed (${response.status}) for ${sourceUrl}`);
	}

	const responseType = response.headers.get('content-type') ?? '';
	const extension = extensionFrom(responseType, response.url || sourceUrl);
	const contentType = contentTypeFrom(extension, responseType);
	const objectKey = `events/curated/${slug}${extension}`;
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

	return buildPublicUrl(objectKey);
}

async function applyUpdate(update) {
	let imageUrl = null;

	if (update.imageSourceUrl) {
		try {
			imageUrl = await uploadRemoteImage(update.slug, update.imageSourceUrl);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Image skipped for ${update.slug}: ${message}`);
		}
	}

	const rows = await db`
		update events
		set
			description = ${update.description},
			host_org = ${update.hostOrg ?? null},
			location = ${update.location ?? null},
			address = ${update.address ?? null},
			region = ${update.region ?? null},
			type = ${update.type ?? null},
			event_url = ${update.eventUrl ?? null},
			registration_url = ${update.registrationUrl ?? null},
			event_format = ${update.eventFormat ?? null},
			cost = ${update.cost ?? null},
			image_url = ${imageUrl},
			updated_at = now()
		where slug = ${update.slug}
		returning slug, title
	`;

	if (rows.length === 0) {
		throw new Error(`No event row matched slug: ${update.slug}`);
	}

	console.log(`Updated ${rows[0].slug}`);
	console.log(`  event_url: ${update.eventUrl ?? '(none)'}`);
	console.log(`  image_url: ${imageUrl ?? '(cleared)'}`);
}

async function main() {
	await ensureBucket();

	for (const update of updates) {
		await applyUpdate(update);
	}

	console.log(`\nCurated ${updates.length} upcoming event records.`);
}

main()
	.catch(async (error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.end();
	});
