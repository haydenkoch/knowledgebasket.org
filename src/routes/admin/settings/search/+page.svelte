<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import AdminStatCard from '$lib/components/organisms/admin/AdminStatCard.svelte';
	import { Search, RefreshCw, CircleAlert } from '@lucide/svelte';
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();
	let query = $state('');

	$effect(() => {
		query = data.query ?? '';
	});

	const orderedCoils: CoilKey[] = ['events', 'funding', 'redpages', 'jobs', 'toolbox'];

	function runLookup() {
		const url = new URL($page.url);
		if (query.trim()) url.searchParams.set('q', query.trim());
		else url.searchParams.delete('q');
		goto(url, { keepFocus: true, noScroll: true });
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Search"
		title="Search operations"
		description="Rebuild search indexes, check coverage across each content area, and quickly look up content, organizations, venues, and sources from one place."
	>
		{#snippet actions()}
			<form
				method="POST"
				action="?/reindexAll"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Rebuilt all search indexes');
						else if (result.type === 'failure')
							toast.error((result.data as { error?: string })?.error ?? 'Rebuild failed');
						await update();
					};
				}}
			>
				<Button type="submit">
					<RefreshCw class="mr-2 h-4 w-4" />
					Rebuild everything
				</Button>
			</form>
		{/snippet}
		{#snippet meta()}
			<span>
				{data.snapshot.meilisearchAvailable
					? 'Search is connected across all indexed content'
					: data.snapshot.meilisearchConfigured
						? 'Search is configured but currently unavailable'
						: 'Search is not fully connected yet'}
			</span>
			<span>
				{data.snapshot.searchMode === 'all'
					? 'Cross-site content lookup is live'
					: 'Content lookup falls back to events only until search is connected'}
			</span>
		{/snippet}
	</AdminPageHeader>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		{#each orderedCoils as coil}
			<AdminStatCard
				label={coilLabels[coil]}
				value={data.snapshot.publishedCounts[coil]}
				description="Published items ready to index"
				tone={coil === 'events'
					? 'lake'
					: coil === 'funding'
						? 'gold'
						: coil === 'redpages'
							? 'forest'
							: coil === 'jobs'
								? 'ember'
								: 'stone'}
			/>
		{/each}
	</div>

	{#if !data.snapshot.meilisearchAvailable}
		<div
			class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_70%,white)] px-5 py-4 text-sm text-[var(--color-flicker-900)]"
		>
			<div class="flex items-start gap-3">
				<CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					{#if data.snapshot.meilisearchConfigured}
						Meilisearch is configured but not reachable right now. Public search will fall back to
						events only until the connection is healthy again.
					{:else}
						This connection is not set up yet. Public search will fall back to events only until
						Meilisearch is configured.
					{/if}
				</p>
			</div>
		</div>
	{/if}

	<AdminSectionCard
		title="Rebuild by content area"
		description="Use this after bulk edits, imports, or large cleanup work."
	>
		{#snippet children()}
			<div class="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
				{#each orderedCoils as coil}
					<Card.Root>
						<Card.Header>
							<Card.Title>{coilLabels[coil]}</Card.Title>
							<Card.Description>
								{data.snapshot.publishedCounts[coil]} published item{data.snapshot.publishedCounts[
									coil
								] === 1
									? ''
									: 's'}
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<form
								method="POST"
								action="?/reindexCoil"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success')
											toast.success(`Rebuilt ${coilLabels[coil]} search`);
										else if (result.type === 'failure')
											toast.error((result.data as { error?: string })?.error ?? 'Rebuild failed');
										await update();
									};
								}}
							>
								<input type="hidden" name="coil" value={coil} />
								<Button type="submit" variant="secondary" class="w-full">
									<RefreshCw class="mr-2 h-4 w-4" />
									Rebuild {coilLabels[coil]}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/snippet}
	</AdminSectionCard>

	<AdminSectionCard
		title="Universal lookup"
		description="Find published content, organizations, venues, and sources without bouncing between sections."
	>
		{#snippet children()}
			<div class="space-y-5 px-5 py-5">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						runLookup();
					}}
					class="flex flex-col gap-3 sm:flex-row"
				>
					<Input
						bind:value={query}
						placeholder="Search content, organizations, venues, and sources"
						class="w-full"
					/>
					<Button type="submit">
						<Search class="mr-2 h-4 w-4" />
						Search
					</Button>
				</form>

				{#if (data.query ?? '').length >= 2}
					<div class="grid gap-5 xl:grid-cols-2">
						<div class="space-y-4">
							{#each orderedCoils as coil}
								{#if data.snapshot.contentResults[coil]?.length}
									<div class="rounded-2xl border border-[color:var(--rule)] bg-white/70 p-4">
										<div class="mb-3 flex items-center justify-between gap-3">
											<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">
												{coilLabels[coil]}
											</h3>
											<span class="text-sm text-[var(--mid)]">
												{data.snapshot.contentResults[coil].length} result{data.snapshot
													.contentResults[coil].length === 1
													? ''
													: 's'}
											</span>
										</div>
										<div class="space-y-3">
											{#each data.snapshot.contentResults[coil] as item}
												<a
													href={coil === 'events'
														? `/events/${item.slug ?? item.id}`
														: coil === 'funding'
															? `/funding/${item.slug ?? item.id}`
															: coil === 'redpages'
																? `/red-pages/${item.slug ?? item.id}`
																: coil === 'jobs'
																	? `/jobs/${item.slug ?? item.id}`
																	: `/toolbox/${item.slug ?? item.id}`}
													class="block rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/80 px-4 py-3 no-underline hover:bg-[var(--color-alpine-snow-100)]/90 hover:no-underline"
												>
													<p class="font-medium text-[var(--dark)]">{item.title}</p>
													{#if item.description}
														<p class="mt-1 text-sm text-[var(--mid)]">{item.description}</p>
													{/if}
												</a>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
						</div>

						<div class="space-y-4">
							<div class="rounded-2xl border border-[color:var(--rule)] bg-white/70 p-4">
								<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">Organizations</h3>
								<div class="mt-3 space-y-3">
									{#each data.snapshot.entityResults.organizations as organization}
										<a
											href={`/admin/organizations/${organization.id}`}
											class="block rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/80 px-4 py-3 no-underline hover:bg-[var(--color-alpine-snow-100)]/90 hover:no-underline"
										>
											<p class="font-medium text-[var(--dark)]">{organization.name}</p>
											<p class="mt-1 text-sm text-[var(--mid)]">
												{organization.region ?? organization.website ?? 'No region or website yet'}
											</p>
										</a>
									{:else}
										<p class="text-sm text-[var(--mid)]">No organization matches yet.</p>
									{/each}
								</div>
							</div>

							<div class="rounded-2xl border border-[color:var(--rule)] bg-white/70 p-4">
								<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">Venues</h3>
								<div class="mt-3 space-y-3">
									{#each data.snapshot.entityResults.venues as venue}
										<a
											href={`/admin/venues/${venue.id}`}
											class="block rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/80 px-4 py-3 no-underline hover:bg-[var(--color-alpine-snow-100)]/90 hover:no-underline"
										>
											<p class="font-medium text-[var(--dark)]">{venue.name}</p>
											<p class="mt-1 text-sm text-[var(--mid)]">
												{[venue.city, venue.state].filter(Boolean).join(', ') ||
													venue.address ||
													'No location details yet'}
											</p>
										</a>
									{:else}
										<p class="text-sm text-[var(--mid)]">No venue matches yet.</p>
									{/each}
								</div>
							</div>

							<div class="rounded-2xl border border-[color:var(--rule)] bg-white/70 p-4">
								<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">Sources</h3>
								<div class="mt-3 space-y-3">
									{#each data.snapshot.entityResults.sources as source}
										<a
											href={`/admin/sources/${source.id}`}
											class="block rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/80 px-4 py-3 no-underline hover:bg-[var(--color-alpine-snow-100)]/90 hover:no-underline"
										>
											<p class="font-medium text-[var(--dark)]">{source.name}</p>
											<p class="mt-1 text-sm text-[var(--mid)]">
												{source.sourceUrl}
											</p>
										</a>
									{:else}
										<p class="text-sm text-[var(--mid)]">No source matches yet.</p>
									{/each}
								</div>
							</div>
						</div>
					</div>
				{:else}
					<p class="text-sm text-[var(--mid)]">
						Enter at least 2 characters to search across the admin workspace.
					</p>
				{/if}
			</div>
		{/snippet}
	</AdminSectionCard>

	{#if form?.success}
		<div
			class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-pinyon-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_70%,white)] px-5 py-4 text-sm text-[var(--color-pinyon-900)]"
		>
			{#if form.scope === 'all'}
				Rebuilt all search indexes.
			{:else}
				Rebuilt the {coilLabels[form.scope as CoilKey]} index.
			{/if}
		</div>
	{/if}
</div>
