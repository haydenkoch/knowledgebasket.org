<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import AdminStatCard from '$lib/components/organisms/admin/AdminStatCard.svelte';
	import HealthBadge from '$lib/components/organisms/admin/HealthBadge.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { friendly, pct, timeAgo, ingestionLabel, healthLabel, sourceStatusLabel, curationReasonLabel } from '$lib/admin/labels.js';

	let { data, form } = $props();

	function friendlyCurationReasons(reasons: string[]): string {
		return reasons
			.map((r) => curationReasonLabel[r] ?? r.replace(/_/g, ' '))
			.join(', ');
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Sources"
		title="Health monitor"
		description="Track ingestion health, recent activity, and sources that need attention."
	>
		{#snippet actions()}
			<form
				method="POST"
				action="?/runDueNow"
				use:enhance={() => async ({ result, update }) => {
					if (result.type === 'success') toast.success('Run completed');
					else if (result.type === 'failure')
						toast.error((result.data as { error?: string })?.error ?? 'Run failed');
					await update();
				}}
			>
				<Button type="submit" variant="secondary">Run scheduled sources now</Button>
			</form>
		{/snippet}
		{#snippet meta()}
			<span>{data.summary.total} total sources</span>
			<span>{data.summary.enabled} enabled</span>
		{/snippet}
	</AdminPageHeader>

	{#if form?.runResult}
		<div class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-lakebed-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_70%,white)] px-5 py-4 text-sm">
			<p class="font-semibold text-[var(--color-lakebed-900)]">Run complete</p>
			<p class="mt-1 text-[var(--color-lakebed-800)]">
				Checked {form.runResult.totalProcessed} of {form.runResult.totalSelected} sources ·
				{form.runResult.totalCandidatesCreated} new items found ·
				{form.runResult.totalAutoApproved} auto-approved
			</p>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<AdminStatCard label="Total sources" value={data.summary.total} href="/admin/sources" tone="lake" />
		<AdminStatCard label="Currently enabled" value={data.summary.enabled} href="/admin/sources?enabled=true" tone="forest" />
		<AdminStatCard label="Due for a check" value={data.dueNowCount} tone="gold" />
		<AdminStatCard
			label="Fetch attempts"
			value={data.fetchSummary.totalAttempts}
			description="All-time"
			tone="stone"
		/>
	</div>

	<Tabs.Root value="overview">
		<Tabs.List class="w-full justify-start overflow-auto">
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			<Tabs.Trigger value="performance">Performance</Tabs.Trigger>
			<Tabs.Trigger value="issues">Issues</Tabs.Trigger>
			<Tabs.Trigger value="errors">Error log</Tabs.Trigger>
		</Tabs.List>

		<!-- Overview tab -->
		<Tabs.Content value="overview" class="mt-6 space-y-6">
			{#if data.latestSchedulerRun}
				{@const run = data.latestSchedulerRun}
				<AdminSectionCard title="Last automated check">
					{#snippet children()}
						<div class="grid gap-4 px-5 py-5 md:grid-cols-3">
							<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4 text-center">
								<div class="font-display text-2xl font-bold text-[var(--dark)]">{run.totalSources}</div>
								<div class="mt-1 text-sm text-[var(--mid)]">Sources checked</div>
							</div>
							<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4 text-center">
								<div class="font-display text-2xl font-bold text-[var(--dark)]">{run.totalNew}</div>
								<div class="mt-1 text-sm text-[var(--mid)]">New items found</div>
							</div>
							<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4 text-center">
								<div class="font-display text-2xl font-bold text-[var(--dark)]">{run.totalUpdated}</div>
								<div class="mt-1 text-sm text-[var(--mid)]">Updates queued</div>
							</div>
						</div>
						<div class="border-t border-[color:var(--rule)] px-5 py-3">
							<p class="text-xs text-[var(--mid)]">
								Last run: {run.startedAt ? timeAgo(run.startedAt) : 'Unknown'}
							</p>
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			<!-- Health distribution -->
			<AdminSectionCard title="Health at a glance" description="Current status across all sources.">
				{#snippet children()}
					<div class="flex flex-wrap gap-3 px-5 py-5">
						{#each Object.entries(data.summary.healthCounts) as [status, count]}
							<div class="flex items-center gap-2 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 px-4 py-2.5">
								<HealthBadge health={status} />
								<span class="font-display text-lg font-bold text-[var(--dark)]">{count}</span>
							</div>
						{/each}
					</div>
				{/snippet}
			</AdminSectionCard>

			<!-- What needs attention now -->
			{#if data.broken.length > 0 || data.authRequired.length > 0 || data.stale.length > 0 || data.degraded.length > 0}
				<AdminSectionCard title="Needs attention" description="Sources with active issues that may be blocking fresh content.">
					{#snippet children()}
						<div class="divide-y divide-[color:var(--rule)]">
							{#each data.broken as source}
								<div class="flex items-center justify-between gap-4 px-5 py-3">
									<div class="min-w-0">
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">{source.consecutiveFailureCount} consecutive failures</p>
									</div>
									<HealthBadge health="broken" />
								</div>
							{/each}
							{#each data.authRequired as source}
								<div class="flex items-center justify-between gap-4 px-5 py-3">
									<div class="min-w-0">
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">
											{friendly(ingestionLabel, source.ingestionMethod)} · {source.ownerName ?? source.ownerEmail ?? 'No owner'}
										</p>
									</div>
									<HealthBadge health="auth_required" />
								</div>
							{/each}
							{#each data.stale as source}
								<div class="flex items-center justify-between gap-4 px-5 py-3">
									<div class="min-w-0">
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">
											Next check: {source.nextCheckAt ? timeAgo(source.nextCheckAt) : 'Not scheduled'}
										</p>
									</div>
									<HealthBadge health="stale" />
								</div>
							{/each}
							{#each data.degraded as source}
								<div class="flex items-center justify-between gap-4 px-5 py-3">
									<div class="min-w-0">
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">Last checked: {timeAgo(source.lastCheckedAt)}</p>
									</div>
									<HealthBadge health="degraded" />
								</div>
							{/each}
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			<!-- Recent runs table -->
			{#if data.recentSchedulerRuns.length > 0}
				<AdminSectionCard title="Recent automated runs">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>When</Table.Head>
										<Table.Head>Sources checked</Table.Head>
										<Table.Head>New items</Table.Head>
										<Table.Head>Updates</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.recentSchedulerRuns as run}
										<Table.Row>
											<Table.Cell class="text-[var(--mid)]">{run.startedAt ? timeAgo(run.startedAt) : '—'}</Table.Cell>
											<Table.Cell>{run.totalSources}</Table.Cell>
											<Table.Cell>{run.totalNew}</Table.Cell>
											<Table.Cell>{run.totalUpdated}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}
		</Tabs.Content>

		<!-- Performance tab -->
		<Tabs.Content value="performance" class="mt-6 space-y-6">
			<div class="grid gap-6 xl:grid-cols-2">
				<AdminSectionCard title="Import method performance" description="How each import method is performing across all sources.">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Import method</Table.Head>
										<Table.Head>Sources</Table.Head>
										<Table.Head>Successes</Table.Head>
										<Table.Head>Failures</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.adapterStats as row}
										<Table.Row>
											<Table.Cell>{friendly(ingestionLabel, row.adapterType)}</Table.Cell>
											<Table.Cell>{row.totalSources}</Table.Cell>
											<Table.Cell>{row.successes}</Table.Cell>
											<Table.Cell>{row.failures}</Table.Cell>
										</Table.Row>
									{:else}
										<Table.Row>
											<Table.Cell colspan={4} class="h-20 text-center text-[var(--mid)]">No data yet</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>

				<AdminSectionCard title="Low-yield sources" description="Sources that rarely find new items.">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Source</Table.Head>
										<Table.Head>New item rate</Table.Head>
										<Table.Head>Checked</Table.Head>
										<Table.Head>Found new</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.lowYield as row}
										<Table.Row>
											<Table.Cell>
												<a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline">{row.sourceName}</a>
											</Table.Cell>
											<Table.Cell>{pct(row.yieldRatio)}</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.totalFetched}</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.totalNew}</Table.Cell>
										</Table.Row>
									{:else}
										<Table.Row>
											<Table.Cell colspan={4} class="h-20 text-center text-[var(--mid)]">No data yet</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>

				<AdminSectionCard title="Mostly updates" description="Sources where most imported items are updates rather than new.">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Source</Table.Head>
										<Table.Head>Update rate</Table.Head>
										<Table.Head>Updates</Table.Head>
										<Table.Head>Total imported</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.updateHeavy as row}
										<Table.Row>
											<Table.Cell>
												<a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline">{row.sourceName}</a>
											</Table.Cell>
											<Table.Cell>{pct(row.updateRatio)}</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.totalUpdated}</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.totalNormalized}</Table.Cell>
										</Table.Row>
									{:else}
										<Table.Row>
											<Table.Cell colspan={4} class="h-20 text-center text-[var(--mid)]">No data yet</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>

				<AdminSectionCard title="Approval rates" description="How often imported items get approved after review.">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Source</Table.Head>
										<Table.Head>Approval rate</Table.Head>
										<Table.Head>Reviewed</Table.Head>
										<Table.Head>Approved</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.approvalRates as row}
										<Table.Row>
											<Table.Cell>
												<a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline">{row.sourceName}</a>
											</Table.Cell>
											<Table.Cell>{pct(row.approvalRatio)}</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.totalReviewed}</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.totalApproved}</Table.Cell>
										</Table.Row>
									{:else}
										<Table.Row>
											<Table.Cell colspan={4} class="h-20 text-center text-[var(--mid)]">No data yet</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>
			</div>

			<AdminSectionCard title="Many duplicates" description="Sources that frequently import items already in the database.">
				{#snippet children()}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Source</Table.Head>
									<Table.Head>Duplicate rate</Table.Head>
									<Table.Head>Duplicates</Table.Head>
									<Table.Head>Total imported</Table.Head>
									<Table.Head></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.duplicateHeavy as row}
									<Table.Row>
										<Table.Cell>
											<a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline">{row.sourceName}</a>
										</Table.Cell>
										<Table.Cell>{pct(row.duplicateRatio)}</Table.Cell>
										<Table.Cell class="text-[var(--mid)]">{row.totalDuplicate}</Table.Cell>
										<Table.Cell class="text-[var(--mid)]">{row.totalNormalized}</Table.Cell>
										<Table.Cell>
											<form
												method="POST"
												action="?/retrySource"
												use:enhance={() => async ({ result, update }) => {
													if (result.type === 'success') toast.success('Source retried');
													else toast.error(result.type === 'failure' ? ((result.data as { error?: string })?.error ?? 'Retry failed') : 'Retry failed');
													await update();
												}}
											>
												<input type="hidden" name="sourceId" value={row.sourceId} />
												<Button type="submit" variant="outline" size="sm">Retry</Button>
											</form>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={5} class="h-20 text-center text-[var(--mid)]">No data yet</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/snippet}
			</AdminSectionCard>
		</Tabs.Content>

		<!-- Issues tab -->
		<Tabs.Content value="issues" class="mt-6 space-y-6">
			{#if data.needsCuration.length > 0}
				<AdminSectionCard title="Needs curation" description="Sources with flags that may require manual attention.">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Source</Table.Head>
										<Table.Head>Import method</Table.Head>
										<Table.Head>Health</Table.Head>
										<Table.Head>Issues found</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.needsCuration as row}
										<Table.Row>
											<Table.Cell>
												<a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline">{row.sourceName}</a>
											</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{friendly(ingestionLabel, row.adapterType)}</Table.Cell>
											<Table.Cell><HealthBadge health={row.healthStatus} /></Table.Cell>
											<Table.Cell class="text-sm text-[var(--mid)]">{friendlyCurationReasons(row.reasons)}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			<div class="grid gap-6 xl:grid-cols-2">
				<AdminSectionCard title="Broken sources" description="Failing to fetch — may need reconfiguration.">
					{#snippet children()}
						<div class="divide-y divide-[color:var(--rule)]">
							{#each data.broken as source}
								<div class="flex items-center justify-between gap-3 px-5 py-3">
									<div>
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">{source.consecutiveFailureCount} failures in a row</p>
									</div>
									<StatusBadge status={source.status} />
								</div>
							{:else}
								<div class="px-5 py-6 text-sm text-[var(--mid)]">No broken sources.</div>
							{/each}
						</div>
					{/snippet}
				</AdminSectionCard>

				<AdminSectionCard title="Authentication needed" description="Sources that require updated credentials.">
					{#snippet children()}
						<div class="divide-y divide-[color:var(--rule)]">
							{#each data.authRequired as source}
								<div class="flex items-center justify-between gap-3 px-5 py-3">
									<div>
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">
											{friendly(ingestionLabel, source.ingestionMethod)} ·
											{source.ownerName ?? source.ownerEmail ?? 'No owner assigned'}
										</p>
									</div>
									<HealthBadge health="auth_required" />
								</div>
							{:else}
								<div class="px-5 py-6 text-sm text-[var(--mid)]">No auth issues.</div>
							{/each}
						</div>
					{/snippet}
				</AdminSectionCard>

				<AdminSectionCard title="Stale sources" description="Overdue for their next scheduled check.">
					{#snippet children()}
						<div class="divide-y divide-[color:var(--rule)]">
							{#each data.stale as source}
								<div class="flex items-center justify-between gap-3 px-5 py-3">
									<div>
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">
											Next check: {source.nextCheckAt ? timeAgo(source.nextCheckAt) : 'Not scheduled'}
										</p>
									</div>
									<StatusBadge status={source.status} />
								</div>
							{:else}
								<div class="px-5 py-6 text-sm text-[var(--mid)]">No stale sources.</div>
							{/each}
						</div>
					{/snippet}
				</AdminSectionCard>

				<AdminSectionCard title="Degraded sources" description="Partially working but showing signs of trouble.">
					{#snippet children()}
						<div class="divide-y divide-[color:var(--rule)]">
							{#each data.degraded as source}
								<div class="flex items-center justify-between gap-3 px-5 py-3">
									<div>
										<a href={`/admin/sources/${source.id}`} class="font-medium hover:underline">{source.name}</a>
										<p class="text-xs text-[var(--mid)]">Last checked: {timeAgo(source.lastCheckedAt)}</p>
									</div>
									<HealthBadge health="degraded" />
								</div>
							{:else}
								<div class="px-5 py-6 text-sm text-[var(--mid)]">No degraded sources.</div>
							{/each}
						</div>
					{/snippet}
				</AdminSectionCard>
			</div>
		</Tabs.Content>

		<!-- Error log tab -->
		<Tabs.Content value="errors" class="mt-6 space-y-6">
			{#if data.repeatedErrors.length > 0}
				<AdminSectionCard title="Repeated errors" description="Sources that keep failing with the same error.">
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Source</Table.Head>
										<Table.Head>Error type</Table.Head>
										<Table.Head>Error message</Table.Head>
										<Table.Head>Occurrences</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.repeatedErrors as row}
										<Table.Row>
											<Table.Cell>
												<a href={`/admin/sources/${row.sourceId}`} class="font-medium hover:underline">{row.sourceName}</a>
											</Table.Cell>
											<Table.Cell class="text-[var(--mid)]">{row.errorCategory ?? 'Unknown'}</Table.Cell>
											<Table.Cell class="max-w-sm text-sm text-[var(--mid)]" title={row.errorMessage ?? ''}>
												{row.errorMessage ? row.errorMessage.slice(0, 120) + (row.errorMessage.length > 120 ? '…' : '') : '—'}
											</Table.Cell>
											<Table.Cell>{row.count}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			<AdminSectionCard title="Recent failure log" description="The most recent fetch failures across all sources.">
				{#snippet children()}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Source</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Error</Table.Head>
									<Table.Head>When</Table.Head>
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
										<Table.Cell><StatusBadge status={failure.log.status} /></Table.Cell>
										<Table.Cell class="max-w-sm text-sm text-[var(--mid)]" title={failure.log.errorMessage ?? ''}>
											{failure.log.errorMessage
												? failure.log.errorMessage.slice(0, 120) + (failure.log.errorMessage.length > 120 ? '…' : '')
												: failure.log.errorCategory ?? '—'}
										</Table.Cell>
										<Table.Cell class="text-[var(--mid)]">{timeAgo(failure.log.attemptedAt)}</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={4} class="h-20 text-center text-[var(--mid)]">No recent failures</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/snippet}
			</AdminSectionCard>
		</Tabs.Content>
	</Tabs.Root>
</div>
