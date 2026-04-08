function normalizeIcalText(value: string): string {
	return value
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.replace(/\u00a0/g, ' ')
		.trim();
}

export function toIcalDate(date: Date): string {
	return date
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

export function escapeIcalText(value: string): string {
	return normalizeIcalText(value)
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,');
}

export function htmlToPlainText(value: string, maxLength?: number): string {
	const withBreaks = value.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, '\n');
	const collapsed = withBreaks
		.replace(/<[^>]+>/g, ' ')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n[ \t]+/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/[ \t]{2,}/g, ' ')
		.trim();

	if (maxLength == null || collapsed.length <= maxLength) {
		return collapsed;
	}

	return collapsed.slice(0, maxLength).trim();
}

export function htmlToIcalText(value: string, maxLength?: number): string {
	return escapeIcalText(htmlToPlainText(value, maxLength));
}
