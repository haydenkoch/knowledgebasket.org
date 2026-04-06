<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import AdminStatCard from '$lib/components/organisms/admin/AdminStatCard.svelte';
	import { RefreshCw, CircleAlert, Search } from '@lucide/svelte';
	import { coilLabels } from '$lib/data/kb';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const publicScopes = ['events', 'funding', 'redpages', 'jobs', 'toolbox'] as const;
	const adminScopes = ['organizations', 'venues', 'sources'] as const;

	function scopeLabel(scope: (typeof publicScopes)[number] | (typeof adminScopes)[number]) {
		if (scope in coilLabels) return coilLabels[scope as keyof typeof coilLabels];
		if (scope === 'organizations') return 'Organizations';
		if (scope === 'venues') return 'Venues';
		return 'Sources';
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Search"
		title="Search operations"
		description="Monitor readiness, rebuild indexes, and verify search health. Admin lookup now lives in the global quick-find command surface."
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
				{data.snapshot.searchReadiness.state === 'ready'
					? 'Search is connected across all indexed content'
					: data.snapshot.searchReadiness.state === 'partial'
						? 'Search is reachable but only partially indexed'
						: data.snapshot.meilisearchConfigured
							? 'Search is configured but currently unavailable'
							: 'Search is not fully connected yet'}
			</span>
			<span>Use `Quick find` in the admin header for staff lookup and jump-to-item.</span>
		{/snippet}
	</AdminPageHeader>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		{#each [...publicScopes, ...adminScopes] as coil}
			<AdminStatCard
				label={scopeLabel(coil)}
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
								: coil === 'toolbox'
									? 'stone'
									: 'lake'}
			/>
		{/each}
	</div>

	{#if data.snapshot.searchReadiness.state !== 'ready'}
		<div
			class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_70%,white)] px-5 py-4 text-sm text-[var(--color-flicker-900)]"
		>
			<div class="flex items-start gap-3">
				<CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					{#if data.snapshot.searchReadiness.state === 'partial'}
						Meilisearch is reachable, but some required indexes are still missing. Public search is
						currently falling back to database results until {data.snapshot.searchReadiness
							.missingScopes.length} missing index{data.snapshot.searchReadiness.missingScopes
							.length === 1
							? ''
							: 'es'} are restored.
					{:else if data.snapshot.meilisearchConfigured}
						Meilisearch is configured but not reachable right now. Public search is running in
						database compatibility mode until the connection is healthy again.
					{:else}
						This connection is not set up yet. Public search will stay in database compatibility
						mode until Meilisearch is configured.
					{/if}
				</p>
			</div>
		</div>
	{/if}

	<AdminSectionCard
		title="Rebuild by search scope"
		description="Use this after bulk edits, imports, or larger cleanup work."
	>
		{#snippet children()}
			<div class="space-y-6 px-5 py-5">
				<div class="space-y-3">
					<div class="text-xs font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">
						Public content
					</div>
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each publicScopes as coil}
							<Card.Root>
								<Card.Header>
									<Card.Title>{scopeLabel(coil)}</Card.Title>
									<Card.Description>
										{data.snapshot.publishedCounts[coil]} published item{data.snapshot
											.publishedCounts[coil] === 1
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
													toast.success(`Rebuilt ${scopeLabel(coil)} search`);
												else if (result.type === 'failure')
													toast.error(
														(result.data as { error?: string })?.error ?? 'Rebuild failed'
													);
												await update();
											};
										}}
									>
										<input type="hidden" name="coil" value={coil} />
										<Button type="submit" variant="secondary" class="w-full">
											<RefreshCw class="mr-2 h-4 w-4" />
											Rebuild {scopeLabel(coil)}
										</Button>
									</form>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>

				<div class="space-y-3">
					<div class="text-xs font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">
						Admin entities
					</div>
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each adminScopes as coil}
							<Card.Root>
								<Card.Header>
									<Card.Title>{scopeLabel(coil)}</Card.Title>
									<Card.Description>
										{data.snapshot.publishedCounts[coil]} indexed record{data.snapshot
											.publishedCounts[coil] === 1
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
													toast.success(`Rebuilt ${scopeLabel(coil)} search`);
												else if (result.type === 'failure')
													toast.error(
														(result.data as { error?: string })?.error ?? 'Rebuild failed'
													);
												await update();
											};
										}}
									>
										<input type="hidden" name="coil" value={coil} />
										<Button type="submit" variant="secondary" class="w-full">
											<RefreshCw class="mr-2 h-4 w-4" />
											Rebuild {scopeLabel(coil)}
										</Button>
									</form>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>
			</div>
		{/snippet}
	</AdminSectionCard>

	<AdminSectionCard
		title="Admin lookup"
		description="Quick staff lookup now lives in the command palette so it is available from every admin route."
	>
		{#snippet children()}
			<div class="flex flex-wrap items-center gap-3 px-5 py-5 text-sm text-[var(--mid)]">
				<div
					class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/55 px-4 py-3"
				>
					<Search class="mb-2 h-4 w-4 text-[var(--color-lakebed-900)]" />
					<p>Open `Quick find` from the admin header or use `Cmd/Ctrl + K`.</p>
				</div>
			</div>
		{/snippet}
	</AdminSectionCard>
</div>
