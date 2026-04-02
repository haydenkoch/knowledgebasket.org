<script lang="ts">
	import { candidateFieldLabel } from '$lib/admin/labels.js';

	let {
		data,
		coil = ''
	}: {
		data: Record<string, unknown> | null | undefined;
		coil?: string;
	} = $props();

	// Fields to always skip — internal IDs, arrays of complex objects, nulls
	const skipFields = new Set([
		'id',
		'sourceId',
		'sourceItemId',
		'canonicalId',
		'matchedCanonicalId',
		'createdAt',
		'updatedAt',
		'importedAt',
		'rawData',
		'normalizedData',
		'_id'
	]);

	function isSkipped(key: string, value: unknown): boolean {
		if (skipFields.has(key)) return true;
		if (value === null || value === undefined) return true;
		if (typeof value === 'object' && !Array.isArray(value)) return true;
		return false;
	}

	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (Array.isArray(value)) {
			if (value.length === 0) return '—';
			return value
				.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
				.join(', ');
		}
		if (value instanceof Date) return value.toLocaleDateString();
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		if (typeof value === 'string' && value.startsWith('http')) {
			return value; // will be rendered as link
		}
		return String(value);
	}

	function isUrl(value: unknown): boolean {
		return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
	}

	const fields = $derived(
		Object.entries(data ?? {}).filter(([key, value]) => !isSkipped(key, value))
	);
</script>

{#if fields.length === 0}
	<p class="text-sm text-[var(--mid)]">No readable fields available.</p>
{:else}
	<dl class="divide-y divide-[color:var(--rule)]">
		{#each fields as [key, value]}
			<div class="grid grid-cols-[140px_1fr] gap-3 px-1 py-2.5">
				<dt class="text-xs font-semibold tracking-[0.04em] text-[var(--mid)] uppercase self-start pt-0.5">
					{candidateFieldLabel[key] ?? key.replace(/_/g, ' ')}
				</dt>
				<dd class="text-sm text-[var(--dark)] break-words">
					{#if isUrl(value)}
						<a
							href={String(value)}
							target="_blank"
							rel="noreferrer"
							class="text-primary hover:underline break-all"
						>
							{String(value)}
						</a>
					{:else}
						{formatValue(value)}
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
{/if}
