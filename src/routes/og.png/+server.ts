import type { RequestHandler } from './$types';
import { createRequire } from 'node:module';
import { getSeoThemePalette, type SeoTheme } from '$lib/seo/site';

const WIDTH = 1200;
const HEIGHT = 630;
const require = createRequire(import.meta.url);
const ALLOWED_THEMES = new Set<SeoTheme>([
	'site',
	'about',
	'open-source',
	'events',
	'funding',
	'jobs',
	'redpages',
	'toolbox',
	'organization',
	'venue',
	'neutral'
]);

type SharpRenderer = typeof import('sharp');

function getSharpRenderer(): SharpRenderer {
	return require('sharp') as SharpRenderer;
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function sanitizeText(value: string | null, fallback: string, maxLength: number): string {
	const normalized = value?.replace(/\s+/g, ' ').trim();
	if (!normalized) return fallback;
	return normalized.length > maxLength
		? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
		: normalized;
}

function normalizeTheme(value: string | null): SeoTheme {
	return value && ALLOWED_THEMES.has(value as SeoTheme) ? (value as SeoTheme) : 'site';
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
	const words = value.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = '';

	for (const word of words) {
		const next = current ? `${current} ${word}` : word;
		if (next.length <= maxChars || !current) {
			current = next;
			continue;
		}
		lines.push(current);
		current = word;
		if (lines.length === maxLines - 1) break;
	}

	if (current) {
		const remainingWords = words.slice(lines.join(' ').split(/\s+/).filter(Boolean).length);
		let lastLine = current;
		if (remainingWords.length > 0) {
			lastLine = `${current} ${remainingWords.join(' ')}`.trim();
		}
		if (lastLine.length > maxChars) {
			lastLine = `${lastLine.slice(0, maxChars - 1).trimEnd()}…`;
		}
		lines.push(lastLine);
	}

	return lines.slice(0, maxLines);
}

function renderTitleLines(lines: string[]): string {
	const startY = lines.length > 3 ? 244 : lines.length === 1 ? 304 : 278;
	return lines
		.map((line, index) => {
			const y = startY + index * 78;
			return `<text x="104" y="${y}" fill="var(--text)" font-family="Iowan Old Style, Georgia, 'Times New Roman', serif" font-size="66" font-weight="700" letter-spacing="-1.8">${escapeXml(line)}</text>`;
		})
		.join('');
}

function formatThemeLabel(theme: SeoTheme): string {
	return theme === 'redpages' ? 'RED PAGES' : theme.replace(/-/g, ' ').toUpperCase();
}

function renderWovenMotif(accent: string): string {
	const tiles = [
		{ x: 0, y: 0, fill: accent, opacity: 0.88 },
		{ x: 92, y: 0, fill: '#ffffff', opacity: 0.12 },
		{ x: 184, y: 0, fill: accent, opacity: 0.28 },
		{ x: 0, y: 92, fill: '#ffffff', opacity: 0.12 },
		{ x: 92, y: 92, fill: accent, opacity: 0.22 },
		{ x: 184, y: 92, fill: '#ffffff', opacity: 0.12 },
		{ x: 0, y: 184, fill: accent, opacity: 0.3 },
		{ x: 92, y: 184, fill: '#ffffff', opacity: 0.12 },
		{ x: 184, y: 184, fill: accent, opacity: 0.92 }
	]
		.map(
			(tile) =>
				`<rect x="${tile.x}" y="${tile.y}" width="72" height="72" rx="22" fill="${tile.fill}" opacity="${tile.opacity}" />`
		)
		.join('');

	return `
  <g transform="translate(876 134)">
    <rect x="0" y="0" width="256" height="256" rx="42" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" />
    <g transform="translate(26 26)">
      ${tiles}
    </g>
    <circle cx="206" cy="206" r="58" fill="none" stroke="${accent}" stroke-width="10" opacity="0.45" />
    <circle cx="54" cy="206" r="14" fill="${accent}" opacity="0.95" />
  </g>`;
}

function buildOgSvg(params: {
	title: string;
	eyebrow: string;
	meta: string;
	theme: SeoTheme;
}): string {
	const palette = getSeoThemePalette(params.theme);
	const titleLines = wrapText(params.title, 24, 4);
	const themeLabel = formatThemeLabel(params.theme);
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(params.title)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.background}" />
      <stop offset="100%" stop-color="${palette.panel}" />
    </linearGradient>
    <linearGradient id="panelGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03" />
    </linearGradient>
    <radialGradient id="halo" cx="100%" cy="0%" r="90%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.34" />
      <stop offset="55%" stop-color="${palette.accent}" stop-opacity="0.10" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
    <pattern id="weave" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M0 24 H48 M24 0 V48" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <path d="M0 0 L48 48 M48 0 L0 48" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    </pattern>
    <style>
      :root {
        --text: ${palette.text};
        --muted: ${palette.muted};
        --accent: ${palette.accent};
      }
    </style>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" rx="36" fill="url(#bg)" />
  <rect width="${WIDTH}" height="${HEIGHT}" rx="36" fill="url(#weave)" />
  <rect width="${WIDTH}" height="${HEIGHT}" rx="36" fill="url(#halo)" />
  <rect x="36" y="36" width="1128" height="558" rx="32" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" />
  <rect x="72" y="72" width="720" height="486" rx="32" fill="url(#panelGlow)" stroke="rgba(255,255,255,0.08)" />
  <rect x="828" y="72" width="300" height="486" rx="32" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
  <circle cx="1086" cy="92" r="140" fill="${palette.accent}" opacity="0.12" />
  <rect x="104" y="108" width="360" height="46" rx="23" fill="rgba(255,255,255,0.08)" />
  <circle cx="136" cy="131" r="8" fill="var(--accent)" />
  <text x="158" y="139" fill="var(--muted)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="2.4">${escapeXml(params.eyebrow.toUpperCase())}</text>
  <rect x="980" y="106" width="118" height="40" rx="20" fill="rgba(255,255,255,0.08)" />
  <text x="1039" y="133" text-anchor="middle" fill="var(--accent)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2.2">${escapeXml(themeLabel)}</text>
  ${renderTitleLines(titleLines)}
  <text x="104" y="472" fill="var(--muted)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="500">${escapeXml(params.meta)}</text>
  <rect x="104" y="516" width="640" height="1" fill="rgba(255,255,255,0.18)" />
  <text x="104" y="554" fill="var(--accent)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="3.4">${escapeXml('KNOWLEDGE BASKET')}</text>
  <text x="396" y="554" fill="var(--muted)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="1.4">${escapeXml('INDIGENOUS-LED OPPORTUNITIES, DIRECTORY, AND RESOURCES')}</text>
  ${renderWovenMotif(palette.accent)}
  <text x="852" y="446" fill="var(--muted)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="2">${escapeXml('SHARE PREVIEW')}</text>
  <text x="852" y="484" fill="var(--text)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="700">${escapeXml('1200 × 630 PNG')}</text>
  <text x="852" y="518" fill="var(--muted)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="500">${escapeXml('Optimized for social cards and link unfurls')}</text>
</svg>`;
}

export const GET: RequestHandler = async ({ url }) => {
	const title = sanitizeText(url.searchParams.get('title'), 'Knowledge Basket', 120);
	const eyebrow = sanitizeText(url.searchParams.get('eyebrow'), 'Knowledge Basket', 48);
	const meta = sanitizeText(
		url.searchParams.get('meta'),
		'Indigenous-led opportunities, directories, and practical resources',
		96
	);
	const theme = normalizeTheme(url.searchParams.get('theme'));
	const svg = buildOgSvg({ title, eyebrow, meta, theme });
	const sharp = getSharpRenderer();
	const png = await sharp(Buffer.from(svg)).png().toBuffer();

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
		}
	});
};
