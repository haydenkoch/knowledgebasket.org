<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/KbFilterSection.svelte';
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

	const typeCounts = $derived(facetCounts(jobs, 'type'));
	const sectorCounts = $derived(facetCounts(jobs, 'sector'));
	const levelCounts = $derived(facetCounts(jobs, 'level'));
	const workArrangementCounts = $derived(facetCounts(jobs, 'workArrangement'));
	const typeValues = $derived(Object.keys(typeCounts).sort());
	const sectorValues = $derived(Object.keys(sectorCounts).sort());
	const levelValues = $derived(Object.keys(levelCounts).sort());
	const workArrangementValues = $derived(Object.keys(workArrangementCounts).sort());

	const filtered = $derived(
		filterByFacets(
			jobs.filter((e) => matchSearch(e, searchQuery, ['employer', 'location', 'type', 'sector'])),
			{
				type: typeFilter,
				sector: sectorFilter,
				level: levelFilter,
				workArrangement: workArrangementFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);

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
		if (lower.includes('rolling') || lower.includes('open until')) return { label: 'Open until filled', kind: 'rolling' };
		const short = deadline.slice(0, 50);
		const inDays = (d: Date) => Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
		const parsed = new Date(deadline);
		if (isNaN(parsed.getTime())) return { label: short, kind: 'ok' };
		const days = inDays(parsed);
		const label = days <= 7 ? `Closes ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : short;
		return { label, kind: days <= 7 ? 'urgent' : 'ok' };
	}
	</script>

<div class="kb-coil kb-coil--jobs">
	<KbHero
		heroClass="kb-hero--jobs"
		eyebrow="Knowledge Basket · Coil 4"
		title="Job Board"
		description="Career opportunities with Tribes, agencies, and organizations prioritizing Indigenous hiring."
	>
		<svelte:fragment slot="weave">
			<defs>
				<pattern id="wv-jobs" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
					<rect x="0" y="0" width="10" height="4" fill="white" />
					<rect x="10" y="10" width="10" height="4" fill="white" />
					<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
				</pattern>
			</defs>
			<rect width="200" height="400" fill="url(#wv-jobs)" />
		</svelte:fragment>
		<svelte:fragment slot="stats">
			<div class="kb-hstat"><strong>{total}</strong><span>Open positions</span></div>
		</svelte:fragment>
	</KbHero>

	<KbTwoColumnLayout>
		<svelte:fragment slot="sidebar">
			<div class="kb-search-wrap">
				<span class="kb-search-icon" aria-hidden="true">🔍</span>
				<Input
					type="search"
					placeholder="Search jobs…"
					class="kb-search-input"
					bind:value={searchQuery}
				/>
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
				options={workArrangementValues.map((w) => ({ value: w, label: w, count: workArrangementCounts[w] ?? 0 }))}
				selected={workArrangementFilter}
				onToggle={(val) => (workArrangementFilter = toggle(workArrangementFilter, val))}
				emptyLabel="None"
			/>
			<button type="button" class="kb-clr" onclick={clearFilters}>Clear all filters</button>
		</svelte:fragment>

		<div class="kb-toolbar">
				<div class="kb-rcount">Showing <strong>{filteredTotal}</strong> jobs</div>
				<select class="kb-ssort" aria-label="Sort">
					<option>Recently posted</option>
					<option>Deadline</option>
				</select>
			</div>
			<div class="kb-jlist">
				{#each filtered as job (job.id)}
					{@const pill = deadlinePill(job.applicationDeadline)}
					<a href="/jobs/{job.id}" class="kb-jitem">
						<div class="kb-jlogo">{initials(job.employer ?? job.title)}</div>
						<div class="kb-jmain">
							{#if job.indigenousPriority}
								<span class="kb-jpflag">★ Indigenous Hires Prioritized</span>
							{/if}
							<div class="kb-jtit">{job.title}</div>
							{#if job.employer}<div class="kb-jorg">{job.employer}</div>{/if}
							<div class="kb-jmeta kb-ctags" style="margin: 0; gap: 6px;">
								{#if job.sector}<span class="kb-tag kb-tag-ts">{job.sector}</span>{/if}
								{#if job.type}<span class="kb-tag kb-tag-tp">{job.type}</span>{/if}
							</div>
							{#if job.location || job.level}
								<div class="kb-jmeta">
									{#if job.location}<span>{job.location}</span>{/if}
									{#if job.level}<span>{job.level}</span>{/if}
								</div>
							{/if}
						</div>
						<div class="kb-jright">
							<span class="kb-dpill {pill.kind}">{pill.label}</span>
							<span class="kb-japply">View Job</span>
						</div>
					</a>
				{/each}
			</div>
			{#if filteredTotal > 6}
				<nav class="kb-pagi" aria-label="Pagination">
					<button type="button" class="kb-pbtn active">1</button>
					<button type="button" class="kb-pbtn">2</button>
				</nav>
			{/if}
	</KbTwoColumnLayout>

	<div class="kb-subbanner kb-subbanner--jobs">
		<div>
			<h3>Post a job</h3>
			<p>Submit career opportunities for IFS staff review.</p>
		</div>
		<a href="/jobs/submit" class="kb-subbtn kb-subbtn--jobs">Post a job</a>
	</div>
</div>
