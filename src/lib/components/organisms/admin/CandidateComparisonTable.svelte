<script lang="ts">
	import { candidateFieldLabel } from '$lib/admin/labels.js';
	import * as Table from '$lib/components/ui/table/index.js';

	let {
		candidate,
		existing
	}: {
		candidate: Record<string, unknown>;
		existing: Record<string, unknown> | null;
	} = $props();

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

	function formatCell(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (Array.isArray(value)) return value.join(', ') || '—';
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		return String(value);
	}

	function isChanged(a: unknown, b: unknown): boolean {
		return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
	}

	const rows = $derived(() => {
		const allKeys = Array.from(
			new Set([...Object.keys(candidate), ...Object.keys(existing ?? {})])
		)
			.filter((k) => !skipFields.has(k))
			.filter((k) => {
				const cv = candidate[k];
				const pv = existing?.[k];
				// Skip keys where both sides are objects (non-primitive)
				if (
					typeof cv === 'object' &&
					!Array.isArray(cv) &&
					cv !== null &&
					typeof pv === 'object' &&
					!Array.isArray(pv) &&
					pv !== null
				)
					return false;
				// Skip if both are null/undefined
				if ((cv === null || cv === undefined) && (pv === null || pv === undefined)) return false;
				return true;
			});

		return allKeys.map((key) => ({
			key,
			label: candidateFieldLabel[key] ?? key.replace(/_/g, ' '),
			candidate: candidate[key],
			existing: existing?.[key] ?? null,
			changed: isChanged(candidate[key], existing?.[key] ?? null)
		}));
	});

	const changedCount = $derived(rows().filter((r) => r.changed).length);
</script>

{#if rows().length === 0}
	<p class="text-sm text-[var(--mid)]">No comparable fields found.</p>
{:else}
	{#if changedCount > 0}
		<p class="mb-3 text-sm text-[var(--mid)]">
			<span class="font-semibold text-[var(--dark)]">{changedCount} field{changedCount !== 1 ? 's' : ''}</span>
			would change if this update is approved. Highlighted rows show differences.
		</p>
	{/if}
	<div class="overflow-x-auto rounded-lg border border-[color:var(--rule)]">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[140px]">Field</Table.Head>
					<Table.Head>Imported version</Table.Head>
					<Table.Head>Current live version</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows() as row}
					<Table.Row
						class={row.changed
							? 'bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)]'
							: ''}
					>
						<Table.Cell class="font-medium text-xs tracking-[0.04em] text-[var(--mid)] uppercase align-top pt-3">
							{row.label}
							{#if row.changed}
								<span class="ml-1 text-[var(--color-flicker-700)]">●</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="align-top text-sm max-w-[280px] break-words">
							{formatCell(row.candidate)}
						</Table.Cell>
						<Table.Cell class="align-top text-sm text-[var(--mid)] max-w-[280px] break-words">
							{formatCell(row.existing)}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
