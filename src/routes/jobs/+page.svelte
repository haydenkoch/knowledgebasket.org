<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import {
		Pagination,
		PaginationContent,
		PaginationItem,
		PaginationLink,
		PaginationPrevious,
		PaginationNext,
		PaginationEllipsis
	} from '$lib/components/ui/pagination/index.js';
	import type { JobItem } from '$lib/data/kb';
	import { matchSearch, filterByFacets, facetCounts } from '$lib/utils/format';

	let { data } = $props();
	const jobs = $derived(data.jobs ?? []) as JobItem[];
	const total = $derived(jobs.length);

	let searchQuery = $state('');
	let typeFilter = $state<string[]>([]);
	let sectorFilter = $state<string[]>([]);
	let levelFilter = $state<string[]>([]);
	let workArrangementFilter = $state<string[]>([]);

	const typeCounts = $derived(facetCounts(jobs, 'jobType'));
	const sectorCounts = $derived(facetCounts(jobs, 'sector'));
	const levelCounts = $derived(facetCounts(jobs, 'seniority'));
	const workArrangementCounts = $derived(facetCounts(jobs, 'workArrangement'));
	const typeValues = $derived(Object.keys(typeCounts).sort());
	const sectorValues = $derived(Object.keys(sectorCounts).sort());
	const levelValues = $derived(Object.keys(levelCounts).sort());
	const workArrangementValues = $derived(Object.keys(workArrangementCounts).sort());

	const filtered = $derived(
		filterByFacets(
			jobs.filter((e) =>
				matchSearch(e, searchQuery, ['employerName', 'location', 'jobType', 'sector'])
			),
			{
				jobType: typeFilter,
				sector: sectorFilter,
				seniority: levelFilter,
				workArrangement: workArrangementFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);
	const PER_PAGE = 6;
	let pageBinding = $state(1);
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTotal / PER_PAGE)));
	const currentPage = $derived(Math.min(pageBinding, totalPages));
	const paginatedList = $derived(
		filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);
	$effect(() => {
		pageBinding = currentPage;
	});

	function toggle(arr: string[], val: string) {
		return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
	}
	function clearFilters() {
		searchQuery = '';
		typeFilter = [];
		sectorFilter = [];
		levelFilter = [];
		workArrangementFilter = [];
	}
	function initials(s: string): string {
		if (!s?.trim()) return '?';
		return s
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}
	function deadlinePill(deadline?: string): { label: string; kind: 'urgent' | 'ok' | 'rolling' } {
		if (!deadline?.trim()) return { label: 'Open until filled', kind: 'rolling' };
		const lower = deadline.toLowerCase();
		if (lower.includes('rolling') || lower.includes('open until'))
			return { label: 'Open until filled', kind: 'rolling' };
		const short = deadline.slice(0, 50);
		const inDays = (d: Date) => Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
		const parsed = new Date(deadline);
		if (isNaN(parsed.getTime())) return { label: short, kind: 'ok' };
		const days = inDays(parsed);
		const label =
			days <= 7
				? `Closes ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
				: short;
		return { label, kind: days <= 7 ? 'urgent' : 'ok' };
	}
</script>

{#snippet weave()}
	<defs>
		<pattern id="wv-jobs" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="10" height="4" fill="white" />
			<rect x="10" y="10" width="10" height="4" fill="white" />
			<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-jobs)" />
{/snippet}
{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{total}</strong><span
			class="text-xs opacity-70">Open positions</span
		>
	</div>
{/snippet}
{#snippet sidebar()}
	<div class="relative mb-7">
		<span
			class="absolute top-1/2 left-3 flex -translate-y-1/2 items-center justify-center text-[14px] text-[var(--muted-foreground)]"
			aria-hidden="true">🔍</span
		>
		<Input type="search" placeholder="Search jobs…" class="pl-[38px]" bind:value={searchQuery} />
	</div>
	<KbFilterSection
		title="Job Type"
		options={typeValues.map((t) => ({ value: t, label: t, count: typeCounts[t] ?? 0 }))}
		selected={typeFilter}
		onToggle={(val) => (typeFilter = toggle(typeFilter, val))}
		emptyLabel="No types"
	/>
	<KbFilterSection
		title="Sector"
		options={sectorValues.map((s) => ({ value: s, label: s, count: sectorCounts[s] ?? 0 }))}
		selected={sectorFilter}
		onToggle={(val) => (sectorFilter = toggle(sectorFilter, val))}
		emptyLabel="No sectors"
	/>
	<KbFilterSection
		title="Level"
		options={levelValues.map((l) => ({ value: l, label: l, count: levelCounts[l] ?? 0 }))}
		selected={levelFilter}
		onToggle={(val) => (levelFilter = toggle(levelFilter, val))}
		emptyLabel="No levels"
	/>
	<KbFilterSection
		title="Work arrangement"
		options={workArrangementValues.map((w) => ({
			value: w,
			label: w,
			count: workArrangementCounts[w] ?? 0
		}))}
		selected={workArrangementFilter}
		onToggle={(val) => (workArrangementFilter = toggle(workArrangementFilter, val))}
		emptyLabel="None"
	/>
	<button
		type="button"
		class="mt-2 cursor-pointer border-none bg-transparent p-0 font-sans text-xs text-[var(--teal)] underline"
		onclick={clearFilters}>Clear all filters</button
	>
{/snippet}

<div>
	<KbHero
		coil="jobs"
		eyebrow="Knowledge Basket · Coil 4"
		title="Job Board"
		description="Career opportunities with Tribes, agencies, and organizations prioritizing Indigenous hiring."
		{weave}
		{stats}
	/>

	<KbTwoColumnLayout {sidebar}>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live job data is unavailable</AlertTitle>
					<AlertDescription>
						The page is showing a safe fallback because the local database connection failed. Check
						`DATABASE_URL`, start local services, and run `pnpm db:push` if the schema is missing.
					</AlertDescription>
				</Alert>
			{/if}
			<div class="mb-[22px] flex items-center justify-between border-b border-[var(--rule)] pb-4">
				<div class="font-sans text-[14px] text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> jobs
				</div>
				<select
					class="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
					aria-label="Sort"
				>
					<option>Recently posted</option>
					<option>Deadline</option>
				</select>
			</div>
			<div class="flex flex-col gap-3">
				{#each paginatedList as job (job.id)}
					{@const pill = deadlinePill(job.applicationDeadline)}
					<a
						href="/jobs/{job.slug ?? job.id}"
						class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-[box-shadow,transform] duration-150 hover:translate-x-[3px] hover:shadow-[var(--shh)]"
					>
						<div
							class="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[var(--forest,#2d6a4f)] font-sans text-lg font-bold text-white"
						>
							{initials(job.employerName ?? job.title)}
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							{#if job.indigenousPriority}
								<span class="text-[11px] font-bold tracking-[0.06em] text-[var(--teal)] uppercase"
									>★ Indigenous Hires Prioritized</span
								>
							{/if}
							<div class="font-serif text-base leading-[1.3] font-semibold text-[var(--dark)]">
								{job.title}
							</div>
							{#if job.employerName}<div class="text-sm text-[var(--muted-foreground)]">
									{job.employerName}
								</div>{/if}
							<div class="mb-2 flex flex-wrap gap-[5px]">
								{#if job.sector}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{job.sector}</span
									>{/if}
								{#if job.jobType}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{job.jobType}</span
									>{/if}
							</div>
							{#if job.location || job.seniority}
								<div class="flex flex-wrap gap-1.5 text-xs text-[var(--muted-foreground)]">
									{#if job.location}<span>{job.location}</span>{/if}
									{#if job.seniority}<span>{job.seniority}</span>{/if}
								</div>
							{/if}
						</div>
						<div class="flex flex-none flex-col items-end gap-2">
							<span
								class="rounded-full px-2 py-0.5 text-[11px] font-semibold {pill.kind === 'urgent'
									? 'bg-red-100 text-red-700'
									: 'bg-[var(--muted)] text-[var(--muted-foreground)]'}">{pill.label}</span
							>
							<span class="text-sm font-semibold text-[var(--teal)] underline">View Job</span>
						</div>
					</a>
				{/each}
			</div>
			{#if totalPages > 1}
				<Pagination
					class="pt-6"
					count={filteredTotal}
					perPage={PER_PAGE}
					bind:page={pageBinding}
					aria-label="Pagination"
				>
					{#snippet children({ pages })}
						<PaginationContent>
							<PaginationPrevious />
							{#each pages as pageItem (pageItem.key)}
								{#if pageItem.type === 'ellipsis'}
									<PaginationItem>
										<PaginationEllipsis />
									</PaginationItem>
								{:else}
									<PaginationItem>
										<PaginationLink page={pageItem} isActive={pageItem.value === currentPage}>
											{pageItem.value}
										</PaginationLink>
									</PaginationItem>
								{/if}
							{/each}
							<PaginationNext />
						</PaginationContent>
					{/snippet}
				</Pagination>
			{/if}
		{/snippet}
	</KbTwoColumnLayout>

	<div class="flex flex-wrap items-center justify-between gap-6 px-10 py-8">
		<div>
			<h3>Post a job</h3>
			<p>Submit career opportunities for IFS staff review.</p>
		</div>
		<a
			href="/jobs/submit"
			class="inline-block flex-none rounded px-6 py-3 font-sans text-sm font-semibold text-white no-underline"
			>Post a job</a
		>
	</div>
</div>
