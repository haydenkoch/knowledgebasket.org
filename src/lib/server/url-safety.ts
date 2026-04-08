import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal'];

const privateAddressBlockList = new BlockList();
privateAddressBlockList.addSubnet('0.0.0.0', 8, 'ipv4');
privateAddressBlockList.addSubnet('10.0.0.0', 8, 'ipv4');
privateAddressBlockList.addSubnet('100.64.0.0', 10, 'ipv4');
privateAddressBlockList.addSubnet('127.0.0.0', 8, 'ipv4');
privateAddressBlockList.addSubnet('169.254.0.0', 16, 'ipv4');
privateAddressBlockList.addSubnet('172.16.0.0', 12, 'ipv4');
privateAddressBlockList.addSubnet('192.0.0.0', 24, 'ipv4');
privateAddressBlockList.addSubnet('192.0.2.0', 24, 'ipv4');
privateAddressBlockList.addSubnet('192.168.0.0', 16, 'ipv4');
privateAddressBlockList.addSubnet('198.18.0.0', 15, 'ipv4');
privateAddressBlockList.addSubnet('198.51.100.0', 24, 'ipv4');
privateAddressBlockList.addSubnet('203.0.113.0', 24, 'ipv4');
privateAddressBlockList.addSubnet('224.0.0.0', 4, 'ipv4');
privateAddressBlockList.addSubnet('240.0.0.0', 4, 'ipv4');
privateAddressBlockList.addSubnet('255.255.255.255', 32, 'ipv4');
privateAddressBlockList.addSubnet('::', 128, 'ipv6');
privateAddressBlockList.addSubnet('::1', 128, 'ipv6');
privateAddressBlockList.addSubnet('fc00::', 7, 'ipv6');
privateAddressBlockList.addSubnet('fe80::', 10, 'ipv6');
privateAddressBlockList.addSubnet('ff00::', 8, 'ipv6');
privateAddressBlockList.addSubnet('2001:db8::', 32, 'ipv6');

function parseHttpUrl(value: string | null | undefined): URL | null {
	const normalized = value?.trim();
	if (!normalized) return null;

	try {
		const parsed = new URL(normalized);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		if (parsed.username || parsed.password) return null;
		return parsed;
	} catch {
		return null;
	}
}

function isBlockedHostname(hostname: string): boolean {
	const normalized = hostname.trim().toLowerCase();
	return (
		normalized === 'localhost' ||
		normalized === '0.0.0.0' ||
		BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
	);
}

function isBlockedIpAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 0) return false;
	return privateAddressBlockList.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

export function normalizePublicHttpUrl(value: string | null | undefined): string | null {
	const parsed = parseHttpUrl(value);
	if (!parsed) return null;
	if (isBlockedHostname(parsed.hostname)) return null;
	if (isBlockedIpAddress(parsed.hostname)) return null;
	const normalized = parsed.toString().replace(/\/$/, '');
	return normalized || null;
}

export async function assertSafeOutboundUrl(value: string | null | undefined): Promise<string> {
	const normalized = normalizePublicHttpUrl(value);
	if (!normalized) {
		throw new Error('URL must be a public http or https URL.');
	}

	const parsed = new URL(normalized);
	if (isIP(parsed.hostname)) return normalized;

	let records: Array<{ address: string; family: number }>;
	try {
		records = (await lookup(parsed.hostname, {
			all: true,
			verbatim: true
		})) as Array<{ address: string; family: number }>;
	} catch {
		throw new Error('URL host could not be resolved.');
	}

	if (records.length === 0) {
		throw new Error('URL host could not be resolved.');
	}

	if (records.some((record) => isBlockedIpAddress(record.address))) {
		throw new Error('URL must not resolve to a private or local address.');
	}

	return normalized;
}

export async function fetchSafeOutboundResource(
	fetchImpl: typeof fetch,
	value: string,
	init: RequestInit = {},
	maxRedirects = 5
): Promise<Response> {
	let currentUrl = await assertSafeOutboundUrl(value);

	for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
		const response = await fetchImpl(currentUrl, {
			...init,
			redirect: 'manual'
		});

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) return response;
			currentUrl = await assertSafeOutboundUrl(new URL(location, currentUrl).toString());
			continue;
		}

		return response;
	}

	throw new Error('Too many redirects while fetching external resource.');
}
