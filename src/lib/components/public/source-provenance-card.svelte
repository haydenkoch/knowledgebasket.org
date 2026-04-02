<script lang="ts">
	import type { SourceProvenance } from '$lib/data/kb';

	let { provenance, label = 'Imported from' } = $props<{
		provenance?: SourceProvenance;
		label?: string;
	}>();

	const syncedLabel = $derived(
		provenance?.lastSyncedAt ? new Date(provenance.lastSyncedAt).toLocaleDateString() : null
	);
</script>

{#if provenance}
	<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
		<h3
			class="mb-3 font-sans text-xs font-bold tracking-[0.1em] text-[var(--muted-foreground)] uppercase"
		>
			{label}
		</h3>
		<dl class="flex flex-col gap-3 text-sm">
			<div>
				<dt
					class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
				>
					Source
				</dt>
				<dd class="mt-0.5 text-[var(--foreground)]">
					{#if provenance.sourceUrl}
						<a href={provenance.sourceUrl} target="_blank" rel="noopener" class="hover:underline">
							{provenance.sourceName}
						</a>
					{:else}
						{provenance.sourceName}
					{/if}
				</dd>
			</div>
			{#if provenance.sourceItemUrl}
				<div>
					<dt
						class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
					>
						Original listing
					</dt>
					<dd class="mt-0.5 text-[var(--foreground)]">
						<a
							href={provenance.sourceItemUrl}
							target="_blank"
							rel="noopener"
							class="hover:underline"
						>
							View original source
						</a>
					</dd>
				</div>
			{/if}
			<div>
				<dt
					class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
				>
					Attribution
				</dt>
				<dd class="mt-0.5 text-[var(--foreground)]">{provenance.attributionText}</dd>
			</div>
			{#if syncedLabel}
				<div>
					<dt
						class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
					>
						Last synced
					</dt>
					<dd class="mt-0.5 text-[var(--foreground)]">{syncedLabel}</dd>
				</div>
			{/if}
			{#if provenance.sourceCount > 1}
				<div>
					<dt
						class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
					>
						Additional sources
					</dt>
					<dd class="mt-0.5 text-[var(--foreground)]">{provenance.sourceCount - 1}</dd>
				</div>
			{/if}
		</dl>
	</div>
{/if}
