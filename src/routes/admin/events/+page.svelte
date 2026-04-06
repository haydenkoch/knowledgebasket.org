<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import AdminReviewQueue from '$lib/components/organisms/admin/AdminReviewQueue.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eye from '@lucide/svelte/icons/eye';
	import Mail from '@lucide/svelte/icons/mail';
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { timeAgo } from '$lib/admin/labels.js';

	let { data }: { data: PageData } = $props();

	const statuses = $derived.by(() => [
		{ value: 'all', label: 'All' },
		...(data.statusCounts?.draft ? [{ value: 'draft', label: 'Draft' }] : []),
		{ value: 'pending', label: 'Pending' },
		{ value: 'published', label: 'Published' },
		{ value: 'rejected', label: 'Rejected' },
		...(data.statusCounts?.cancelled ? [{ value: 'cancelled', label: 'Cancelled' }] : [])
	]);

	const sortOptions = [
		{ value: 'updated', label: 'Last updated' },
		{ value: 'start', label: 'Start date' },
		{ value: 'title', label: 'Title' }
	];

	const exportBase = $derived(
		`/admin/events/export?status=${data.currentStatus}&search=${encodeURIComponent(data.currentSearch ?? '')}&sort=${data.currentSort}&order=${data.currentOrder}`
	);
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center gap-2">
		<Button
			href="/admin/events?tab=queue"
			variant={data.currentTab === 'queue' ? 'default' : 'outline'}
			size="sm"
		>
			Review queue
		</Button>
		<Button
			href="/admin/events?tab=lists"
			variant={data.currentTab === 'lists' ? 'default' : 'outline'}
			size="sm"
		>
			Curated lists
		</Button>
	</div>

	{#if data.currentTab === 'queue'}
		<AdminReviewQueue
			title="Events"
			description="Review, edit, and publish event listings."
			items={data.events}
			total={data.total}
			{statuses}
			statusCounts={data.statusCounts}
			currentStatus={data.currentStatus}
			currentSearch={data.currentSearch}
			currentPage={data.currentPage}
			currentSort={data.currentSort}
			currentOrder={data.currentOrder}
			{sortOptions}
			searchPlaceholder="Search events…"
			addHref="/admin/events/new"
			addLabel="Add event"
			emptyTitle="No events yet"
			emptyDescription="Create your first event to get started."
			sectionTitle="Events"
			tableAriaLabel="Events review queue"
			tableMinWidthClass="min-w-[760px]"
			columnCount={7}
			itemLabelSingular="event"
			itemLabelPlural="events"
			selectionLabel={(event) => `Select ${event.title}`}
			approvedToast="Events approved"
			rejectedToast="Events rejected"
			deletedToast="Events deleted"
			rejectPlaceholder="Add a rejection reason for these events (optional)"
		>
			{#snippet actions()}
				<Button href={`${exportBase}&format=csv`} variant="secondary" title="Export to CSV">
					<Download class="mr-2 h-4 w-4" />
					CSV
				</Button>
				<Button href={`${exportBase}&format=ical`} variant="secondary" title="Export to iCal">
					<Download class="mr-2 h-4 w-4" />
					iCal
				</Button>
			{/snippet}

			{#snippet headCells()}
				<Table.Head>Title</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Organization</Table.Head>
				<Table.Head>Start date</Table.Head>
				<Table.Head>Submitted</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			{/snippet}

			{#snippet rowCells(event)}
				<Table.Cell class="font-medium">{event.title}</Table.Cell>
				<Table.Cell>
					<StatusBadge status={event.status ?? 'unknown'} />
				</Table.Cell>
				<Table.Cell class="text-sm text-[var(--mid)]">
					{event.organizationName ?? event.hostOrg ?? '—'}
				</Table.Cell>
				<Table.Cell class="text-sm text-[var(--mid)]">{event.startDate ?? '—'}</Table.Cell>
				<Table.Cell class="text-sm text-[var(--mid)]">
					{#if event.createdAt}
						<div>{timeAgo(event.createdAt)}</div>
						{#if event.submitterName || event.submitterEmail}
							<div class="text-xs">{event.submitterName ?? event.submitterEmail}</div>
						{/if}
					{:else}
						—
					{/if}
				</Table.Cell>
				<Table.Cell class="text-right">
					<div class="flex items-center justify-end gap-1">
						<Button href={`/admin/events/${event.id}`} variant="ghost" size="icon-sm" title="Edit">
							<Pencil class="h-4 w-4" />
						</Button>
						{#if event.slug}
							<Button
								href={`/events/${event.slug}`}
								variant="ghost"
								size="icon-sm"
								title="View on site"
								target="_blank"
							>
								<Eye class="h-4 w-4" />
							</Button>
						{/if}
						{#if event.contactEmail}
							<Button
								href={`mailto:${event.contactEmail}`}
								variant="ghost"
								size="icon-sm"
								title="Email contact"
							>
								<Mail class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</Table.Cell>
			{/snippet}
		</AdminReviewQueue>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
			<Card.Root>
				<Card.Header>
					<Card.Title>Create list</Card.Title>
					<Card.Description>
						Curated lists power the featured rail and iCal feeds without leaving the Events
						workspace.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" action="?/createList" use:enhance class="space-y-4">
						<div class="space-y-1.5">
							<Label for="title">Title</Label>
							<Input id="title" name="title" placeholder="Featured" required />
						</div>
						<div class="space-y-1.5">
							<Label for="slug">Slug</Label>
							<Input id="slug" name="slug" placeholder="featured" />
						</div>
						<Button type="submit" class="w-full">Create list</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Curated lists</Card.Title>
					<Card.Description>
						Manage homepage-ready event collections, item order, and feed links from one place.
					</Card.Description>
				</Card.Header>
				<Card.Content class="overflow-x-auto">
					{#if data.lists.length === 0}
						<Empty.Root>
							<Empty.Header>
								<Empty.Title>No lists yet</Empty.Title>
								<Empty.Description>
									Create your first curated list to feature a custom set of events.
								</Empty.Description>
							</Empty.Header>
						</Empty.Root>
					{:else}
						<Table.Root class="min-w-[680px]">
							<Table.Header>
								<Table.Row>
									<Table.Head>Title</Table.Head>
									<Table.Head>Slug</Table.Head>
									<Table.Head>Items</Table.Head>
									<Table.Head>Updated</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.lists as list}
									<Table.Row>
										<Table.Cell class="font-medium">{list.title}</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">{list.slug}</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">{list.itemCount}</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{list.updatedAt ? timeAgo(list.updatedAt) : '—'}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex items-center justify-end gap-2">
												<Button href={`/admin/events/lists/${list.id}`} variant="ghost" size="sm">
													Edit
												</Button>
												<Button
													href={`/events/feed.ics?list=${list.slug}`}
													variant="ghost"
													size="sm"
													target="_blank"
												>
													Feed
												</Button>
												{#if list.slug === 'featured'}
													<Button href="/events" variant="ghost" size="sm" target="_blank">
														<ExternalLink class="mr-2 h-4 w-4" />
														Events page
													</Button>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
