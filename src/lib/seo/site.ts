export const SEO_SITE_NAME = 'Knowledge Basket';
export const SEO_SITE_LOCALE = 'en_US';
export const SEO_DEFAULT_TWITTER_CARD = 'summary_large_image';

export type SeoTheme =
	| 'site'
	| 'about'
	| 'open-source'
	| 'events'
	| 'funding'
	| 'jobs'
	| 'redpages'
	| 'toolbox'
	| 'organization'
	| 'venue'
	| 'neutral';

type SeoThemePalette = {
	background: string;
	panel: string;
	accent: string;
	text: string;
	muted: string;
};

const SEO_THEME_PALETTES: Record<SeoTheme, SeoThemePalette> = {
	site: {
		background: '#132533',
		panel: '#17384f',
		accent: '#f4cf63',
		text: '#f8f5ec',
		muted: '#d3dfeb'
	},
	about: {
		background: '#253248',
		panel: '#324764',
		accent: '#f2c96e',
		text: '#f8f5ec',
		muted: '#d8dfec'
	},
	'open-source': {
		background: '#22313f',
		panel: '#2d4a59',
		accent: '#a6d8b6',
		text: '#f6f4ef',
		muted: '#d9e4e8'
	},
	events: {
		background: '#114958',
		panel: '#1b6679',
		accent: '#8fd7d1',
		text: '#f3faf9',
		muted: '#d3ece8'
	},
	funding: {
		background: '#4a3411',
		panel: '#6a4b16',
		accent: '#f4cf63',
		text: '#fbf6ea',
		muted: '#efe2b7'
	},
	jobs: {
		background: '#1f4629',
		panel: '#2d633b',
		accent: '#b6d67c',
		text: '#f4f9ee',
		muted: '#dce9c5'
	},
	redpages: {
		background: '#6a1f26',
		panel: '#8a2b33',
		accent: '#f5a4a0',
		text: '#fff4f2',
		muted: '#f7d8d3'
	},
	toolbox: {
		background: '#303645',
		panel: '#435066',
		accent: '#b8cbe6',
		text: '#f7f8fb',
		muted: '#dbe3ee'
	},
	organization: {
		background: '#22303b',
		panel: '#314656',
		accent: '#b7d6e7',
		text: '#f7fafc',
		muted: '#d8e5ed'
	},
	venue: {
		background: '#3b2d22',
		panel: '#5a4533',
		accent: '#f0be7a',
		text: '#fbf5ee',
		muted: '#ecd9c0'
	},
	neutral: {
		background: '#263238',
		panel: '#3e4a50',
		accent: '#c8d3d9',
		text: '#f6f7f8',
		muted: '#dde4e7'
	}
};

export function getSeoThemePalette(theme: SeoTheme | string | null | undefined): SeoThemePalette {
	if (!theme) return SEO_THEME_PALETTES.neutral;
	return SEO_THEME_PALETTES[theme as SeoTheme] ?? SEO_THEME_PALETTES.neutral;
}
