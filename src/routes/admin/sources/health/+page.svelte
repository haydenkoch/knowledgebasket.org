<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	let { data } = $props();

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
	<div>
		<h1 class="text-2xl font-bold">Source Health</h1>
		<p class="text-sm text-muted-foreground">
			Monitor registry health and recent fetch behavior.
		</p>
	</div>

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
				<Card.Title class="text-base">Fetch attempts</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-semibold">{data.fetchSummary.totalAttempts}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Recent failures</Card.Title>
			</Card.Header>
			<Card.Content><div class="text-3xl font-semibold">{data.fetchSummary.failures}</div></Card.Content>
		</Card.Root>
	</div>

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
									<Table.Cell><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a></Table.Cell>
									<Table.Cell>{source.status}</Table.Cell>
									<Table.Cell>{source.nextCheckAt ? source.nextCheckAt.toLocaleString() : '—'}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground">No stale sources</Table.Cell>
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
									<Table.Cell><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a></Table.Cell>
									<Table.Cell>{source.status}</Table.Cell>
									<Table.Cell>{source.consecutiveFailureCount}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground">No broken sources</Table.Cell>
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
									<Table.Cell><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a></Table.Cell>
									<Table.Cell>{source.ingestionMethod}</Table.Cell>
									<Table.Cell>{source.ownerName ?? source.ownerEmail ?? '—'}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground">No auth-blocked sources</Table.Cell>
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
									<Table.Cell><a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a></Table.Cell>
									<Table.Cell>{source.healthStatus}</Table.Cell>
									<Table.Cell>{source.lastCheckedAt ? source.lastCheckedAt.toLocaleString() : 'Never'}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground">No degraded sources</Table.Cell>
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
									<a href={`/admin/sources/${failure.log.sourceId}`} class="font-medium hover:underline">
										{failure.sourceName}
									</a>
								</Table.Cell>
								<Table.Cell>{failure.log.status}</Table.Cell>
								<Table.Cell class="max-w-[320px] truncate">{failure.log.errorMessage ?? failure.log.errorCategory ?? '—'}</Table.Cell>
								<Table.Cell>{failure.log.attemptedAt.toLocaleString()}</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={4} class="h-20 text-center text-muted-foreground">No recent failures</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
