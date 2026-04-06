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
		{ value: 'name', label: 'Name' }
	];
</script>

<AdminReviewQueue
	title="Red Pages"
	description="Review, edit, and publish Native business directory listings."
	items={data.businesses}
	total={data.total}
	{statuses}
	statusCounts={data.statusCounts}
	currentStatus={data.currentStatus}
	currentSearch={data.currentSearch}
	currentPage={data.currentPage}
	currentSort={data.currentSort}
	currentOrder={data.currentOrder}
	{sortOptions}
	searchPlaceholder="Search listings…"
	addHref="/admin/red-pages/new"
	addLabel="Add listing"
	emptyTitle="No Red Pages listings yet"
	emptyDescription="Create your first directory listing to get started."
	sectionTitle="Red Pages"
	tableAriaLabel="Red Pages review queue"
	columnCount={7}
	itemLabelSingular="listing"
	itemLabelPlural="listings"
	selectionLabel={(item) => `Select ${item.title}`}
	approvedToast="Listings approved"
	rejectedToast="Listings rejected"
	deletedToast="Listings deleted"
	rejectPlaceholder="Add a rejection reason for these listings (optional)"
>
	{#snippet headCells()}
		<Table.Head>Name</Table.Head>
		<Table.Head>Affiliation</Table.Head>
		<Table.Head>Service type</Table.Head>
		<Table.Head>Region</Table.Head>
		<Table.Head>Status</Table.Head>
		<Table.Head class="text-right">Actions</Table.Head>
	{/snippet}

	{#snippet rowCells(item)}
		<Table.Cell>
			<div class="space-y-1">
				<div class="font-medium text-[var(--dark)]">{item.title}</div>
				<div class="text-xs text-[var(--mid)]">
					{item.verified ? 'Verified' : 'Unverified'}{#if item.website}
						· website
					{/if}
				</div>
			</div>
		</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">{item.tribalAffiliation ?? '—'}</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]">{item.serviceType ?? '—'}</Table.Cell>
		<Table.Cell class="text-sm text-[var(--mid)]"
			>{item.region ?? item.serviceArea ?? '—'}</Table.Cell
		>
		<Table.Cell>
			<StatusBadge status={item.status ?? 'unknown'} />
		</Table.Cell>
		<Table.Cell class="text-right">
			<div class="flex justify-end gap-1">
				{#if item.slug && item.status === 'published'}
					<Button
						href={`/red-pages/${item.slug}`}
						variant="ghost"
						size="icon-sm"
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink class="h-4 w-4" />
					</Button>
				{/if}
				<Button href={`/admin/red-pages/${item.id}`} variant="ghost" size="icon-sm">
					<Pencil class="h-4 w-4" />
				</Button>
			</div>
		</Table.Cell>
	{/snippet}
</AdminReviewQueue>
