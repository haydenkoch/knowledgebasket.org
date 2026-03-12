/**
 * Placeholder landscape images for cards and detail heroes when no image is set.
 * Files live in static/images/landscapes/
 */
const LANDSCAPE_FILES = [
	'Carson Pass 2-Winnemucca Lk-2.jpg',
	'Eastern Sierra Summer 2012-3123-Edit.jpg',
	'Easter Sierra Winter 2014-11.jpg',
	'Kiva Beach Sunset-9.jpg',
	'Mt. Muir From Trail Crest-6539.jpg',
	'Sierra Fall-8937.jpg',
	'Tahoe Summer 2013-8533.jpg',
	'Tunnel View-5282.jpg',
	'Tunnel View-Edit-2.jpg',
	'Volcanic Tablelands Spring 2014-1.jpg',
	'Yosemite May 2015-4010.jpg',
	'Yosemite Spring 2016-1.jpg'
];

export const LANDSCAPE_PLACEHOLDERS = LANDSCAPE_FILES.map(
	(name) => `/images/landscapes/${encodeURIComponent(name)}`
);

/** Return a placeholder image URL by index (cycles through landscape set). */
export function getPlaceholderImage(index: number): string {
	return LANDSCAPE_PLACEHOLDERS[index % LANDSCAPE_PLACEHOLDERS.length]!;
}
