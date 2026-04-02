<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { toast } from 'svelte-sonner';
	import { Pencil, Eye, Mail, Plus, Download } from '@lucide/svelte';
	import { timeAgo } from '$lib/admin/labels.js';

	let { data } = $props();

	let searchValue = $state('');
	$effect(() => {
		searchValue = data.currentSearch ?? '';
	});
	let selectedIds: string[] = $state([]);
	let pageState = $state(1);
	$effect(() => {
		pageState = data.currentPage;
	});
	$effect(() => {
		if (pageState !== data.currentPage) goPage(pageState);
	});

	const statuses = ['all', 'pending', 'published', 'rejected', 'cancelled'];
	const statusLabels: Record<string, string> = {
		all: 'All',
		pending: 'Pending',
		published: 'Published',
		rejected: 'Rejected',
		cancelled: 'Cancelled'
	};

	function applyFilter(status: string) {
		const url = new URL($page.url);
		url.searchParams.set('status', status);
		url.searchParams.set('page', '1');
		goto(url);
	}

	function doSearch() {
		const url = new URL($page.url);
		url.searchParams.set('search', searchValue);
		url.searchParams.set('page', '1');
		goto(url);
	}

	function goPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(p));
		goto(url);
	}

	function applySort(sort: string) {
		const url = new URL($page.url);
		url.searchParams.set('sort', sort);
		url.searchParams.set('page', '1');
		goto(url);
	}

	function applyOrder(order: string) {
		const url = new URL($page.url);
		url.searchParams.set('order', order);
		url.searchParams.set('page', '1');
		goto(url);
	}

	function setAllSelected(checked: boolean) {
		selectedIds = checked ? data.events.map((e) => e.id) : [];
	}

	function setSelected(eventId: string, checked: boolean) {
		if (checked) selectedIds = [...selectedIds, eventId];
		else selectedIds = selectedIds.filter((i) => i !== eventId);
	}

	const totalPages = $derived(Math.ceil(data.total / 25));
	const allSelected = $derived(data.events.length > 0 && selectedIds.length === data.events.length);

	const exportBase = $derived(
		`/admin/events/export?status=${data.currentStatus}&search=${encodeURIComponent(data.currentSearch ?? '')}&sort=${data.currentSort}&order=${data.currentOrder}`
	);
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Content"
		title="Events"
		description="Review, edit, and publish event listings."
	>
		{#snippet actions()}
			<Button href="/admin/events/new">
				<Plus class="mr-2 h-4 w-4" />
				Add event
			</Button>
			<Button href="{exportBase}&format=csv" variant="secondary" title="Export to CSV">
				<Download class="mr-2 h-4 w-4" />
				CSV
			</Button>
			<Button href="{exportBase}&format=ical" variant="secondary" title="Export to iCal">
				<Download class="mr-2 h-4 w-4" />
				iCal
			</Button>
		{/snippet}
		{#snippet meta()}
			<span>{data.total} event{data.total !== 1 ? 's' : ''} match current filter</span>
		{/snippet}
	</AdminPageHeader>

	{#if data.total === 0 && !data.currentSearch}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No events yet</Empty.Title>
				<Empty.Description>Create your first event to get started.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/admin/events/new">
					<Plus class="mr-2 h-4 w-4" />
					Add event
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<AdminSectionCard title="Events">
			{#snippet children()}
				<div class="space-y-4 px-5 py-4">
					<!-- Status tabs -->
					<Tabs.Root value={data.currentStatus} onValueChange={applyFilter}>
						<Tabs.List>
							{#each statuses as s}
								<Tabs.Trigger value={s}>{statusLabels[s] ?? s}</Tabs.Trigger>
							{/each}
						</Tabs.List>
					</Tabs.Root>

					<!-- Search + sort -->
					<div class="flex flex-wrap items-center gap-3">
						<form
							onsubmit={(e) => { e.preventDefault(); doSearch(); }}
							class="flex gap-2"
						>
							<Input type="text" bind:value={searchValue} placeholder="Search events…" class="max-w-xs" />
							<Button type="submit" variant="secondary">Search</Button>
						</form>
						<div class="flex items-center gap-2 text-sm text-[var(--mid)]">
							<span>Sort</span>
							<NativeSelect.Root
								value={data.currentSort}
								onchange={(e) => applySort((e.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="updated">Last updated</NativeSelect.Option>
								<NativeSelect.Option value="start">Start date</NativeSelect.Option>
								<NativeSelect.Option value="title">Title</NativeSelect.Option>
							</NativeSelect.Root>
							<NativeSelect.Root
								value={data.currentOrder}
								onchange={(e) => applyOrder((e.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="desc">Newest first</NativeSelect.Option>
								<NativeSelect.Option value="asc">Oldest first</NativeSelect.Option>
							</NativeSelect.Root>
						</div>
					</div>

					<!-- Bulk actions bar -->
					{#if selectedIds.length > 0}
						<div class="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/60 px-4 py-3 text-sm">
							<span class="font-medium text-[var(--dark)]">{selectedIds.length} selected</span>
							<button type="button" class="text-xs text-[var(--mid)] hover:underline" onclick={() => (selectedIds = [])}>
								Clear
							</button>
							<div class="ml-auto flex flex-wrap items-center gap-2">
								<form
									method="POST"
									action="?/bulkApprove"
									use:enhance={() => ({ result, update }) => {
										if (result.type === 'success') toast.success('Events approved');
										update();
									}}
									class="contents"
								>
									{#each selectedIds as id}
										<input type="hidden" name="ids" value={id} />
									{/each}
									<Button type="submit" size="sm">Approve ({selectedIds.length})</Button>
								</form>
								<form method="POST" action="?/bulkReject" use:enhance class="contents">
									{#each selectedIds as id}
										<input type="hidden" name="ids" value={id} />
									{/each}
									<Button type="submit" size="sm" variant="outline">Reject</Button>
								</form>
								<AlertDialog.Root>
									<AlertDialog.Trigger>
										<Button size="sm" variant="destructive" type="button">Delete</Button>
									</AlertDialog.Trigger>
									<AlertDialog.Content>
										<AlertDialog.Header>
											<AlertDialog.Title>Delete {selectedIds.length} events?</AlertDialog.Title>
											<AlertDialog.Description>This cannot be undone. The selected events will be permanently deleted.</AlertDialog.Description>
										</AlertDialog.Header>
										<AlertDialog.Footer>
											<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
											<form
												method="POST"
												action="?/bulkDelete"
												use:enhance={() => ({ result, update }) => {
													if (result.type === 'success') toast.success('Events deleted');
													update();
												}}
												class="contents"
											>
												{#each selectedIds as id}
													<input type="hidden" name="ids" value={id} />
												{/each}
												<AlertDialog.Action type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
													Delete
												</AlertDialog.Action>
											</form>
										</AlertDialog.Footer>
									</AlertDialog.Content>
								</AlertDialog.Root>
							</div>
						</div>
					{/if}

					<!-- Table -->
					<div class="overflow-x-auto rounded-lg border border-[color:var(--rule)]">
						<Table.Root class="min-w-[760px]">
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-10">
										<Checkbox checked={allSelected} onCheckedChange={(c) => setAllSelected(!!c)} aria-label="Select all" />
									</Table.Head>
									<Table.Head>Title</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Organization</Table.Head>
									<Table.Head>Start date</Table.Head>
									<Table.Head>Submitted</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.events as event}
									<Table.Row>
										<Table.Cell>
											<Checkbox
												checked={selectedIds.includes(event.id)}
												onCheckedChange={(c) => setSelected(event.id, !!c)}
												aria-label="Select {event.title}"
											/>
										</Table.Cell>
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
												<Button href="/admin/events/{event.id}" variant="ghost" size="icon-sm" title="Edit">
													<Pencil class="h-4 w-4" />
												</Button>
												{#if event.slug}
													<Button href="/events/{event.slug}" variant="ghost" size="icon-sm" title="View on site" target="_blank">
														<Eye class="h-4 w-4" />
													</Button>
												{/if}
												{#if event.contactEmail}
													<Button href="mailto:{event.contactEmail}" variant="ghost" size="icon-sm" title="Email contact">
														<Mail class="h-4 w-4" />
													</Button>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={7} class="h-24 text-center text-[var(--mid)]">
											No events found
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<!-- Pagination -->
					{#if totalPages > 1}
						<Pagination.Root
							count={data.total}
							perPage={25}
							bind:page={pageState}
							aria-label="Events pagination"
						>
							{#snippet children({ pages, currentPage })}
								<Pagination.Content class="flex items-center justify-center gap-1">
									<Pagination.Item>
										<Pagination.Previous />
									</Pagination.Item>
									{#each pages as p (p.key)}
										{#if p.type === 'ellipsis'}
											<Pagination.Item>
												<Pagination.Ellipsis />
											</Pagination.Item>
										{:else}
											<Pagination.Item>
												<Pagination.Link page={p} isActive={currentPage === p.value}>
													{p.value}
												</Pagination.Link>
											</Pagination.Item>
										{/if}
									{/each}
									<Pagination.Item>
										<Pagination.Next />
									</Pagination.Item>
								</Pagination.Content>
							{/snippet}
						</Pagination.Root>
					{/if}
				</div>
			{/snippet}
		</AdminSectionCard>
	{/if}
</div>
