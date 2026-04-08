import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
	...sanitizeHtml.defaults.allowedTags,
	'img',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'figure',
	'figcaption',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',
	'sup',
	'sub'
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
	a: ['href', 'name', 'target', 'rel'],
	img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
	td: ['colspan', 'rowspan'],
	th: ['colspan', 'rowspan']
};

function normalizeAnchor(tagName: string, attribs: Record<string, string>): sanitizeHtml.Tag {
	const normalized = { ...attribs };
	const target = normalized.target?.trim();

	if (target === '_blank') {
		normalized.rel = 'noopener noreferrer';
	} else {
		delete normalized.target;
		delete normalized.rel;
	}

	return { tagName, attribs: normalized };
}

function normalizeSanitizedHtml(value: string): string | null {
	const sanitized = sanitizeHtml(value, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: ALLOWED_ATTRIBUTES,
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowedSchemesAppliedToAttributes: ['href', 'src'],
		allowProtocolRelative: false,
		parseStyleAttributes: false,
		transformTags: {
			a: normalizeAnchor
		}
	}).trim();

	return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeRichTextHtml(value: string | null): string | null;
export function sanitizeRichTextHtml(value: string | undefined): string | undefined;
export function sanitizeRichTextHtml(value: string | null | undefined): string | null | undefined;
export function sanitizeRichTextHtml(value: string | null | undefined): string | null | undefined {
	if (value == null) return value;

	const trimmed = value.trim();
	if (!trimmed) return null;

	return normalizeSanitizedHtml(trimmed);
}
