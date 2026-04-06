<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminReviewQueue from '$lib/components/organisms/admin/AdminReviewQueue.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eye from '@lucide/svelte/icons/eye';
	import Mail from '@lucide/svelte/icons/mail';
	import Download from '@lucide/svelte/icons/download';
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
