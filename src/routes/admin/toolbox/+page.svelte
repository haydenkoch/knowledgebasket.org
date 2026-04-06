<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminReviewQueue from '$lib/components/organisms/admin/AdminReviewQueue.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
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
		{ value: 'title', label: 'Title' }
	];
</script>

<AdminReviewQueue
	title="Toolbox"
	description="Review, edit, and publish public resources, guides, and links."
	items={data.resources}
	total={data.total}
	{statuses}
	statusCounts={data.statusCounts}
	currentStatus={data.currentStatus}
	currentSearch={data.currentSearch}
	currentPage={data.currentPage}
	currentSort={data.currentSort}
	currentOrder={data.currentOrder}
	{sortOptions}
	searchPlaceholder="Search resources…"
	addHref="/admin/toolbox/new"
	addLabel="Add resource"
	emptyTitle="No toolbox resources yet"
	emptyDescription="Create your first resource to get started."
	sectionTitle="Toolbox"
	tableAriaLabel="Toolbox review queue"
	columnCount={7}
	itemLabelSingular="resource"
	itemLabelPlural="resources"
	selectionLabel={(item) => `Select ${item.title}`}
	approvedToast="Resources approved"
	rejectedToast="Resources rejected"
	deletedToast="Resources deleted"
	rejectPlaceholder="Add a rejection reason for these resources (optional)"
>
	{#snippet headCells()}
		<Table.Head>Title</Table.Head>
		<Table.Head>Type</Table.Head>
		<Table.Head>Source</Table.Head>
		<Table.Head>Mode</Table.Head>
		<Table.Head>Status</Table.Head>
		<Table.Head class="text-right">Actions</Table.Head>
	{/snippet}

	{#snippet rowCells(item)}
		<Table.Cell>
			<div class="space-y-1">
				<div class="font-medium text-[var(--dark)]">{item.title}</div>
				{#if item.category || item.author}
					<div class="text-xs text-[var(--mid)]">
						{item.category ?? 'No category'}{#if item.author}
							· {item.author}
						{/if}
					</div>
				{/if}
			</div>
		</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]"
			>{item.mediaType ?? item.resourceType ?? '—'}</Table.Cell
		>
		<Table.Cell class="text-sm text-[var(--mid)]">{item.sourceName ?? '—'}</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">{item.contentMode ?? '—'}</Table.Cell>
		<Table.Cell>
			<StatusBadge status={item.status ?? 'unknown'} />
		</Table.Cell>
		<Table.Cell class="text-right">
			<div class="flex justify-end gap-1">
				{#if item.slug && item.status === 'published'}
					<Button
						href={`/toolbox/${item.slug}`}
						variant="ghost"
						size="icon-sm"
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink class="h-4 w-4" />
					</Button>
				{/if}
				<Button href={`/admin/toolbox/${item.id}`} variant="ghost" size="icon-sm">
					<Pencil class="h-4 w-4" />
				</Button>
			</div>
		</Table.Cell>
	{/snippet}
</AdminReviewQueue>
