<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data, form } = $props();

	function badgeClass(value: string) {
		const lookup: Record<string, string> = {
			healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
			degraded: 'border-amber-200 bg-amber-50 text-amber-700',
			stale: 'border-orange-200 bg-orange-50 text-orange-700',
			broken: 'border-rose-200 bg-rose-50 text-rose-700',
			auth_required: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
			unhealthy: 'border-rose-200 bg-rose-50 text-rose-700',
			unknown: 'border-slate-200 bg-slate-50 text-slate-600'
		};
		return lookup[value] ?? 'border-slate-200 bg-slate-50 text-slate-600';
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div>
			<h1 class="text-2xl font-bold">Source Health</h1>
			<p class="text-sm text-muted-foreground">
				Monitor registry health, scheduled ingestion, and recent fetch behavior.
			</p>
		</div>
		<form
			method="POST"
			action="?/runDueNow"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') toast.success('Due sources run completed');
					else if (result.type === 'failure')
						toast.error((result.data as { error?: string })?.error ?? 'Run failed');
					await update();
				};
			}}
		>
			<Button type="submit">Run due now</Button>
		</form>
	</div>

	{#if form?.runResult}
		<div class="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
			<div class="font-medium">Latest operator-triggered run</div>
			<div class="mt-1">
				Processed {form.runResult.totalProcessed} of {form.runResult.totalSelected} sources · Candidates
				{form.runResult.totalCandidatesCreated}
				· Auto-approved {form.runResult.totalAutoApproved}
			</div>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Total sources</Card.Title>
			</Card.Header>
			<Card.Content><div class="text-3xl font-semibold">{data.summary.total}</div></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Enabled</Card.Title>
			</Card.Header>
			<Card.Content><div class="text-3xl font-semibold">{data.summary.enabled}</div></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Due now</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-semibold">{data.dueNowCount}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Fetch attempts</Card.Title>
			</Card.Header>
			<Card.Content
				><div class="text-3xl font-semibold">{data.fetchSummary.totalAttempts}</div></Card.Content
			>
		</Card.Root>
	</div>

	{#if data.latestSchedulerRun}
		<Card.Root>
			<Card.Header>
				<Card.Title>Latest scheduler run</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="text-sm text-muted-foreground">
					Run {data.latestSchedulerRun.triggerRunId} · {data.latestSchedulerRun.startedAt?.toLocaleString?.() ??
						data.latestSchedulerRun.startedAt}
				</div>
				<div class="grid gap-3 md:grid-cols-3">
					<div class="rounded-md border p-3 text-sm">
						<div class="font-medium">{data.latestSchedulerRun.totalSources}</div>
						<div class="text-muted-foreground">Sources processed</div>
					</div>
					<div class="rounded-md border p-3 text-sm">
						<div class="font-medium">{data.latestSchedulerRun.totalNew}</div>
						<div class="text-muted-foreground">New candidates</div>
					</div>
					<div class="rounded-md border p-3 text-sm">
						<div class="font-medium">{data.latestSchedulerRun.totalUpdated}</div>
						<div class="text-muted-foreground">Updates queued</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Health distribution</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(data.summary.healthCounts) as [status, count]}
					<span class={`inline-flex rounded-full border px-3 py-1 text-sm ${badgeClass(status)}`}>
						{status.replace(/_/g, ' ')}: {count}
					</span>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 xl:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Adapter performance</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[520px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Adapter</Table.Head>
								<Table.Head>Sources</Table.Head>
								<Table.Head>Successes</Table.Head>
								<Table.Head>Failures</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.adapterStats as row}
								<Table.Row>
									<Table.Cell>{row.adapterType}</Table.Cell>
									<Table.Cell>{row.totalSources}</Table.Cell>
									<Table.Cell>{row.successes}</Table.Cell>
									<Table.Cell>{row.failures}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={4} class="h-20 text-center text-muted-foreground"
										>No adapter stats yet</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Low-yield sources</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[520px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Source</Table.Head>
								<Table.Head>Yield</Table.Head>
								<Table.Head>Fetched</Table.Head>
								<Table.Head>New</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.lowYield as row}
								<Table.Row>
									<Table.Cell
										><a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline"
											>{row.sourceName}</a
										></Table.Cell
									>
									<Table.Cell>{row.yieldRatio}</Table.Cell>
									<Table.Cell>{row.totalFetched}</Table.Cell>
									<Table.Cell>{row.totalNew}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={4} class="h-20 text-center text-muted-foreground"
										>No batch quality data yet</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Duplicate-heavy sources</Card.Title>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root class="min-w-[640px]">
					<Table.Header>
						<Table.Row>
							<Table.Head>Source</Table.Head>
							<Table.Head>Duplicate ratio</Table.Head>
							<Table.Head>Duplicates</Table.Head>
							<Table.Head>Normalized</Table.Head>
							<Table.Head>Retry</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.duplicateHeavy as row}
							<Table.Row>
								<Table.Cell
									><a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline"
										>{row.sourceName}</a
									></Table.Cell
								>
								<Table.Cell>{row.duplicateRatio}</Table.Cell>
								<Table.Cell>{row.totalDuplicate}</Table.Cell>
								<Table.Cell>{row.totalNormalized}</Table.Cell>
								<Table.Cell>
									<form
										method="POST"
										action="?/retrySource"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') toast.success('Source retried');
												else if (result.type === 'failure')
													toast.error((result.data as { error?: string })?.error ?? 'Retry failed');
												await update();
											};
										}}
									>
										<input type="hidden" name="sourceId" value={row.sourceId} />
										<Button type="submit" variant="outline">Retry</Button>
									</form>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-20 text-center text-muted-foreground"
									>No duplicate-heavy sources yet</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 xl:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Stale sources</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[520px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Name</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Next check</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.stale as source}
								<Table.Row>
									<Table.Cell
										><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline"
											>{source.name}</a
										></Table.Cell
									>
									<Table.Cell>{source.status}</Table.Cell>
									<Table.Cell
										>{source.nextCheckAt ? source.nextCheckAt.toLocaleString() : '—'}</Table.Cell
									>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground"
										>No stale sources</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Broken sources</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[520px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Name</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Failures</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.broken as source}
								<Table.Row>
									<Table.Cell
										><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline"
											>{source.name}</a
										></Table.Cell
									>
									<Table.Cell>{source.status}</Table.Cell>
									<Table.Cell>{source.consecutiveFailureCount}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground"
										>No broken sources</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Auth required</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[520px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Name</Table.Head>
								<Table.Head>Method</Table.Head>
								<Table.Head>Owner</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.authRequired as source}
								<Table.Row>
									<Table.Cell
										><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline"
											>{source.name}</a
										></Table.Cell
									>
									<Table.Cell>{source.ingestionMethod}</Table.Cell>
									<Table.Cell>{source.ownerName ?? source.ownerEmail ?? '—'}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground"
										>No auth-blocked sources</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Degraded sources</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[520px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Name</Table.Head>
								<Table.Head>Health</Table.Head>
								<Table.Head>Checked</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.degraded as source}
								<Table.Row>
									<Table.Cell
										><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline"
											>{source.name}</a
										></Table.Cell
									>
									<Table.Cell>{source.healthStatus}</Table.Cell>
									<Table.Cell
										>{source.lastCheckedAt
											? source.lastCheckedAt.toLocaleString()
											: 'Never'}</Table.Cell
									>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground"
										>No degraded sources</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recent failure log</Card.Title>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root class="min-w-[860px]">
					<Table.Header>
						<Table.Row>
							<Table.Head>Source</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Error</Table.Head>
							<Table.Head>Attempted</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.recentFailures as failure}
							<Table.Row>
								<Table.Cell>
									<a
										href={`/admin/sources/${failure.log.sourceId}`}
										class="font-medium hover:underline"
									>
										{failure.sourceName}
									</a>
								</Table.Cell>
								<Table.Cell>{failure.log.status}</Table.Cell>
								<Table.Cell class="max-w-[320px] truncate"
									>{failure.log.errorMessage ?? failure.log.errorCategory ?? '—'}</Table.Cell
								>
								<Table.Cell>{failure.log.attemptedAt.toLocaleString()}</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={4} class="h-20 text-center text-muted-foreground"
									>No recent failures</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
