import type { ToolboxItem } from '$lib/data/kb';

export type ToolboxProvider =
	| 'pbs'
	| 'youtube'
	| 'vimeo'
	| 'apple-podcasts'
	| 'arcgis'
	| 'stanford'
	| 'generic'
	| null;

const KNOWN_TOKENS = new Map<string, string>([
	['acf', 'ACF'],
	['ana', 'ANA'],
	['api', 'API'],
	['arcgis', 'ArcGIS'],
	['bia', 'BIA'],
	['docx', 'DOCX'],
	['doi', 'DOI'],
	['fao', 'FAO'],
	['fpic', 'FPIC'],
	['gida', 'GIDA'],
	['ihs', 'IHS'],
	['kcet', 'KCET'],
	['mmiw', 'MMIW'],
	['mmiwg', 'MMIWG'],
	['nagpra', 'NAGPRA'],
	['ncai', 'NCAI'],
	['nps', 'NPS'],
	['pbs', 'PBS'],
	['pdf', 'PDF'],
	['sgcetc', 'SGCETC'],
	['tek', 'TEK'],
	['undrip', 'UNDRIP'],
	['usda', 'USDA'],
	['usfs', 'USFS']
]);

export function formatToolboxLabel(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;

	return trimmed
		.split(/(\s+|\/|-)/)
		.map((segment) => {
			const normalized = segment.trim().toLowerCase();
			if (!normalized) return segment;
			const known = KNOWN_TOKENS.get(normalized);
			if (known) return known;
			if (/^[A-Z0-9]{2,}$/.test(segment)) return segment;
			return normalized.charAt(0).toUpperCase() + normalized.slice(1);
		})
		.join('');
}

export function getToolboxProvider(url: string | null | undefined): ToolboxProvider {
	if (!url) return null;

	try {
		const hostname = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
		if (hostname.includes('pbs.org')) return 'pbs';
		if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
		if (hostname.includes('vimeo.com')) return 'vimeo';
		if (hostname.includes('podcasts.apple.com')) return 'apple-podcasts';
		if (hostname.includes('storymaps.arcgis.com') || hostname.includes('arcgis.com'))
			return 'arcgis';
		if (hostname.includes('stanford.edu')) return 'stanford';
		return 'generic';
	} catch {
		return null;
	}
}

export function getToolboxHostLabel(url: string | null | undefined): string | null {
	if (!url) return null;

	try {
		const hostname = new URL(url).hostname.replace(/^www\./i, '');
		switch (hostname) {
			case 'podcasts.apple.com':
				return 'Apple Podcasts';
			case 'storymaps.arcgis.com':
				return 'ArcGIS StoryMaps';
			case 'pbs.org':
			case 'video.pbs.org':
				return 'PBS';
			default:
				return hostname;
		}
	} catch {
		return null;
	}
}

export function isPdfLikeUrl(url: string | null | undefined): boolean {
	return Boolean(url && /\.pdf(?:$|[?#])/i.test(url));
}

export function getToolboxPrimaryActionLabel(
	item: ToolboxItem,
	options?: { hasPdfPreview?: boolean }
): string {
	if (options?.hasPdfPreview) return 'Open PDF';

	if (item.contentMode === 'file') return 'Download resource';

	switch (getToolboxProvider(item.externalUrl)) {
		case 'apple-podcasts':
			return 'Listen now';
		case 'pbs':
		case 'youtube':
		case 'vimeo':
			return 'Watch now';
		default:
			return 'Open resource';
	}
}

export function getToolboxPreviewEyebrow(item: ToolboxItem): string {
	return (
		formatToolboxLabel(item.mediaType) ??
		formatToolboxLabel(item.resourceType) ??
		getToolboxHostLabel(item.externalUrl) ??
		'Resource'
	);
}

export function getToolboxSecondaryMeta(item: ToolboxItem): string | null {
	return formatToolboxLabel(item.resourceType) ?? getToolboxHostLabel(item.externalUrl);
}
