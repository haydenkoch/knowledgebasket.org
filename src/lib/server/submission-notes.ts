type SubmitterContact = {
	name?: string;
	email?: string;
	phone?: string;
};

export function buildSubmissionAdminNotes(
	contact: SubmitterContact,
	existingNotes?: string | null
): string {
	const details = [
		contact.name ? `Name: ${contact.name}` : null,
		contact.email ? `Email: ${contact.email}` : null,
		contact.phone ? `Phone: ${contact.phone}` : null
	].filter(Boolean);

	const blocks = [
		details.length > 0 ? `Public submission contact\n${details.join('\n')}` : null,
		existingNotes?.trim() ? existingNotes.trim() : null
	].filter(Boolean);

	return blocks.join('\n\n');
}

export function parseDateInput(value: FormDataEntryValue | null): Date | null {
	const raw = value?.toString().trim() ?? '';
	if (!raw) return null;
	const parsed = new Date(`${raw}T00:00:00.000Z`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function extractSubmissionContactFromNotes(notes?: string | null): SubmitterContact {
	const normalized = notes?.trim() ?? '';
	if (!normalized.startsWith('Public submission contact')) return {};

	const [contactBlock] = normalized.split(/\n\s*\n/, 1);
	const lines = contactBlock.split('\n').slice(1);
	const contact: SubmitterContact = {};

	for (const line of lines) {
		const [label, ...rest] = line.split(':');
		const value = rest.join(':').trim();
		if (!value) continue;
		const key = label.trim().toLowerCase();
		if (key === 'name') contact.name = value;
		if (key === 'email') contact.email = value;
		if (key === 'phone') contact.phone = value;
	}

	return contact;
}
