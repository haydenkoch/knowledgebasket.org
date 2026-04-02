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
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { toast } from 'svelte-sonner';
	import { Pencil, Eye, Mail, Plus } from '@lucide/svelte';

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
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold">Events</h1>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/admin/events/export?format=csv&status={data.currentStatus}&search={encodeURIComponent(
					data.currentSearch ?? ''
				)}&sort={data.currentSort}&order={data.currentOrder}"
			>
				<Button type="button" variant="outline">Export CSV</Button>
			</a>
			<a
				href="/admin/events/export?format=ical&status={data.currentStatus}&search={encodeURIComponent(
					data.currentSearch ?? ''
				)}&sort={data.currentSort}&order={data.currentOrder}"
			>
				<Button type="button" variant="outline">Export iCal</Button>
			</a>
			<span class="text-sm text-muted-foreground">Exports current filter ({data.total} events)</span
			>
			<Button href="/admin/events/new">
				<Plus class="mr-2 h-4 w-4" />
				New Event
			</Button>
		</div>
	</div>

	{#if data.total === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No events yet</Empty.Title>
				<Empty.Description>Create your first event to get started.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/admin/events/new">
					<Plus class="mr-2 h-4 w-4" />
					New Event
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<Tabs.Root value={data.currentStatus} onValueChange={applyFilter}>
			<Tabs.List class="mb-4">
				{#each statuses as s}
					<Tabs.Trigger value={s} class="capitalize">{s}</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>

		<div class="flex flex-wrap items-center gap-4">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					doSearch();
				}}
				class="flex gap-2"
			>
				<Input
					type="text"
					bind:value={searchValue}
					placeholder="Search events..."
					class="max-w-sm"
				/>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
			<div class="flex items-center gap-2">
				<label for="sort-by" class="text-sm text-muted-foreground">Sort by</label>
				<NativeSelect.Root
					id="sort-by"
					value={data.currentSort}
					onchange={(e) => applySort((e.target as HTMLSelectElement).value)}
				>
					<NativeSelect.Option value="updated">Updated</NativeSelect.Option>
					<NativeSelect.Option value="start">Start date</NativeSelect.Option>
					<NativeSelect.Option value="title">Title</NativeSelect.Option>
				</NativeSelect.Root>
				<NativeSelect.Root
					value={data.currentOrder}
					onchange={(e) => applyOrder((e.target as HTMLSelectElement).value)}
				>
					<NativeSelect.Option value="desc">Descending</NativeSelect.Option>
					<NativeSelect.Option value="asc">Ascending</NativeSelect.Option>
				</NativeSelect.Root>
			</div>
		</div>

		{#if selectedIds.length > 0}
			<Alert>
				<AlertDescription class="flex flex-wrap items-center gap-2">
					<span>{selectedIds.length} selected</span>
					<form
						method="POST"
						action="?/bulkApprove"
						use:enhance={() =>
							({ result, update }) => {
								if (result.type === 'success') toast.success('Events approved');
								update();
							}}
						class="inline"
					>
						{#each selectedIds as id}
							<input type="hidden" name="ids" value={id} />
						{/each}
						<Button
							type="submit"
							size="sm"
							variant="default"
							class="bg-green-600 hover:bg-green-700">Approve</Button
						>
					</form>
					<form method="POST" action="?/bulkReject" use:enhance class="inline">
						{#each selectedIds as id}
							<input type="hidden" name="ids" value={id} />
						{/each}
						<Button type="submit" size="sm" variant="destructive">Reject</Button>
					</form>
					<AlertDialog.Root>
						<AlertDialog.Trigger>
							<Button size="sm" variant="destructive" type="button">Delete</Button>
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Delete {selectedIds.length} events?</AlertDialog.Title>
								<AlertDialog.Description
									>This cannot be undone. The selected events will be permanently deleted.</AlertDialog.Description
								>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<form
									method="POST"
									action="?/bulkDelete"
									use:enhance={() =>
										({ result, update }) => {
											if (result.type === 'success') toast.success('Events deleted');
											update();
										}}
									class="inline"
								>
									{#each selectedIds as id}
										<input type="hidden" name="ids" value={id} />
									{/each}
									<AlertDialog.Action
										type="submit"
										class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
									>
										Delete
									</AlertDialog.Action>
								</form>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</AlertDescription>
			</Alert>
		{/if}

		<div class="overflow-x-auto rounded-md border">
			<Table.Root class="min-w-[800px]">
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-10">
							<Checkbox
								checked={allSelected}
								onCheckedChange={(c) => setAllSelected(!!c)}
								aria-label="Select all"
							/>
						</Table.Head>
						<Table.Head>Title</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Org</Table.Head>
						<Table.Head>Start</Table.Head>
						<Table.Head class="max-w-[120px]">Submitted</Table.Head>
						<Table.Head>Source</Table.Head>
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
							<Table.Cell class="text-muted-foreground"
								>{event.organizationName ?? event.hostOrg ?? '—'}</Table.Cell
							>
							<Table.Cell class="text-muted-foreground">{event.startDate ?? '—'}</Table.Cell>
							<Table.Cell class="max-w-[120px] truncate text-xs text-muted-foreground">
								{#if event.createdAt}
									{new Date(event.createdAt).toLocaleDateString()}
									{#if event.submitterName || event.submitterEmail}
										<br /><span class="text-muted-foreground"
											>{event.submitterName ?? event.submitterEmail ?? 'Public'}</span
										>
									{/if}
								{:else}
									—
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">{event.source ?? '—'}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									<Button
										href="/admin/events/{event.id}"
										variant="ghost"
										size="icon-sm"
										title="Edit"
									>
										<Pencil class="h-4 w-4" />
									</Button>
									{#if event.slug}
										<Button
											href="/events/{event.slug}"
											variant="ghost"
											size="icon-sm"
											title="View"
											target="_blank"
										>
											<Eye class="h-4 w-4" />
										</Button>
									{/if}
									{#if event.contactEmail}
										<Button
											href="mailto:{event.contactEmail}"
											variant="ghost"
											size="icon-sm"
											title="Contact"
										>
											<Mail class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={8} class="h-24 text-center text-muted-foreground">
								No events found
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

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
	{/if}
</div>
