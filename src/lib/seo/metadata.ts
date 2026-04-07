import { resolveAbsoluteUrl } from '$lib/config/public-assets';
import { SEO_DEFAULT_TWITTER_CARD, SEO_SITE_LOCALE, SEO_SITE_NAME, type SeoTheme } from './site';

export type JsonLdValue = Record<string, unknown>;
export type RobotsMode = 'index' | 'noindex-follow' | 'noindex-nofollow';
export type BreadcrumbItem = {
	name: string;
	pathname: string;
};

export type OgImageInput = {
	title: string;
	eyebrow?: string | null;
	theme?: SeoTheme | string | null;
	meta?: string | null;
};

export type SeoMetadataInput = {
	origin: string;
	pathname: string;
	title: string;
	description?: string | null;
	robotsMode?: RobotsMode;
	ogType?: string;
	ogImage?: string | null;
	ogImageAlt?: string | null;
	twitterCard?: string;
	jsonLd?: JsonLdValue[];
	breadcrumbItems?: BreadcrumbItem[];
};

export type SeoMetadata = {
	title: string;
	description: string | null;
	canonicalUrl: string;
	robots: string;
	siteName: string;
	locale: string;
	ogType: string;
	ogTitle: string;
	ogDescription: string | null;
	ogUrl: string;
	ogImage: string | null;
	ogImageAlt: string | null;
	twitterCard: string;
	twitterTitle: string;
	twitterDescription: string | null;
	twitterImage: string | null;
	twitterImageAlt: string | null;
	jsonLdScripts: string[];
};

function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function buildCanonicalUrl(origin: string, pathname: string): string {
	const normalizedOrigin = stripTrailingSlash(origin);
	const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return `${normalizedOrigin}${normalizedPath}`;
}

export function buildRobotsDirective(mode: RobotsMode = 'index'): string {
	if (mode === 'noindex-follow') return 'noindex,follow';
	if (mode === 'noindex-nofollow') return 'noindex,nofollow';
	return 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
}

export function buildOgImagePath(input: OgImageInput): string {
	const params = new URLSearchParams({
		title: input.title,
		theme: input.theme ?? 'site'
	});

	if (input.eyebrow?.trim()) params.set('eyebrow', input.eyebrow.trim());
	if (input.meta?.trim()) params.set('meta', input.meta.trim());

	return `/og.png?${params.toString()}`;
}

export function buildWebSiteJsonLd(origin: string): JsonLdValue {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SEO_SITE_NAME,
		url: buildCanonicalUrl(origin, '/'),
		potentialAction: {
			'@type': 'SearchAction',
			target: `${buildCanonicalUrl(origin, '/search')}?q={search_term_string}`,
			'query-input': 'required name=search_term_string'
		}
	};
}

export function buildBreadcrumbJsonLd(
	origin: string,
	items: BreadcrumbItem[] | null | undefined
): JsonLdValue | null {
	const itemListElement = (items ?? [])
		.map((item) => ({
			name: item.name.trim(),
			pathname: item.pathname.trim()
		}))
		.filter((item) => item.name && item.pathname)
		.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: buildCanonicalUrl(origin, item.pathname)
		}));

	if (itemListElement.length < 2) {
		return null;
	}

	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement
	};
}

export function serializeJsonLd(value: JsonLdValue): string {
	return [
		'<script type="application/ld+json">',
		JSON.stringify(value).replaceAll('<', '\\u003c'),
		'</scr' + 'ipt>'
	].join('');
}

export function buildSeoMetadata(input: SeoMetadataInput): SeoMetadata {
	const canonicalUrl = buildCanonicalUrl(input.origin, input.pathname);
	const description = input.description?.trim() || null;
	const ogImage = resolveAbsoluteUrl(input.ogImage, { origin: input.origin });
	const breadcrumbJsonLd = buildBreadcrumbJsonLd(input.origin, input.breadcrumbItems);
	const jsonLdScripts = [...(input.jsonLd ?? []), ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : [])]
		.filter(Boolean)
		.map(serializeJsonLd);

	return {
		title: input.title,
		description,
		canonicalUrl,
		robots: buildRobotsDirective(input.robotsMode),
		siteName: SEO_SITE_NAME,
		locale: SEO_SITE_LOCALE,
		ogType: input.ogType ?? 'website',
		ogTitle: input.title,
		ogDescription: description,
		ogUrl: canonicalUrl,
		ogImage,
		ogImageAlt: input.ogImageAlt?.trim() || null,
		twitterCard: input.twitterCard ?? SEO_DEFAULT_TWITTER_CARD,
		twitterTitle: input.title,
		twitterDescription: description,
		twitterImage: ogImage,
		twitterImageAlt: input.ogImageAlt?.trim() || null,
		jsonLdScripts
	};
}

export function buildOgImageAlt(title: string): string {
	return `${escapeHtml(title)} social preview image`;
}
