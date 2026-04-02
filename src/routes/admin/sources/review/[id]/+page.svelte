<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import CandidateFieldCard from '$lib/components/organisms/admin/CandidateFieldCard.svelte';
	import CandidateComparisonTable from '$lib/components/organisms/admin/CandidateComparisonTable.svelte';
	import CollapsibleDebug from '$lib/components/organisms/admin/CollapsibleDebug.svelte';
	import { ArrowLeft, Check, Clock3, X } from '@lucide/svelte';
	import { friendly, coilLabel, dedupeLabel, rejectionLabel } from '$lib/admin/labels.js';

	let { data } = $props();

	let detail = $derived(data.detail);
	let candidate = $derived(detail.candidate);
	let isNew = $derived(candidate.dedupeResult === 'new');
	let isUpdate = $derived(candidate.dedupeResult === 'update');
	let isDuplicate = $derived(candidate.dedupeResult === 'duplicate');
	let isAmbiguous = $derived(candidate.dedupeResult === 'ambiguous');

	let comparableCandidate = $derived(
		(detail.comparableCandidateRecord ?? {}) as Record<string, unknown>
	);
	let comparablePublished = $derived(
		(detail.comparablePublishedRecord ?? null) as Record<string, unknown> | null
	);

	function candidateTitle(): string {
		if (candidate.normalizedData && typeof candidate.normalizedData === 'object') {
			const norm = candidate.normalizedData as Record<string, unknown>;
			if (typeof norm.title === 'string' && norm.title.trim()) return norm.title;
			if (typeof norm.name === 'string' && norm.name.trim()) return norm.name;
		}
		return 'Untitled item';
	}

	function mergeReasonLabel(reason: string): string {
		const map: Record<string, string> = {
			source_managed: 'Kept from source',
			curator_override: 'Edited by curator',
			no_change: 'No change',
			new_field: 'New field',
			default: 'Default value'
		};
		return map[reason] ?? reason.replace(/_/g, ' ');
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Import review"
		title={candidateTitle()}
		description="From {candidate.sourceName} · {friendly(coilLabel, candidate.coil)}"
	>
		{#snippet actions()}
			<Button href="/admin/sources/review" variant="secondary">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to queue
			</Button>
		{/snippet}
		{#snippet meta()}
			<StatusBadge status={candidate.status ?? 'pending_review'} />
			<span class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase">
				{friendly(dedupeLabel, candidate.dedupeResult)}
			</span>
			{#if candidate.matchedCanonicalTitle}
				<span>Matches: {candidate.matchedCanonicalTitle}</span>
			{/if}
		{/snippet}
	</AdminPageHeader>

	<div class="grid gap-6 xl:grid-cols-[1fr_360px]">
		<!-- Left: content preview -->
		<div class="space-y-6">
			{#if isNew}
				<!-- New item: show as formatted fields -->
				<AdminSectionCard title="Item details" description="What will be published if approved.">
					{#snippet children()}
						<div class="px-5 py-4">
							<CandidateFieldCard
								data={candidate.normalizedData as Record<string, unknown>}
								coil={candidate.coil ?? ''}
							/>
						</div>
					{/snippet}
				</AdminSectionCard>
			{:else if comparablePublished}
				<!-- Update/duplicate: show comparison -->
				<AdminSectionCard
					title={isUpdate ? 'What would change' : 'Compared to existing record'}
					description={isUpdate
						? 'Highlighted rows show fields that differ from the current live version.'
						: 'Review how this import compares to an existing record.'}
				>
					{#snippet children()}
						<div class="px-5 py-4">
							<CandidateComparisonTable
								candidate={comparableCandidate}
								existing={comparablePublished}
							/>
						</div>
					{/snippet}
				</AdminSectionCard>

				{#if detail.mergePreview != null}
					{@const mp = detail.mergePreview}
					<AdminSectionCard title="Merge summary" description="Which fields will be updated, preserved, or left unchanged.">
						{#snippet children()}
							<div class="grid gap-4 px-5 py-5 lg:grid-cols-3">
								<div class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-pinyon-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_60%,white)] p-4">
									<p class="text-sm font-semibold text-[var(--color-pinyon-900)]">Will update</p>
									<div class="mt-3 space-y-2">
										{#each mp.appliedFields as field}
											<div>
												<p class="text-sm font-medium text-[var(--color-pinyon-800)]">{field.field}</p>
												<p class="text-xs text-[var(--color-pinyon-700)]">{mergeReasonLabel(field.reason)}</p>
											</div>
										{:else}
											<p class="text-xs text-[var(--color-pinyon-700)]">No fields will change.</p>
										{/each}
									</div>
								</div>
								<div class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] p-4">
									<p class="text-sm font-semibold text-[var(--color-flicker-900)]">Keeping your edits</p>
									<div class="mt-3 space-y-2">
										{#each mp.preservedFields as field}
											<div>
												<p class="text-sm font-medium text-[var(--color-flicker-800)]">{field.field}</p>
												<p class="text-xs text-[var(--color-flicker-700)]">{mergeReasonLabel(field.reason)}</p>
											</div>
										{:else}
											<p class="text-xs text-[var(--color-flicker-700)]">No curator edits to preserve.</p>
										{/each}
									</div>
								</div>
								<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4">
									<p class="text-sm font-semibold text-[var(--dark)]">No change</p>
									<div class="mt-3 space-y-2">
										{#each mp.unchangedFields as field}
											<div>
												<p class="text-sm font-medium text-[var(--dark)]">{field.field}</p>
												<p class="text-xs text-[var(--mid)]">{mergeReasonLabel(field.reason)}</p>
											</div>
										{:else}
											<p class="text-xs text-[var(--mid)]">No unchanged fields.</p>
										{/each}
									</div>
								</div>
							</div>
						{/snippet}
					</AdminSectionCard>
				{/if}
			{:else}
				<!-- Ambiguous / no published record -->
				<AdminSectionCard title="Item details">
					{#snippet children()}
						<div class="px-5 py-4">
							<CandidateFieldCard
								data={candidate.normalizedData as Record<string, unknown>}
								coil={candidate.coil ?? ''}
							/>
						</div>
					{/snippet}
				</AdminSectionCard>
				{#if candidate.matchedCanonicalTitle}
					<div class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] px-5 py-4 text-sm">
						<p class="font-medium text-[var(--color-flicker-900)]">Possible match found</p>
						<p class="mt-1 text-[var(--color-flicker-800)]">This item may be related to <span class="font-semibold">{candidate.matchedCanonicalTitle}</span>. Compare carefully before approving.</p>
					</div>
				{/if}
			{/if}

			<!-- Raw data (always hidden by default) -->
			<CollapsibleDebug
				label="Raw imported data"
				data={{ normalized: candidate.normalizedData, raw: candidate.rawData }}
			/>
		</div>

		<!-- Right: decision panel -->
		<div class="space-y-4">
			<AdminSectionCard title="Make a decision">
				{#snippet children()}
					<div class="space-y-3 px-5 py-5">
						{#if detail.suggestedMatches.length > 0}
							<form method="POST" action="?/resolveMatch" class="space-y-3 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4">
								<p class="text-sm font-semibold text-[var(--dark)]">Link to an existing record</p>
								<NativeSelect.Root name="matchedCanonicalId" value={candidate.matchedCanonicalId ?? ''}>
									<NativeSelect.Option value="">Choose a match…</NativeSelect.Option>
									{#each detail.suggestedMatches as match}
										<NativeSelect.Option value={match.id}>{match.canonicalTitle}</NativeSelect.Option>
									{/each}
								</NativeSelect.Root>
								<Textarea name="reviewNotes" rows={2} placeholder="Notes for this match decision" />
								<Button type="submit" variant="secondary" class="w-full">Save match</Button>
							</form>
						{/if}

						{#if isNew || isAmbiguous}
							<form method="POST" action="?/approveAsNew" class="space-y-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-pinyon-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_50%,white)] p-4">
								<p class="text-sm font-semibold text-[var(--color-pinyon-900)]">Publish as new</p>
								<p class="text-xs text-[var(--color-pinyon-700)]">Creates a new published record from this import.</p>
								<Textarea name="reviewNotes" rows={2} placeholder="Optional notes" />
								<Button type="submit" class="w-full">
									<Check class="mr-2 h-4 w-4" />
									Publish new record
								</Button>
							</form>
						{/if}

						{#if isUpdate || isAmbiguous || isDuplicate}
							<form method="POST" action="?/approveAsUpdate" class="space-y-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-lakebed-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_50%,white)] p-4">
								<p class="text-sm font-semibold text-[var(--color-lakebed-900)]">Apply update</p>
								<p class="text-xs text-[var(--color-lakebed-700)]">Merges these changes into the existing record.</p>
								{#if detail.suggestedMatches.length > 0}
									<NativeSelect.Root name="matchedCanonicalId" value={candidate.matchedCanonicalId ?? ''}>
										<NativeSelect.Option value="">Use current match</NativeSelect.Option>
										{#each detail.suggestedMatches as match}
											<NativeSelect.Option value={match.id}>{match.canonicalTitle}</NativeSelect.Option>
										{/each}
									</NativeSelect.Root>
								{/if}
								<Textarea name="reviewNotes" rows={2} placeholder="What should change on the live record?" />
								<Button type="submit" variant="secondary" class="w-full">Apply update</Button>
							</form>
						{/if}

						<form method="POST" action="?/needsInfo" class="space-y-3 rounded-xl border border-[color:var(--rule)] p-4">
							<p class="text-sm font-semibold text-[var(--dark)]">Request more info</p>
							<Textarea name="reviewNotes" rows={2} placeholder="What's missing or unclear?" />
							<Button type="submit" variant="outline" class="w-full">
								<Clock3 class="mr-2 h-4 w-4" />
								Waiting on info
							</Button>
						</form>

						<form method="POST" action="?/reject" class="space-y-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-ember-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_40%,white)] p-4">
							<p class="text-sm font-semibold text-[var(--color-ember-900)]">Reject</p>
							<NativeSelect.Root name="rejectionReason">
								{#each Object.entries(rejectionLabel) as [value, label]}
									<NativeSelect.Option {value}>{label}</NativeSelect.Option>
								{/each}
							</NativeSelect.Root>
							<Textarea name="reviewNotes" rows={2} placeholder="Optional notes" />
							<Button type="submit" variant="destructive" class="w-full">
								<X class="mr-2 h-4 w-4" />
								Reject
							</Button>
						</form>

						<form method="POST" action="?/archive" class="space-y-2 rounded-xl border border-[color:var(--rule)] p-4">
							<p class="text-sm font-semibold text-[var(--dark)]">Archive</p>
							<Textarea name="reviewNotes" rows={2} placeholder="Why are you archiving this?" />
							<Button type="submit" variant="ghost" class="w-full">Archive</Button>
						</form>
					</div>
				{/snippet}
			</AdminSectionCard>
		</div>
	</div>
</div>
