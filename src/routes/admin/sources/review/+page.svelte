<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import CandidateFieldCard from '$lib/components/organisms/admin/CandidateFieldCard.svelte';
	import CollapsibleDebug from '$lib/components/organisms/admin/CollapsibleDebug.svelte';
	import { ArrowRight, Check, Clock3, X } from '@lucide/svelte';
	import {
		friendly,
		timeAgo,
		coilLabel,
		priorityLabel,
		dedupeLabel,
		rejectionLabel
	} from '$lib/admin/labels.js';

	let { data } = $props();
	let searchValue = $state('');
	let selectedIds = $state<string[]>([]);

	$effect(() => {
		searchValue = data.currentSearch ?? '';
	});

	$effect(() => {
		selectedIds = [];
	});

	function applyFilter(key: string, value: string) {
		const url = new URL($page.url);
		url.searchParams.set(key, value);
		url.searchParams.set('page', '1');
		goto(url);
	}

	function doSearch() {
		const url = new URL($page.url);
		url.searchParams.set('search', searchValue);
		url.searchParams.set('page', '1');
		goto(url);
	}

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / 25)));

	function goPage(nextPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(nextPage));
		goto(url);
	}

	function candidateTitle(candidate: (typeof data.candidates)[number]) {
		if (candidate.normalizedData && typeof candidate.normalizedData === 'object') {
			const norm = candidate.normalizedData as Record<string, unknown>;
			if (typeof norm.title === 'string' && norm.title.trim()) return norm.title;
			if (typeof norm.name === 'string' && norm.name.trim()) return norm.name;
		}
		return 'Untitled item';
	}

	function candidateExcerpt(candidate: (typeof data.candidates)[number]): string | null {
		if (candidate.normalizedData && typeof candidate.normalizedData === 'object') {
			const norm = candidate.normalizedData as Record<string, unknown>;
			if (typeof norm.description === 'string' && norm.description.trim()) {
				return norm.description.slice(0, 160).trim() + (norm.description.length > 160 ? '…' : '');
			}
		}
		return null;
	}

	function candidateImage(candidate: (typeof data.candidates)[number]): string | null {
		if (candidate.normalizedData && typeof candidate.normalizedData === 'object') {
			const norm = candidate.normalizedData as Record<string, unknown>;
			return typeof norm.image_url === 'string' && norm.image_url.trim() ? norm.image_url : null;
		}
		return null;
	}

	function qualityFlags(candidate: (typeof data.candidates)[number]) {
		const flags: string[] = [];
		if (!candidate.normalizedData || typeof candidate.normalizedData !== 'object') return flags;
		const norm = candidate.normalizedData as Record<string, unknown>;
		const description = typeof norm.description === 'string' ? norm.description.trim() : '';
		const image = typeof norm.image_url === 'string' ? norm.image_url.trim() : '';
		const venue =
			typeof norm.location_name === 'string' && norm.location_name.trim()
				? norm.location_name.trim()
				: typeof norm.location_address === 'string' && norm.location_address.trim()
					? norm.location_address.trim()
					: '';

		if (!image) flags.push('Missing image');
		if (candidate.coil === 'events' && !venue) flags.push('Missing venue details');
		if (description.length > 0 && description.length < 80) flags.push('Short description');
		if (candidate.dedupeResult === 'ambiguous') flags.push('Low-confidence match');
		return flags;
	}

	function isBulkEligible(candidate: (typeof data.candidates)[number]) {
		return candidate.dedupeResult === 'new' && !candidate.matchedCanonicalId;
	}

	function toggleSelected(id: string, checked: boolean) {
		selectedIds = checked
			? Array.from(new Set([...selectedIds, id]))
			: selectedIds.filter((entry) => entry !== id);
	}

	function selectAll() {
		selectedIds = data.candidates.filter(isBulkEligible).map((c) => c.id);
	}

	function clearSelected() {
		selectedIds = [];
	}

	const bulkEligibleCount = $derived(data.candidates.filter(isBulkEligible).length);

	// Priority badge classes using KB color system
	function priorityClass(priority: string) {
		if (priority === 'high')
			return 'border-[color:color-mix(in_srgb,var(--color-ember-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_90%,white)] text-[var(--color-ember-900)]';
		if (priority === 'low')
			return 'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-700)]';
		return 'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-700)]';
	}

	function dedupeClass(result: string) {
		if (result === 'new')
			return 'border-[color:color-mix(in_srgb,var(--color-pinyon-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_90%,white)] text-[var(--color-pinyon-800)]';
		if (result === 'duplicate')
			return 'border-[color:color-mix(in_srgb,var(--color-flicker-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_90%,white)] text-[var(--color-flicker-900)]';
		if (result === 'update')
			return 'border-[color:color-mix(in_srgb,var(--color-lakebed-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_90%,white)] text-[var(--color-lakebed-900)]';
		if (result === 'ambiguous')
			return 'border-[color:color-mix(in_srgb,var(--color-salmonberry-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-salmonberry-50)_90%,white)] text-[var(--color-salmonberry-900)]';
		return 'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-700)]';
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Sources"
		title="Review imported listings"
		description="Review imported items before they go live. Publish new listings, update existing ones, or set aside anything that needs more work."
	>
		{#snippet meta()}
			<span>{data.total} item{data.total !== 1 ? 's' : ''} in queue</span>
			{#if bulkEligibleCount > 0}
				<span>{bulkEligibleCount} eligible for bulk approval</span>
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

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="space-y-4 p-4">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						doSearch();
					}}
					class="flex w-full max-w-md gap-2"
				>
					<Input bind:value={searchValue} placeholder="Search by title or source…" />
					<Button type="submit" variant="secondary">Search</Button>
				</form>
				<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
					<NativeSelect.Root
						value={data.currentStatus}
						onchange={(e) => applyFilter('status', (e.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="open">Open queue</NativeSelect.Option>
						<NativeSelect.Option value="all">All statuses</NativeSelect.Option>
						<NativeSelect.Option value="pending_review">Needs review</NativeSelect.Option>
						<NativeSelect.Option value="needs_info">Waiting on info</NativeSelect.Option>
						<NativeSelect.Option value="approved">Approved</NativeSelect.Option>
						<NativeSelect.Option value="rejected">Rejected</NativeSelect.Option>
						<NativeSelect.Option value="archived">Archived</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentCoil}
						onchange={(e) => applyFilter('coil', (e.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All content types</NativeSelect.Option>
						<NativeSelect.Option value="events">Events</NativeSelect.Option>
						<NativeSelect.Option value="funding">Funding</NativeSelect.Option>
						<NativeSelect.Option value="jobs">Jobs</NativeSelect.Option>
						<NativeSelect.Option value="red_pages">Red Pages</NativeSelect.Option>
						<NativeSelect.Option value="toolbox">Toolbox</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentPriority}
						onchange={(e) => applyFilter('priority', (e.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All priorities</NativeSelect.Option>
						<NativeSelect.Option value="high">High priority</NativeSelect.Option>
						<NativeSelect.Option value="normal">Normal</NativeSelect.Option>
						<NativeSelect.Option value="low">Low priority</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentDedupeResult}
						onchange={(e) => applyFilter('dedupeResult', (e.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All match statuses</NativeSelect.Option>
						<NativeSelect.Option value="new">New item</NativeSelect.Option>
						<NativeSelect.Option value="duplicate">Same listing</NativeSelect.Option>
						<NativeSelect.Option value="update">Update to existing listing</NativeSelect.Option>
						<NativeSelect.Option value="ambiguous">Needs review</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentSourceId}
						onchange={(e) => applyFilter('sourceId', (e.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All sources</NativeSelect.Option>
						{#each data.sourceOptions as source}
							<NativeSelect.Option value={source.id}>{source.name}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Bulk actions -->
	{#if selectedIds.length > 0 || bulkEligibleCount > 0}
		<div
			class="rounded-2xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/60 p-4"
		>
			<div class="flex flex-wrap items-center gap-3">
				<span class="text-sm font-medium text-[var(--dark)]">
					{selectedIds.length} selected
				</span>
				{#if bulkEligibleCount > 0}
					<button type="button" class="text-sm text-primary hover:underline" onclick={selectAll}>
						Select all {bulkEligibleCount} eligible
					</button>
				{/if}
				{#if selectedIds.length > 0}
					<button
						type="button"
						class="text-sm text-[var(--mid)] hover:underline"
						onclick={clearSelected}
					>
						Clear
					</button>
				{/if}
				<div class="ml-auto flex flex-wrap items-center gap-2">
					<form method="POST" action="?/bulkApprove" class="contents">
						{#each selectedIds as id}
							<input type="hidden" name="candidateId" value={id} />
						{/each}
						<Button type="submit" size="sm" disabled={selectedIds.length === 0}>
							<Check class="mr-1.5 h-3.5 w-3.5" />
							Approve selected ({selectedIds.length})
						</Button>
					</form>
					<form
						method="POST"
						action="?/bulkReject"
						class="inline-flex items-center rounded-lg border border-[color:var(--rule)] bg-white/60"
					>
						{#each selectedIds as id}
							<input type="hidden" name="candidateId" value={id} />
						{/each}
						<NativeSelect.Root
							name="rejectionReason"
							class="h-8 rounded-none rounded-l-lg border-0 border-r border-[color:var(--rule)] bg-transparent text-xs"
						>
							{#each Object.entries(rejectionLabel) as [value, label]}
								<NativeSelect.Option {value}>{label}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
						<Button
							type="submit"
							variant="ghost"
							size="sm"
							disabled={selectedIds.length === 0}
							class="rounded-l-none px-2.5 text-[var(--color-ember-700)] hover:bg-[color:color-mix(in_srgb,var(--color-ember-50)_80%,transparent)] hover:text-[var(--color-ember-900)]"
						>
							<X class="mr-1.5 h-3.5 w-3.5" />
							Reject selected
						</Button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Candidate list -->
	<div class="space-y-4">
		{#each data.candidates as candidate}
			{@const title = candidateTitle(candidate)}
			{@const excerpt = candidateExcerpt(candidate)}
			{@const image = candidateImage(candidate)}
			{@const eligible = isBulkEligible(candidate)}
			{@const isUpdate =
				candidate.dedupeResult === 'update' || candidate.dedupeResult === 'ambiguous'}
			{@const flags = qualityFlags(candidate)}
			<Card.Root class="border border-[color:var(--rule)]">
				<Card.Content class="space-y-4 p-5">
					<!-- Header row -->
					<div class="flex flex-wrap items-start gap-3">
						{#if eligible}
							<label class="mt-0.5 flex h-5 w-5 cursor-pointer items-center">
								<input
									type="checkbox"
									class="h-4 w-4 rounded border-[color:var(--rule)]"
									checked={selectedIds.includes(candidate.id)}
									onchange={(e) =>
										toggleSelected(candidate.id, (e.currentTarget as HTMLInputElement).checked)}
								/>
							</label>
						{/if}
						{#if image}
							<img src={image} alt="" class="h-20 w-28 rounded-xl object-cover" />
						{/if}
						<div class="min-w-0 flex-1 space-y-1">
							<h2 class="font-serif text-lg leading-tight font-semibold text-[var(--dark)]">
								{title}
							</h2>
							{#if excerpt}
								<p class="text-sm leading-5 text-[var(--mid)]">{excerpt}</p>
							{/if}
							<p class="text-xs text-[var(--mid)]">
								From <a
									href={`/admin/sources/${candidate.sourceId}`}
									class="font-medium hover:underline">{candidate.sourceName}</a
								>
								· Imported {timeAgo(candidate.importedAt)}
								{#if candidate.sourceItemUrl}
									·
									<a
										href={candidate.sourceItemUrl}
										target="_blank"
										rel="noreferrer"
										class="hover:underline"
									>
										View original
									</a>
								{/if}
							</p>
						</div>
						<div class="flex shrink-0 flex-wrap items-center gap-2">
							<span
								class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase {dedupeClass(
									candidate.dedupeResult ?? ''
								)}"
							>
								{friendly(dedupeLabel, candidate.dedupeResult)}
							</span>
							<span
								class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase {priorityClass(
									candidate.priority ?? ''
								)}"
							>
								{friendly(priorityLabel, candidate.priority)}
							</span>
							<span
								class="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--color-granite-700)] uppercase"
							>
								{friendly(coilLabel, candidate.coil)}
							</span>
						</div>
					</div>

					{#if candidate.matchedCanonicalTitle}
						<div
							class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] px-4 py-2.5 text-sm"
						>
							<span class="font-medium text-[var(--color-flicker-900)]"
								>Suggested existing listing:</span
							>
							<span class="ml-1 text-[var(--color-flicker-800)]"
								>{candidate.matchedCanonicalTitle}</span
							>
						</div>
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

					<!-- Normalized data as friendly fields -->
					{#if candidate.normalizedData && typeof candidate.normalizedData === 'object'}
						<div
							class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/40 px-4 py-3"
						>
							<p class="mb-3 text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
								Item details
							</p>
							<CandidateFieldCard
								data={candidate.normalizedData as Record<string, unknown>}
								coil={candidate.coil ?? ''}
							/>
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex flex-wrap items-center gap-2 border-t border-[color:var(--rule)] pt-4">
						{#if isUpdate}
							<Button href={`/admin/sources/review/${candidate.id}`} variant="secondary" size="sm">
								<ArrowRight class="mr-1.5 h-3.5 w-3.5" />
								Review details
							</Button>
						{:else}
							<form
								method="POST"
								action="?/approve"
								use:enhance={() =>
									async ({ result, update }) => {
										if (result.type === 'success') toast.success('Approved');
										await update();
									}}
								class="inline"
							>
								<input type="hidden" name="id" value={candidate.id} />
								<Button type="submit" size="sm">
									<Check class="mr-1.5 h-3.5 w-3.5" />
									Approve
								</Button>
							</form>
						{/if}

						<form
							method="POST"
							action="?/needsInfo"
							use:enhance={() =>
								async ({ result, update }) => {
									if (result.type === 'success') toast.success('Marked as waiting on info');
									await update();
								}}
							class="inline"
						>
							<input type="hidden" name="id" value={candidate.id} />
							<Button type="submit" size="sm" variant="secondary">
								<Clock3 class="mr-1.5 h-3.5 w-3.5" />
								Needs info
							</Button>
						</form>

						<form
							method="POST"
							action="?/reject"
							use:enhance={() =>
								async ({ result, update }) => {
									if (result.type === 'success') toast.success('Rejected');
									await update();
								}}
							class="inline-flex items-center rounded-lg border border-[color:var(--rule)] bg-white/60"
						>
							<input type="hidden" name="id" value={candidate.id} />
							<NativeSelect.Root
								name="rejectionReason"
								class="h-8 rounded-none rounded-l-lg border-0 border-r border-[color:var(--rule)] bg-transparent text-xs"
							>
								{#each Object.entries(rejectionLabel) as [value, label]}
									<NativeSelect.Option {value}>{label}</NativeSelect.Option>
								{/each}
							</NativeSelect.Root>
							<Button
								type="submit"
								size="sm"
								variant="ghost"
								class="rounded-l-none px-2.5 text-[var(--color-ember-700)] hover:bg-[color:color-mix(in_srgb,var(--color-ember-50)_80%,transparent)] hover:text-[var(--color-ember-900)]"
							>
								<X class="mr-1.5 h-3.5 w-3.5" />
								Reject
							</Button>
						</form>

						<form
							method="POST"
							action="?/archive"
							use:enhance={() =>
								async ({ result, update }) => {
									if (result.type === 'success') toast.success('Archived');
									await update();
								}}
							class="ml-auto inline"
						>
							<input type="hidden" name="id" value={candidate.id} />
							<Button type="submit" size="sm" variant="ghost">Archive</Button>
						</form>

						<a
							href={`/admin/sources/review/${candidate.id}`}
							class="ml-1 text-sm font-medium text-[var(--mid)] hover:text-primary hover:underline"
						>
							Full review
						</a>
					</div>

					<!-- Debug (hidden by default) -->
					<CollapsibleDebug
						label="Raw data"
						data={{ normalized: candidate.normalizedData, raw: candidate.rawData }}
					/>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Content class="py-12 text-center text-[var(--mid)]">
					No items match the current filters.
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between text-sm text-[var(--mid)]">
		<span>Showing {data.candidates.length} of {data.total} items</span>
		<div class="flex items-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={data.currentPage <= 1}
				onclick={() => goPage(data.currentPage - 1)}
			>
				Previous
			</Button>
			<span>Page {data.currentPage} of {totalPages}</span>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={data.currentPage >= totalPages}
				onclick={() => goPage(data.currentPage + 1)}
			>
				Next
			</Button>
		</div>
	</div>
</div>
