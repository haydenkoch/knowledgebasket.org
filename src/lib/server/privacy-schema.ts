import {
	clearSchemaHealthCache,
	getSchemaHealth,
	type SchemaHealth,
	type SchemaRequirement
} from '$lib/server/schema-health';

const PRIVACY_REQUEST_REQUIREMENTS = [
	{ type: 'table', tableName: 'privacy_requests' }
] as const satisfies readonly SchemaRequirement[];

const ACCOUNT_LIFECYCLE_REQUIREMENTS = [
	{ type: 'table', tableName: 'privacy_requests' },
	{ type: 'table', tableName: 'organization_claim_requests' },
	{ type: 'table', tableName: 'organization_invites' },
	{ type: 'table', tableName: 'personal_calendar_feeds' }
] as const satisfies readonly SchemaRequirement[];

function buildPrivacyRequestsMessage(missing: string[]) {
	return `Privacy request storage is unavailable until the latest compliance migration is applied. Missing: ${missing.join(', ')}. Correction, removal, and audit logging will stay disabled until schema parity is restored.`;
}

function buildAccountLifecycleMessage(missing: string[]) {
	return `Account privacy and deletion tools are running in compatibility mode until the latest account/workspace migrations are applied. Missing: ${missing.join(', ')}. Export can continue in read-only mode, but delete-account and request logging should remain disabled until schema parity is restored.`;
}

export async function getPrivacyRequestsSchemaHealth(): Promise<SchemaHealth> {
	return getSchemaHealth({
		cacheKey: 'privacy-requests',
		requirements: PRIVACY_REQUEST_REQUIREMENTS,
		buildMessage: buildPrivacyRequestsMessage
	});
}

export async function getAccountLifecycleSchemaHealth(): Promise<SchemaHealth> {
	return getSchemaHealth({
		cacheKey: 'account-lifecycle',
		requirements: ACCOUNT_LIFECYCLE_REQUIREMENTS,
		buildMessage: buildAccountLifecycleMessage
	});
}

export async function assertPrivacyRequestsSchemaHealthy(): Promise<void> {
	const health = await getPrivacyRequestsSchemaHealth();
	if (!health.ok) {
		throw new Error(
			health.message ??
				'Privacy request storage is unavailable until the latest migration is applied.'
		);
	}
}

export async function assertAccountLifecycleSchemaHealthy(): Promise<void> {
	const health = await getAccountLifecycleSchemaHealth();
	if (!health.ok) {
		throw new Error(
			health.message ??
				'Account lifecycle tools are unavailable until the latest migration is applied.'
		);
	}
}

export function clearPrivacySchemaHealthCache() {
	clearSchemaHealthCache('privacy-requests');
	clearSchemaHealthCache('account-lifecycle');
}
