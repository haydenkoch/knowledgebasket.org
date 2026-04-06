<script lang="ts">
	import { candidateFieldLabel } from '$lib/admin/labels.js';
	import { formatDisplayValue, humanizeIdentifier, isUrlLike } from '$lib/utils/display.js';

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

	const fields = $derived(
		Object.entries(data ?? {}).filter(([key, value]) => !isSkipped(key, value))
	);
</script>

{#if fields.length === 0}
	<p class="text-sm text-[var(--mid)]">No readable fields available.</p>
{:else}
	<dl class="divide-y divide-[color:var(--rule)]">
		{#each fields as [key, value]}
			{@const formattedLabel = candidateFieldLabel[key] ?? humanizeIdentifier(key)}
			{@const formattedValue = formatDisplayValue(value, { key })}
			<div class="grid grid-cols-[140px_1fr] gap-3 px-1 py-2.5">
				<dt
					class="self-start pt-0.5 text-xs font-semibold tracking-[0.04em] text-[var(--mid)] uppercase"
				>
					{formattedLabel}
				</dt>
				<dd class="text-sm break-words text-[var(--dark)]">
					{#if isUrlLike(value)}
						<a
							href={String(value)}
							target="_blank"
							rel="noreferrer"
							class="break-all text-primary hover:underline"
						>
							{String(value)}
						</a>
					{:else}
						{formattedValue}
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
{/if}
