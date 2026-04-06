export type EditorChangeLine = {
	label: string;
	before: string;
	after: string;
};

function sortableValue(value: FormDataEntryValue): string {
	if (value instanceof File) {
		return JSON.stringify({
			name: value.name,
			size: value.size,
			type: value.type
		});
	}
	return value;
}

export function serializeForm(form: HTMLFormElement): string {
	const entries = Array.from(new FormData(form).entries())
		.map(([key, value], index) => [key, sortableValue(value), index] as const)
		.sort((a, b) => (a[0] === b[0] ? a[2] - b[2] : a[0].localeCompare(b[0])));
	return JSON.stringify(entries);
}

export function getFormValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

export function isValidHttpUrl(value: string): boolean {
	if (!value.trim()) return true;
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

export function displayValue(value: unknown): string {
	if (value == null) return 'Empty';
	if (Array.isArray(value)) {
		const items = value.map((item) => displayValue(item)).filter((item) => item !== 'Empty');
		return items.length ? items.join(', ') : 'Empty';
	}
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Empty';
	if (typeof value === 'string') return value.trim() || 'Empty';
	return String(value);
}

export function buildChangeLine(
	label: string,
	beforeValue: unknown,
	afterValue: unknown
): EditorChangeLine | null {
	const before = displayValue(beforeValue);
	const after = displayValue(afterValue);
	return before === after ? null : { label, before, after };
}
