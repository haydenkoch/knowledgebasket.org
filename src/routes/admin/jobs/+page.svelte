<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminReviewQueue from '$lib/components/organisms/admin/AdminReviewQueue.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { timeAgo } from '$lib/admin/labels.js';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { data }: { data: PageData } = $props();

	const statuses = $derived.by(() => [
		{ value: 'all', label: 'All' },
		{ value: 'draft', label: 'Draft' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'published', label: 'Published' },
		{ value: 'rejected', label: 'Rejected' },
		...(data.statusCounts?.cancelled ? [{ value: 'cancelled', label: 'Cancelled' }] : [])
	]);

	const sortOptions = [
		{ value: 'updated', label: 'Last updated' },
		{ value: 'deadline', label: 'Deadline' },
		{ value: 'title', label: 'Title' }
	];
</script>

<AdminReviewQueue
	title="Jobs"
	description="Review, edit, and publish job listings."
	items={data.jobs}
	total={data.total}
	{statuses}
	statusCounts={data.statusCounts}
	currentStatus={data.currentStatus}
	currentSearch={data.currentSearch}
	currentPage={data.currentPage}
	currentSort={data.currentSort}
	currentOrder={data.currentOrder}
	{sortOptions}
	searchPlaceholder="Search jobs…"
	addHref="/admin/jobs/new"
	addLabel="Add job"
	emptyTitle="No jobs yet"
	emptyDescription="Create your first job listing to get started."
	sectionTitle="Jobs"
	tableAriaLabel="Jobs review queue"
	columnCount={8}
	itemLabelSingular="job"
	itemLabelPlural="jobs"
	selectionLabel={(item) => `Select ${item.title}`}
	approvedToast="Jobs approved"
	rejectedToast="Jobs rejected"
	deletedToast="Jobs deleted"
	rejectPlaceholder="Add a rejection reason for these jobs (optional)"
>
	{#snippet headCells()}
		<Table.Head>Title</Table.Head>
		<Table.Head>Employer</Table.Head>
		<Table.Head>Type</Table.Head>
		<Table.Head>Deadline</Table.Head>
		<Table.Head>Submitted</Table.Head>
		<Table.Head>Status</Table.Head>
		<Table.Head class="text-right">Actions</Table.Head>
	{/snippet}

	{#snippet rowCells(item)}
		<Table.Cell>
			<div class="space-y-1">
				<div class="font-medium text-[var(--dark)]">{item.title}</div>
				{#if item.location || item.region}
					<div class="text-xs text-[var(--mid)]">{item.location ?? item.region ?? '—'}</div>
				{/if}
			</div>
		</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">{item.employerName ?? '—'}</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">
			{formatDisplayValue(item.jobType, { key: 'jobType' })}
		</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">
			{formatDisplayValue(item.applicationDeadline, { key: 'applicationDeadline' })}
		</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">
			{#if item.createdAt}
				<div>{timeAgo(item.createdAt)}</div>
				{#if item.submitterName || item.submitterEmail}
					<div class="text-xs">{item.submitterName ?? item.submitterEmail}</div>
				{/if}
			{:else}
				—
			{/if}
		</Table.Cell>
		<Table.Cell>
			<StatusBadge status={item.status ?? 'unknown'} />
		</Table.Cell>
		<Table.Cell class="text-right">
			<div class="flex justify-end gap-1">
				{#if item.slug && item.status === 'published'}
					<Button
						href={`/jobs/${item.slug}`}
						variant="ghost"
						size="icon-sm"
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink class="h-4 w-4" />
					</Button>
				{/if}
				<Button href={`/admin/jobs/${item.id}`} variant="ghost" size="icon-sm">
					<Pencil class="h-4 w-4" />
				</Button>
			</div>
		</Table.Cell>
	{/snippet}
</AdminReviewQueue>
