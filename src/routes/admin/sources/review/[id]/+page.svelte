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
	let previewImage = $derived(candidateImage());
	let flags = $derived(qualityFlags());

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

	function candidateImage(): string | null {
		if (!candidate.normalizedData || typeof candidate.normalizedData !== 'object') return null;
		const norm = candidate.normalizedData as Record<string, unknown>;
		return typeof norm.image_url === 'string' && norm.image_url.trim() ? norm.image_url : null;
	}

	function qualityFlags() {
		if (!candidate.normalizedData || typeof candidate.normalizedData !== 'object') return [];
		const norm = candidate.normalizedData as Record<string, unknown>;
		const description = typeof norm.description === 'string' ? norm.description.trim() : '';
		const image = typeof norm.image_url === 'string' ? norm.image_url.trim() : '';
		const venue =
			(typeof norm.location_name === 'string' && norm.location_name.trim()) ||
			(typeof norm.location_address === 'string' && norm.location_address.trim()) ||
			'';
		const flags: string[] = [];
		if (!image) flags.push('Missing image');
		if (candidate.coil === 'events' && !venue) flags.push('Missing venue details');
		if (description.length > 0 && description.length < 80) flags.push('Short description');
		if (candidate.dedupeResult === 'ambiguous') flags.push('Low-confidence match');
		if (Array.isArray(candidate.qualityFlags)) {
			for (const entry of candidate.qualityFlags) {
				if (!entry || typeof entry !== 'object') continue;
				const code = (entry as { code?: string }).code ?? '';
				if (code === 'conflicting_dates') flags.push('Date conflict');
				if (code === 'ai_detected_conflict') flags.push('AI found a conflict');
			}
		}
		return flags;
	}

	function extractedFacts() {
		return candidate.extractedFacts && typeof candidate.extractedFacts === 'object'
			? (candidate.extractedFacts as Record<string, unknown>)
			: {};
	}

	function extractedFactCount(key: 'offers' | 'conflicts') {
		const facts = extractedFacts();
		return Array.isArray(facts[key]) ? facts[key].length : 0;
	}

	function hasOrganizationField() {
		if (!candidate.normalizedData || typeof candidate.normalizedData !== 'object') return false;
		const norm = candidate.normalizedData as Record<string, unknown>;
		return typeof norm.organization_name === 'string' && norm.organization_name.trim().length > 0;
	}

	function hasVenueField() {
		if (!candidate.normalizedData || typeof candidate.normalizedData !== 'object') return false;
		const norm = candidate.normalizedData as Record<string, unknown>;
		return (
			(typeof norm.location_name === 'string' && norm.location_name.trim().length > 0) ||
			(typeof norm.location_address === 'string' && norm.location_address.trim().length > 0)
		);
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Imported listing"
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
			<span
				class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase"
			>
				{friendly(dedupeLabel, candidate.dedupeResult)}
			</span>
			{#if candidate.matchedCanonicalTitle}
				<span>Suggested match: {candidate.matchedCanonicalTitle}</span>
			{/if}
		{/snippet}
	</AdminPageHeader>

	{#if !data.schemaHealth.ok}
		<div
			class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-ember-300)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_78%,white)] px-5 py-4 text-sm text-[var(--color-ember-900)]"
		>
			{data.schemaHealth.message}
		</div>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[1fr_360px]">
		<!-- Left: content preview -->
		<div class="space-y-6">
			{#if previewImage || flags.length > 0}
				<AdminSectionCard
					title="Quick quality check"
					description="A fast read on whether this import has enough detail to publish cleanly."
				>
					{#snippet children()}
						<div class="space-y-4 px-5 py-5">
							{#if previewImage}
								<img src={previewImage} alt="" class="max-h-64 w-full rounded-2xl object-cover" />
							{/if}
							{#if flags.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each flags as flag}
										<span
											class="inline-flex items-center rounded-full border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/70 px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--mid)] uppercase"
										>
											{flag}
										</span>
									{/each}
								</div>
							{/if}
							{#if extractedFactCount('offers') > 0}
								<div class="text-sm text-[var(--mid)]">
									AI extracted {extractedFactCount('offers')} offer{extractedFactCount('offers') ===
									1
										? ''
										: 's'}.
								</div>
							{/if}
							{#if extractedFactCount('conflicts') > 0}
								<div
									class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] p-3 text-sm text-[var(--color-flicker-900)]"
								>
									AI flagged {extractedFactCount('conflicts')} possible conflict{extractedFactCount(
										'conflicts'
									) === 1
										? ''
										: 's'} for review.
								</div>
							{/if}
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			{#if isNew}
				<!-- New item: show as formatted fields -->
				<AdminSectionCard
					title="Listing details"
					description="What will be published if you approve this item."
				>
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
					title={isUpdate ? 'What would change' : 'Compared with the current listing'}
					description={isUpdate
						? 'Highlighted rows show fields that differ from the current live version.'
						: 'Review how this import compares with the listing that is already live.'}
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
					<AdminSectionCard
						title="Update summary"
						description="Which fields will update, which staff edits will stay in place, and which fields are unchanged."
					>
						{#snippet children()}
							<div class="grid gap-4 px-5 py-5 lg:grid-cols-3">
								<div
									class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-pinyon-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_60%,white)] p-4"
								>
									<p class="text-sm font-semibold text-[var(--color-pinyon-900)]">Will update</p>
									<div class="mt-3 space-y-2">
										{#each mp.appliedFields as field}
											<div>
												<p class="text-sm font-medium text-[var(--color-pinyon-800)]">
													{field.field}
												</p>
												<p class="text-xs text-[var(--color-pinyon-700)]">
													{mergeReasonLabel(field.reason)}
												</p>
											</div>
										{:else}
											<p class="text-xs text-[var(--color-pinyon-700)]">No fields will change.</p>
										{/each}
									</div>
								</div>
								<div
									class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] p-4"
								>
									<p class="text-sm font-semibold text-[var(--color-flicker-900)]">
										Keeping your edits
									</p>
									<div class="mt-3 space-y-2">
										{#each mp.preservedFields as field}
											<div>
												<p class="text-sm font-medium text-[var(--color-flicker-800)]">
													{field.field}
												</p>
												<p class="text-xs text-[var(--color-flicker-700)]">
													{mergeReasonLabel(field.reason)}
												</p>
											</div>
										{:else}
											<p class="text-xs text-[var(--color-flicker-700)]">
												No curator edits to preserve.
											</p>
										{/each}
									</div>
								</div>
								<div
									class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
								>
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
				<AdminSectionCard title="Listing details">
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
					<div
						class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] px-5 py-4 text-sm"
					>
						<p class="font-medium text-[var(--color-flicker-900)]">
							Possible existing listing found
						</p>
						<p class="mt-1 text-[var(--color-flicker-800)]">
							This item may be related to <span class="font-semibold"
								>{candidate.matchedCanonicalTitle}</span
							>. Compare carefully before publishing.
						</p>
					</div>
				{/if}
			{/if}

			<!-- Raw data (always hidden by default) -->
			<CollapsibleDebug
				label="Advanced details"
				data={{
					normalized: candidate.normalizedData,
					raw: candidate.rawData,
					extractedFacts: candidate.extractedFacts,
					diagnostics: candidate.diagnostics
				}}
			/>
		</div>

		<!-- Right: decision panel -->
		<div class="space-y-4">
			<AdminSectionCard title="Make a decision">
				{#snippet children()}
					<div class="space-y-3 px-5 py-5">
						{#if detail.suggestedMatches.length > 0}
							<form
								method="POST"
								action="?/resolveMatch"
								class="space-y-3 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
							>
								<p class="text-sm font-semibold text-[var(--dark)]">Choose the existing listing</p>
								<NativeSelect.Root
									name="matchedCanonicalId"
									value={candidate.matchedCanonicalId ?? ''}
								>
									<NativeSelect.Option value="">Choose a listing…</NativeSelect.Option>
									{#each detail.suggestedMatches as match}
										<NativeSelect.Option value={match.id}
											>{match.canonicalTitle}</NativeSelect.Option
										>
									{/each}
								</NativeSelect.Root>
								<Textarea
									name="reviewNotes"
									rows={2}
									placeholder="Why is this the right existing listing?"
								/>
								<Button type="submit" variant="secondary" class="w-full">Save listing match</Button>
							</form>
						{/if}

						{#if hasOrganizationField()}
							<div
								class="space-y-3 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
							>
								<p class="text-sm font-semibold text-[var(--dark)]">Link an organization</p>
								<form method="POST" action="?/linkOrganization" class="space-y-3">
									<NativeSelect.Root name="organizationId">
										<NativeSelect.Option value="">Choose an organization…</NativeSelect.Option>
										{#each detail.suggestedOrganizations as match}
											<NativeSelect.Option value={match.organization.id}>
												{match.organization.name} ({match.reasons.join(', ')})
											</NativeSelect.Option>
										{/each}
									</NativeSelect.Root>
									<Button type="submit" variant="secondary" class="w-full"
										>Use selected organization</Button
									>
								</form>
								<div class="flex gap-2">
									<form method="POST" action="?/createOrganization" class="flex-1">
										<Button type="submit" variant="outline" class="flex-1"
											>Create new organization</Button
										>
									</form>
								</div>
							</div>
						{/if}

						{#if candidate.coil === 'events' && hasVenueField()}
							<div
								class="space-y-3 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
							>
								<p class="text-sm font-semibold text-[var(--dark)]">Link a venue</p>
								<form method="POST" action="?/linkVenue" class="space-y-3">
									<NativeSelect.Root name="venueId">
										<NativeSelect.Option value="">Choose a venue…</NativeSelect.Option>
										{#each detail.suggestedVenues as match}
											<NativeSelect.Option value={match.venue.id}>
												{match.venue.name} ({match.reasons.join(', ')})
											</NativeSelect.Option>
										{/each}
									</NativeSelect.Root>
									<Button type="submit" variant="secondary" class="w-full"
										>Use selected venue</Button
									>
								</form>
								<div class="flex gap-2">
									<form method="POST" action="?/createVenue" class="flex-1">
										<Button type="submit" variant="outline" class="flex-1">Create new venue</Button>
									</form>
								</div>
							</div>
						{/if}

						{#if isNew || isAmbiguous}
							<form
								method="POST"
								action="?/approveAsNew"
								class="space-y-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-pinyon-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_50%,white)] p-4"
							>
								<p class="text-sm font-semibold text-[var(--color-pinyon-900)]">
									Publish as a new listing
								</p>
								<p class="text-xs text-[var(--color-pinyon-700)]">
									Creates a brand-new public listing from this import.
								</p>
								<Textarea name="reviewNotes" rows={2} placeholder="Optional notes" />
								<Button type="submit" class="w-full">
									<Check class="mr-2 h-4 w-4" />
									Publish new listing
								</Button>
							</form>
						{/if}

						{#if isUpdate || isAmbiguous || isDuplicate}
							<form
								method="POST"
								action="?/approveAsUpdate"
								class="space-y-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-lakebed-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_50%,white)] p-4"
							>
								<p class="text-sm font-semibold text-[var(--color-lakebed-900)]">
									Update the existing listing
								</p>
								<p class="text-xs text-[var(--color-lakebed-700)]">
									Applies these changes to the listing that is already live.
								</p>
								{#if detail.suggestedMatches.length > 0}
									<NativeSelect.Root
										name="matchedCanonicalId"
										value={candidate.matchedCanonicalId ?? ''}
									>
										<NativeSelect.Option value="">Use the current listing match</NativeSelect.Option
										>
										{#each detail.suggestedMatches as match}
											<NativeSelect.Option value={match.id}
												>{match.canonicalTitle}</NativeSelect.Option
											>
										{/each}
									</NativeSelect.Root>
								{/if}
								<Textarea
									name="reviewNotes"
									rows={2}
									placeholder="What should change on the live listing?"
								/>
								<Button type="submit" variant="secondary" class="w-full">Publish update</Button>
							</form>
						{/if}

						<form
							method="POST"
							action="?/needsInfo"
							class="space-y-3 rounded-xl border border-[color:var(--rule)] p-4"
						>
							<p class="text-sm font-semibold text-[var(--dark)]">Needs more work</p>
							<Textarea name="reviewNotes" rows={2} placeholder="What is missing or unclear?" />
							<Button type="submit" variant="outline" class="w-full">
								<Clock3 class="mr-2 h-4 w-4" />
								Mark as needs follow-up
							</Button>
						</form>

						<form
							method="POST"
							action="?/reject"
							class="space-y-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-ember-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_40%,white)] p-4"
						>
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

						<form
							method="POST"
							action="?/archive"
							class="space-y-2 rounded-xl border border-[color:var(--rule)] p-4"
						>
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
