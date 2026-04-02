<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import AdminStatCard from '$lib/components/organisms/admin/AdminStatCard.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { ArrowRight, ExternalLink, Inbox, SearchCheck, ShieldAlert } from '@lucide/svelte';

	let { data } = $props();

	const snapshot = $derived(data.snapshot);
	const topSections = $derived(
		snapshot.sections.filter((section) => section.count > 0).slice(0, 4)
	);
</script>

<div class="space-y-8">
	<AdminPageHeader
		eyebrow="Overview"
		title="Operations at a glance"
		description="Start here to see what needs attention across events, source imports, and pending submissions. The goal is to make the next action obvious, not force moderators to hunt by route."
	>
		{#snippet actions()}
			<Button href="/admin/inbox">
				<Inbox class="mr-2 h-4 w-4" />
				Open inbox
			</Button>
			<Button href="/" variant="secondary" target="_blank" rel="noreferrer">
				<ExternalLink class="mr-2 h-4 w-4" />
				View site
			</Button>
		{/snippet}
		{#snippet meta()}
			<span>{snapshot.metrics.totalAttention} active items across moderation queues</span>
			<span>{snapshot.metrics.brokenSources} source issues need operational follow-up</span>
			<span>{snapshot.metrics.reviewRequiredSources} sources flagged for review</span>
		{/snippet}
	</AdminPageHeader>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<AdminStatCard
			label="Needs your attention"
			value={snapshot.metrics.totalAttention}
			description="Open review work across all queues"
			href="/admin/inbox"
			tone="lake"
		/>
		<AdminStatCard
			label="Import queue"
			value={snapshot.metrics.sourceQueue}
			description={`${snapshot.metrics.highPrioritySources} high priority`}
			href="/admin/sources/review?status=open"
			tone="gold"
		/>
		<AdminStatCard
			label="Events to review"
			value={snapshot.metrics.pendingEvents}
			description="Pending event submissions"
			href="/admin/events?status=pending"
			tone="forest"
		/>
		<AdminStatCard
			label="Submissions waiting"
			value={snapshot.metrics.pendingSubmissions}
			description="Funding, jobs, businesses, and resources"
			href="/admin/inbox?tab=submissions"
			tone="ember"
		/>
		<AdminStatCard
			label="Source issues"
			value={snapshot.metrics.staleSources + snapshot.metrics.brokenSources}
			description={`${snapshot.metrics.staleSources} stale, ${snapshot.metrics.brokenSources} broken/needing auth`}
			href="/admin/sources/health"
			tone="stone"
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
		<AdminSectionCard
			title="What needs attention now"
			description="These are the most important active queues. Each section links to the operational surface where moderators can take action immediately."
		>
			{#snippet children()}
				<div class="divide-y divide-[color:var(--rule)]">
					{#if topSections.length === 0}
						<div class="px-5 py-6 text-sm text-[var(--mid)]">
							No urgent moderation items are open right now.
						</div>
					{:else}
						{#each topSections as section}
							<a
								href={section.href}
								class="flex flex-col gap-3 px-5 py-4 no-underline transition-colors hover:bg-[var(--color-alpine-snow-100)]/60 hover:no-underline sm:flex-row sm:items-center sm:justify-between"
							>
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<span class="font-serif text-lg font-semibold text-[var(--dark)]">
											{section.title}
										</span>
										<StatusBadge
											status={section.key === 'source_candidates' ? 'pending_review' : 'pending'}
										/>
									</div>
									<p class="text-sm text-[var(--mid)]">{section.description}</p>
								</div>
								<div class="flex items-center gap-3">
									<div class="text-right">
										<div class="font-display text-[1.8rem] leading-none text-[var(--dark)]">
											{section.count}
										</div>
										<div class="text-xs font-medium tracking-[0.08em] text-[var(--mid)] uppercase">
											open items
										</div>
									</div>
									<ArrowRight class="h-4 w-4 text-[var(--mid)]" />
								</div>
							</a>
						{/each}
					{/if}
				</div>
			{/snippet}
		</AdminSectionCard>

		<AdminSectionCard
			title="Operational watchlist"
			description="Cross-cutting issues that slow moderation down or hide work."
		>
			{#snippet children()}
				<div class="space-y-4 px-5 py-5">
					<div
						class="rounded-2xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/70 p-4"
					>
						<div class="flex items-start gap-3">
							<SearchCheck class="mt-0.5 h-5 w-5 text-[var(--color-lakebed-900)]" />
							<div class="space-y-1">
								<p class="font-semibold text-[var(--dark)]">Waiting on more info</p>
								<p class="text-sm text-[var(--mid)]">
									{snapshot.metrics.needsInfoSources} imported items are blocked — they need more context or a manual decision before publishing.
								</p>
								<a
									href="/admin/sources/review?status=needs_info"
									class="text-sm font-medium text-primary hover:underline"
								>
									View these items
								</a>
							</div>
						</div>
					</div>

					<div
						class="rounded-2xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/70 p-4"
					>
						<div class="flex items-start gap-3">
							<ShieldAlert class="mt-0.5 h-5 w-5 text-[var(--color-ember-900)]" />
							<div class="space-y-1">
								<p class="font-semibold text-[var(--dark)]">Sources needing follow-up</p>
								<p class="text-sm text-[var(--mid)]">
									{snapshot.metrics.brokenSources} source{snapshot.metrics.brokenSources !== 1 ? 's' : ''} broken or needing auth, and {snapshot.metrics.staleSources} overdue for a check. Fresh content may be delayed.
								</p>
								<a
									href="/admin/sources/health"
									class="text-sm font-medium text-primary hover:underline"
								>
									Open health monitor
								</a>
							</div>
						</div>
					</div>

					<div
						class="rounded-2xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/70 p-4"
					>
						<p class="font-semibold text-[var(--dark)]">Quick actions</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<Button href="/admin/events/import" variant="secondary">Import events</Button>
							<Button href="/admin/events/duplicates" variant="secondary">Review duplicates</Button>
							<Button href="/admin/sources" variant="secondary">All sources</Button>
						</div>
					</div>
				</div>
			{/snippet}
		</AdminSectionCard>
	</div>

	<Separator />

	<AdminSectionCard
		title="Queue breakdown"
		description="Every active review queue, grouped by the content areas moderators are actually working through."
	>
		{#snippet children()}
			<div class="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
				{#each snapshot.queueTotals as queue}
					<AdminStatCard
						label={queue.label}
						value={queue.count}
						description={queue.description}
						href={queue.href}
						tone={queue.tone}
					/>
				{/each}
			</div>
		{/snippet}
	</AdminSectionCard>
</div>
