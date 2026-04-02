<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data } = $props();
	let searchValue = $state('');

	$effect(() => {
		searchValue = data.currentSearch ?? '';
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
			const title = (candidate.normalizedData as Record<string, unknown>).title;
			const name = (candidate.normalizedData as Record<string, unknown>).name;
			if (typeof title === 'string' && title.trim()) return title;
			if (typeof name === 'string' && name.trim()) return name;
		}
		return candidate.sourceItemId ?? candidate.id;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Import Queue</h1>
		<p class="text-sm text-muted-foreground">
			Review imported candidates before they move deeper into the source registry workflow.
		</p>
	</div>

	<Card.Root>
		<Card.Content class="space-y-4 p-4">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						doSearch();
					}}
					class="flex w-full max-w-md gap-2"
				>
					<Input bind:value={searchValue} placeholder="Search source or source URL..." />
					<Button type="submit" variant="secondary">Search</Button>
				</form>
				<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
					<NativeSelect.Root
						value={data.currentStatus}
						onchange={(event) => applyFilter('status', (event.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="open">Open queue</NativeSelect.Option>
						<NativeSelect.Option value="all">All statuses</NativeSelect.Option>
						<NativeSelect.Option value="pending_review">Pending review</NativeSelect.Option>
						<NativeSelect.Option value="needs_info">Needs info</NativeSelect.Option>
						<NativeSelect.Option value="approved">Approved</NativeSelect.Option>
						<NativeSelect.Option value="rejected">Rejected</NativeSelect.Option>
						<NativeSelect.Option value="archived">Archived</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentCoil}
						onchange={(event) => applyFilter('coil', (event.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All coils</NativeSelect.Option>
						<NativeSelect.Option value="events">Events</NativeSelect.Option>
						<NativeSelect.Option value="funding">Funding</NativeSelect.Option>
						<NativeSelect.Option value="jobs">Jobs</NativeSelect.Option>
						<NativeSelect.Option value="red_pages">Red Pages</NativeSelect.Option>
						<NativeSelect.Option value="toolbox">Toolbox</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentPriority}
						onchange={(event) => applyFilter('priority', (event.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All priorities</NativeSelect.Option>
						<NativeSelect.Option value="high">High</NativeSelect.Option>
						<NativeSelect.Option value="normal">Normal</NativeSelect.Option>
						<NativeSelect.Option value="low">Low</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentDedupeResult}
						onchange={(event) =>
							applyFilter('dedupeResult', (event.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All dedupe results</NativeSelect.Option>
						<NativeSelect.Option value="new">New</NativeSelect.Option>
						<NativeSelect.Option value="duplicate">Duplicate</NativeSelect.Option>
						<NativeSelect.Option value="update">Update</NativeSelect.Option>
						<NativeSelect.Option value="ambiguous">Ambiguous</NativeSelect.Option>
					</NativeSelect.Root>
					<NativeSelect.Root
						value={data.currentSourceId}
						onchange={(event) => applyFilter('sourceId', (event.target as HTMLSelectElement).value)}
					>
						<NativeSelect.Option value="all">All sources</NativeSelect.Option>
						{#each data.sourceOptions as source}
							<NativeSelect.Option value={source.id}>{source.name}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>
			</div>

			<div class="space-y-4">
				{#each data.candidates as candidate}
					<Card.Root class="border">
						<Card.Content class="space-y-4 p-4">
							<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
								<div class="space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<h2 class="text-lg font-semibold">{candidateTitle(candidate)}</h2>
										<span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
											{candidate.coil}
										</span>
										<span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
											{candidate.priority}
										</span>
										<span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
											{candidate.dedupeResult}
										</span>
									</div>
									<div class="text-sm text-muted-foreground">
										From <a href={`/admin/sources/${candidate.sourceId}`} class="hover:underline">{candidate.sourceName}</a>
										· Imported {candidate.importedAt.toLocaleString()}
									</div>
									{#if candidate.sourceItemUrl}
										<a
											href={candidate.sourceItemUrl}
											target="_blank"
											rel="noreferrer"
											class="text-sm text-primary underline underline-offset-2"
										>
											Open source item
										</a>
									{/if}
								</div>
								<div class="text-sm text-muted-foreground">
									{#if candidate.matchedCanonicalTitle}
										Matched canonical: {candidate.matchedCanonicalTitle}
									{:else}
										No canonical match yet
									{/if}
								</div>
							</div>

							<div class="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
								<div class="space-y-2">
									<div class="text-sm font-medium">Normalized data</div>
									<pre class="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(candidate.normalizedData, null, 2)}</pre>
								</div>
								<div class="space-y-2">
									<div class="text-sm font-medium">Raw data</div>
									<pre class="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(candidate.rawData, null, 2)}</pre>
								</div>
							</div>

							<div class="grid gap-3 xl:grid-cols-4">
								<form
									method="POST"
									action="?/approve"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') toast.success('Candidate approved');
											await update();
										};
									}}
									class="space-y-2 rounded-md border p-3"
								>
									<input type="hidden" name="id" value={candidate.id} />
									<Textarea name="reviewNotes" rows={2} placeholder="Approval notes" />
									<Button type="submit" class="w-full">Approve</Button>
								</form>
								<form
									method="POST"
									action="?/needsInfo"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') toast.success('Candidate marked needs info');
											await update();
										};
									}}
									class="space-y-2 rounded-md border p-3"
								>
									<input type="hidden" name="id" value={candidate.id} />
									<Textarea name="reviewNotes" rows={2} placeholder="What info is missing?" />
									<Button type="submit" variant="outline" class="w-full">Needs info</Button>
								</form>
								<form
									method="POST"
									action="?/reject"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') toast.success('Candidate rejected');
											await update();
										};
									}}
									class="space-y-2 rounded-md border p-3"
								>
									<input type="hidden" name="id" value={candidate.id} />
									<NativeSelect.Root name="rejectionReason">
										<NativeSelect.Option value="duplicate">Duplicate</NativeSelect.Option>
										<NativeSelect.Option value="irrelevant">Irrelevant</NativeSelect.Option>
										<NativeSelect.Option value="expired">Expired</NativeSelect.Option>
										<NativeSelect.Option value="low_quality">Low quality</NativeSelect.Option>
										<NativeSelect.Option value="inaccurate">Inaccurate</NativeSelect.Option>
										<NativeSelect.Option value="incomplete">Incomplete</NativeSelect.Option>
										<NativeSelect.Option value="out_of_scope">Out of scope</NativeSelect.Option>
										<NativeSelect.Option value="spam">Spam</NativeSelect.Option>
										<NativeSelect.Option value="other">Other</NativeSelect.Option>
									</NativeSelect.Root>
									<Textarea name="reviewNotes" rows={2} placeholder="Rejection notes" />
									<Button type="submit" variant="destructive" class="w-full">Reject</Button>
								</form>
								<form
									method="POST"
									action="?/archive"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') toast.success('Candidate archived');
											await update();
										};
									}}
									class="space-y-2 rounded-md border p-3"
								>
									<input type="hidden" name="id" value={candidate.id} />
									<Textarea name="reviewNotes" rows={2} placeholder="Archive notes" />
									<Button type="submit" variant="outline" class="w-full">Archive</Button>
								</form>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Content class="py-10 text-center text-muted-foreground">
							No candidates match the current filters.
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<div class="flex items-center justify-between text-sm text-muted-foreground">
				<span>{data.total} total candidates</span>
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
		</Card.Content>
	</Card.Root>
</div>
