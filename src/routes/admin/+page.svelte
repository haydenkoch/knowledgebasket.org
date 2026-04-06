<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import AdminStatCard from '$lib/components/organisms/admin/AdminStatCard.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import {
		ArrowUpRight,
		Check,
		Clock3,
		Inbox,
		SendHorizontal,
		ShieldAlert,
		X
	} from '@lucide/svelte';

	let { data } = $props();

	const snapshot = $derived(data.snapshot);

	function setTab(nextTab: string) {
		const url = new URL($page.url);
		url.searchParams.set('tab', nextTab);
		goto(url, { keepFocus: true, noScroll: true });
	}

	function formEnhance(label: string): SubmitFunction {
		return () => {
			return async ({ result, update }) => {
				if (result.type === 'success') toast.success(`${label} updated`);
				else if (result.type === 'failure') {
					toast.error((result.data as { error?: string })?.error ?? `Unable to update ${label}`);
				}
				await update();
			};
		};
	}

	const submissionSections = $derived(
		snapshot.sections.filter((section) =>
			['funding', 'jobs', 'redpages', 'toolbox'].includes(section.key)
		)
	);

	const sourceSection = $derived(
		snapshot.sections.find((section) => section.key === 'source_candidates')
	);
	const eventSection = $derived(snapshot.sections.find((section) => section.key === 'events'));
</script>

<div class="space-y-8">
	<AdminPageHeader
		eyebrow="Moderation"
		title="Work queue"
		description="Start here to triage imports, events, and non-event submissions from one place. The goal is to make the next moderator action obvious without bouncing between overlapping admin homes."
	>
		{#snippet actions()}
			<Button href="/admin/sources/review" variant="secondary">
				<SendHorizontal class="mr-2 h-4 w-4" />
				Source review
			</Button>
			<Button href="/admin/events?status=pending">
				<Inbox class="mr-2 h-4 w-4" />
				Event queue
			</Button>
		{/snippet}
		{#snippet meta()}
			<span>{snapshot.metrics.totalAttention} total items need attention</span>
			<span>{snapshot.metrics.highPrioritySources} high-priority source candidates</span>
			<span>{snapshot.metrics.pendingSubmissions} pending non-event submissions</span>
		{/snippet}
	</AdminPageHeader>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<AdminStatCard
			label="Needs attention"
			value={snapshot.metrics.totalAttention}
			description="Open review work across every queue"
			href="/admin"
			tone="lake"
		/>
		<AdminStatCard
			label="Source backlog"
			value={snapshot.metrics.sourceQueue}
			description={`${snapshot.metrics.needsInfoSources} need follow-up`}
			href="/admin/sources/review?status=open"
			tone="gold"
		/>
		<AdminStatCard
			label="Event review"
			value={snapshot.metrics.pendingEvents}
			description="Pending event submissions"
			href="/admin/events?status=pending"
			tone="forest"
		/>
		<AdminStatCard
			label="Public submissions"
			value={snapshot.metrics.pendingSubmissions}
			description="Funding, jobs, businesses, and resources"
			href="/admin/funding?status=pending"
			tone="ember"
		/>
		<AdminStatCard
			label="Source follow-up"
			value={snapshot.metrics.brokenSources + snapshot.metrics.staleSources}
			description="Broken/auth-required and stale sources"
			href="/admin/sources/health"
			tone="stone"
		/>
	</div>

	<Tabs.Root value={data.tab} onValueChange={setTab}>
		<Tabs.List class="w-full justify-start overflow-auto">
			<Tabs.Trigger value="all">Everything</Tabs.Trigger>
			<Tabs.Trigger value="sources">Imports</Tabs.Trigger>
			<Tabs.Trigger value="events">Events</Tabs.Trigger>
			<Tabs.Trigger value="submissions">Submissions</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="all" class="mt-6 space-y-6">
			{#if sourceSection}
				<AdminSectionCard title={sourceSection.title} description={sourceSection.description}>
					{#snippet actions()}
						<Button href={sourceSection.href} variant="secondary">Open full queue</Button>
					{/snippet}
					{#snippet children()}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Candidate</Table.Head>
										<Table.Head>Source</Table.Head>
										<Table.Head>Status</Table.Head>
										<Table.Head class="w-[260px]">Actions</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each sourceSection.items as item}
										<Table.Row>
											<Table.Cell class="align-top">
												<div class="space-y-1">
													<a href={item.href} class="font-medium text-primary hover:underline">
														{item.title}
													</a>
													{#if item.excerpt}
														<p class="max-w-xl text-sm leading-5 text-[var(--mid)]">
															{item.excerpt}
														</p>
													{/if}
												</div>
											</Table.Cell>
											<Table.Cell class="align-top">
												<div class="space-y-1 text-sm text-[var(--mid)]">
													{#each item.meta.slice(0, 2) as meta}
														<div>{meta}</div>
													{/each}
												</div>
											</Table.Cell>
											<Table.Cell class="align-top">
												<div class="flex flex-wrap gap-2">
													<StatusBadge status={item.status} />
													{#if item.priority && item.priority !== 'normal'}
														<span
															class="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--color-ember-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_90%,white)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--color-ember-900)] uppercase"
														>
															High priority
														</span>
													{/if}
												</div>
											</Table.Cell>
											<Table.Cell class="align-top">
												<div class="flex flex-wrap items-center gap-2">
													<form
														method="POST"
														action="?/review"
														use:enhance={formEnhance('Candidate')}
													>
														<input type="hidden" name="kind" value={item.kind} />
														<input type="hidden" name="id" value={item.id} />
														<input type="hidden" name="decision" value="approve" />
														<Button type="submit" size="sm">
															<Check class="mr-1.5 h-3.5 w-3.5" />
															Approve
														</Button>
													</form>
													<form
														method="POST"
														action="?/review"
														use:enhance={formEnhance('Candidate')}
													>
														<input type="hidden" name="kind" value={item.kind} />
														<input type="hidden" name="id" value={item.id} />
														<input type="hidden" name="decision" value="needs_info" />
														<Button type="submit" size="sm" variant="secondary">
															<Clock3 class="mr-1.5 h-3.5 w-3.5" />
															Needs info
														</Button>
													</form>
													<a
														href={item.href}
														class="text-sm font-medium text-primary hover:underline"
													>
														Review details
													</a>
												</div>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			{#if eventSection}
				<AdminSectionCard title={eventSection.title} description={eventSection.description}>
					{#snippet actions()}
						<Button href={eventSection.href} variant="secondary">Open event queue</Button>
					{/snippet}
					{#snippet children()}
						<div class="divide-y divide-[color:var(--rule)]">
							{#each eventSection.items as item}
								<div
									class="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:justify-between"
								>
									<div class="space-y-1">
										<a href={item.href} class="font-medium text-primary hover:underline"
											>{item.title}</a
										>
										{#if item.excerpt}
											<p class="max-w-3xl text-sm leading-5 text-[var(--mid)]">{item.excerpt}</p>
										{/if}
										<p class="text-sm text-[var(--mid)]">{item.meta.join(' · ')}</p>
									</div>
									<div class="flex flex-wrap items-center gap-2">
										<StatusBadge status={item.status} />
										<form method="POST" action="?/review" use:enhance={formEnhance('Event')}>
											<input type="hidden" name="kind" value={item.kind} />
											<input type="hidden" name="id" value={item.id} />
											<input type="hidden" name="decision" value="approve" />
											<Button type="submit" size="sm">
												<Check class="mr-1.5 h-3.5 w-3.5" />
												Approve
											</Button>
										</form>
										<form method="POST" action="?/review" use:enhance={formEnhance('Event')}>
											<input type="hidden" name="kind" value={item.kind} />
											<input type="hidden" name="id" value={item.id} />
											<input type="hidden" name="decision" value="reject" />
											<Button type="submit" size="sm" variant="outline">
												<X class="mr-1.5 h-3.5 w-3.5" />
												Reject
											</Button>
										</form>
										<a href={item.href} class="text-sm font-medium text-primary hover:underline">
											Open
										</a>
									</div>
								</div>
							{/each}
						</div>
					{/snippet}
				</AdminSectionCard>
			{/if}

			<AdminSectionCard
				title="Pending public submissions"
				description="Use this work queue to decide which content area needs attention next, then finish moderation in the dedicated route for that coil."
			>
				{#snippet children()}
					<div class="grid gap-5 px-5 py-5 xl:grid-cols-2">
						{#each submissionSections as section}
							<div
								class="rounded-[20px] border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/45"
							>
								<div
									class="flex items-center justify-between gap-3 border-b border-[color:var(--rule)] px-4 py-3"
								>
									<div>
										<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">
											{section.title}
										</h3>
										<p class="text-sm text-[var(--mid)]">{section.count} waiting for review</p>
									</div>
									<div class="flex items-center gap-2">
										<StatusBadge status="pending" />
										<Button href={section.href} variant="secondary" size="sm">Open queue</Button>
									</div>
								</div>
								<div class="divide-y divide-[color:var(--rule)]">
									{#if section.items.length === 0}
										<div class="px-4 py-5 text-sm text-[var(--mid)]">No pending items.</div>
									{:else}
										{#each section.items as item}
											<div class="space-y-3 px-4 py-4">
												<div class="space-y-1">
													{#if item.href}
														<a href={item.href} class="font-medium text-primary hover:underline">
															{item.title}
														</a>
													{:else}
														<p class="font-medium text-[var(--dark)]">{item.title}</p>
													{/if}
													{#if item.excerpt}
														<p class="text-sm leading-5 text-[var(--mid)]">{item.excerpt}</p>
													{/if}
													<p class="text-sm text-[var(--mid)]">{item.meta.join(' · ')}</p>
												</div>
												<div class="flex flex-wrap items-center gap-2">
													<StatusBadge status={item.status} />
													{#if item.href}
														<Button href={item.href} size="sm">Open item</Button>
													{/if}
													<Button href={section.href} size="sm" variant="outline">
														Open queue
													</Button>
												</div>
											</div>
										{/each}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/snippet}
			</AdminSectionCard>
		</Tabs.Content>

		<Tabs.Content value="sources" class="mt-6 space-y-6">
			<AdminSectionCard
				title="Source candidates"
				description="Imported records waiting on normalization, merge decisions, or manual review."
			>
				{#snippet actions()}
					<Button href="/admin/sources/review" variant="secondary">Open full source queue</Button>
				{/snippet}
				{#snippet children()}
					<div class="grid gap-5 px-5 py-5 xl:grid-cols-[1.2fr_0.8fr]">
						<div class="space-y-4">
							{#each sourceSection?.items ?? [] as item}
								<div class="rounded-[18px] border border-[color:var(--rule)] bg-white p-4">
									<div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
										<div class="space-y-1">
											<a href={item.href} class="font-medium text-primary hover:underline"
												>{item.title}</a
											>
											<p class="text-sm text-[var(--mid)]">{item.meta.join(' · ')}</p>
											{#if item.excerpt}
												<p class="text-sm leading-5 text-[var(--mid)]">{item.excerpt}</p>
											{/if}
										</div>
										<div class="flex flex-wrap gap-2">
											<StatusBadge status={item.status} />
											{#if item.priority}
												<span
													class="inline-flex items-center rounded-full border border-[color:var(--rule)] px-2.5 py-1 text-[11px] font-semibold uppercase"
												>
													{item.priority}
												</span>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
						<div
							class="rounded-[20px] border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/45 p-4"
						>
							<p class="font-serif text-lg font-semibold text-[var(--dark)]">Source queue health</p>
							<div class="mt-4 space-y-3 text-sm text-[var(--mid)]">
								<div class="flex items-start gap-3">
									<ShieldAlert class="mt-0.5 h-4 w-4 text-[var(--color-ember-900)]" />
									<p>{snapshot.metrics.highPrioritySources} candidates are marked high priority.</p>
								</div>
								<div class="flex items-start gap-3">
									<Clock3 class="mt-0.5 h-4 w-4 text-[var(--color-flicker-900)]" />
									<p>{snapshot.metrics.needsInfoSources} candidates are waiting on more context.</p>
								</div>
								<div class="flex items-start gap-3">
									<ArrowUpRight class="mt-0.5 h-4 w-4 text-[var(--color-lakebed-900)]" />
									<p>
										{snapshot.metrics.reviewRequiredSources} sources are flagged for review at the source
										level.
									</p>
								</div>
							</div>
						</div>
					</div>
				{/snippet}
			</AdminSectionCard>
		</Tabs.Content>

		<Tabs.Content value="events" class="mt-6">
			<AdminSectionCard
				title="Pending event moderation"
				description="Approve, reject, or open records for deeper editing."
			>
				{#snippet children()}
					<div class="divide-y divide-[color:var(--rule)]">
						{#each eventSection?.items ?? [] as item}
							<div
								class="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:justify-between"
							>
								<div class="space-y-1">
									<a href={item.href} class="font-medium text-primary hover:underline"
										>{item.title}</a
									>
									{#if item.excerpt}
										<p class="max-w-3xl text-sm leading-5 text-[var(--mid)]">{item.excerpt}</p>
									{/if}
									<p class="text-sm text-[var(--mid)]">{item.meta.join(' · ')}</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<StatusBadge status={item.status} />
									<form method="POST" action="?/review" use:enhance={formEnhance('Event')}>
										<input type="hidden" name="kind" value={item.kind} />
										<input type="hidden" name="id" value={item.id} />
										<input type="hidden" name="decision" value="approve" />
										<Button type="submit" size="sm">Approve</Button>
									</form>
									<form method="POST" action="?/review" use:enhance={formEnhance('Event')}>
										<input type="hidden" name="kind" value={item.kind} />
										<input type="hidden" name="id" value={item.id} />
										<input type="hidden" name="decision" value="reject" />
										<Button type="submit" size="sm" variant="outline">Reject</Button>
									</form>
									<a href={item.href} class="text-sm font-medium text-primary hover:underline"
										>Edit</a
									>
								</div>
							</div>
						{/each}
					</div>
				{/snippet}
			</AdminSectionCard>
		</Tabs.Content>

		<Tabs.Content value="submissions" class="mt-6">
			<AdminSectionCard
				title="Pending non-event submissions"
				description="A triage view across the non-event coils. Use these cards to decide which queue to enter next, then finish moderation in the dedicated admin routes."
			>
				{#snippet children()}
					<div class="grid gap-5 px-5 py-5 xl:grid-cols-2">
						{#each submissionSections as section}
							<div
								class="rounded-[20px] border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/45"
							>
								<div class="border-b border-[color:var(--rule)] px-4 py-3">
									<div class="flex items-center justify-between gap-3">
										<div>
											<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">
												{section.title}
											</h3>
											<p class="text-sm text-[var(--mid)]">{section.description}</p>
										</div>
										<div class="flex items-center gap-2">
											<StatusBadge status="pending" />
											<Button href={section.href} variant="secondary" size="sm">Open queue</Button>
										</div>
									</div>
								</div>
								<div class="divide-y divide-[color:var(--rule)]">
									{#if section.items.length === 0}
										<div class="px-4 py-5 text-sm text-[var(--mid)]">No pending items.</div>
									{:else}
										{#each section.items as item}
											<div class="space-y-3 px-4 py-4">
												<div class="space-y-1">
													{#if item.href}
														<a href={item.href} class="font-medium text-primary hover:underline"
															>{item.title}</a
														>
													{:else}
														<p class="font-medium text-[var(--dark)]">{item.title}</p>
													{/if}
													{#if item.excerpt}
														<p class="text-sm leading-5 text-[var(--mid)]">{item.excerpt}</p>
													{/if}
													<p class="text-sm text-[var(--mid)]">{item.meta.join(' · ')}</p>
												</div>
												<div class="flex flex-wrap items-center gap-2">
													<StatusBadge status={item.status} />
													{#if item.href}
														<Button href={item.href} size="sm">Open item</Button>
													{/if}
													<Button href={section.href} size="sm" variant="outline">Open queue</Button
													>
												</div>
											</div>
										{/each}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/snippet}
			</AdminSectionCard>
		</Tabs.Content>
	</Tabs.Root>

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
