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
	import { Pencil, ExternalLink, Plus } from '@lucide/svelte';

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

	const statuses = ['all', 'draft', 'pending', 'published', 'rejected'];
	const statusLabels: Record<string, string> = {
		all: 'All',
		draft: 'Draft',
		pending: 'Pending',
		published: 'Published',
		rejected: 'Rejected'
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

	function goPage(nextPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(nextPage));
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
		selectedIds = checked ? data.businesses.map((item) => item.id) : [];
	}

	function setSelected(id: string, checked: boolean) {
		if (checked) selectedIds = [...selectedIds, id];
		else selectedIds = selectedIds.filter((entry) => entry !== id);
	}

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / 25)));
	const allSelected = $derived(
		data.businesses.length > 0 && selectedIds.length === data.businesses.length
	);
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Content"
		title="Red Pages"
		description="Review, edit, and publish Native business directory listings."
	>
		{#snippet actions()}
			<Button href="/admin/red-pages/new">
				<Plus class="mr-2 h-4 w-4" />
				Add listing
			</Button>
		{/snippet}
		{#snippet meta()}
			<span>{data.total} listing{data.total !== 1 ? 's' : ''} match current filter</span>
		{/snippet}
	</AdminPageHeader>

	{#if data.total === 0 && !data.currentSearch}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No Red Pages listings yet</Empty.Title>
				<Empty.Description>Create your first directory listing to get started.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/admin/red-pages/new">
					<Plus class="mr-2 h-4 w-4" />
					Add listing
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<AdminSectionCard title="Red Pages">
			{#snippet children()}
				<div class="space-y-4 px-5 py-4">
					<Tabs.Root value={data.currentStatus} onValueChange={applyFilter}>
						<Tabs.List>
							{#each statuses as status}
								<Tabs.Trigger value={status}>
									{statusLabels[status] ?? status}
									<span class="ml-1 text-[10px] opacity-70">
										({status === 'all' ? data.total : (data.statusCounts?.[status] ?? 0)})
									</span>
								</Tabs.Trigger>
							{/each}
						</Tabs.List>
					</Tabs.Root>

					<div class="flex flex-wrap items-center gap-3">
						<form
							onsubmit={(event) => {
								event.preventDefault();
								doSearch();
							}}
							class="flex gap-2"
						>
							<Input
								type="text"
								bind:value={searchValue}
								placeholder="Search listings…"
								class="max-w-xs"
							/>
							<Button type="submit" variant="secondary">Search</Button>
						</form>
						<div class="flex items-center gap-2 text-sm text-[var(--mid)]">
							<span>Sort</span>
							<NativeSelect.Root
								value={data.currentSort}
								onchange={(event) => applySort((event.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="updated">Last updated</NativeSelect.Option>
								<NativeSelect.Option value="name">Name</NativeSelect.Option>
							</NativeSelect.Root>
							<NativeSelect.Root
								value={data.currentOrder}
								onchange={(event) => applyOrder((event.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="desc">Newest first</NativeSelect.Option>
								<NativeSelect.Option value="asc">Oldest first</NativeSelect.Option>
							</NativeSelect.Root>
						</div>
					</div>

					{#if selectedIds.length > 0}
						<div
							class="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/60 px-4 py-3 text-sm"
						>
							<span class="font-medium text-[var(--dark)]">{selectedIds.length} selected</span>
							<button
								type="button"
								class="text-xs text-[var(--mid)] hover:underline"
								onclick={() => (selectedIds = [])}
							>
								Clear
							</button>
							<div class="ml-auto flex flex-wrap items-center gap-2">
								<form
									method="POST"
									action="?/bulkApprove"
									use:enhance={() =>
										({ result, update }) => {
											if (result.type === 'success') toast.success('Listings approved');
											update();
										}}
									class="contents"
								>
									{#each selectedIds as id}
										<input type="hidden" name="ids" value={id} />
									{/each}
									<Button type="submit" size="sm">Approve ({selectedIds.length})</Button>
								</form>
								<form
									method="POST"
									action="?/bulkReject"
									use:enhance={() =>
										({ result, update }) => {
											if (result.type === 'success') toast.success('Listings rejected');
											update();
										}}
									class="contents"
								>
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
											<AlertDialog.Title>
												Delete {selectedIds.length} listing{selectedIds.length === 1 ? '' : 's'}?
											</AlertDialog.Title>
											<AlertDialog.Description>
												This cannot be undone. The selected directory listings will be permanently
												deleted.
											</AlertDialog.Description>
										</AlertDialog.Header>
										<AlertDialog.Footer>
											<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
											<form
												method="POST"
												action="?/bulkDelete"
												use:enhance={() =>
													({ result, update }) => {
														if (result.type === 'success') toast.success('Listings deleted');
														update();
													}}
												class="contents"
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
							</div>
						</div>
					{/if}

					<div class="overflow-x-auto rounded-lg border border-[color:var(--rule)]">
						<Table.Root class="min-w-[920px]">
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-10">
										<Checkbox
											checked={allSelected}
											onCheckedChange={(checked) => setAllSelected(Boolean(checked))}
											aria-label="Select all directory listings"
										/>
									</Table.Head>
									<Table.Head>Name</Table.Head>
									<Table.Head>Affiliation</Table.Head>
									<Table.Head>Service type</Table.Head>
									<Table.Head>Region</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.businesses as item}
									<Table.Row>
										<Table.Cell>
											<Checkbox
												checked={selectedIds.includes(item.id)}
												onCheckedChange={(checked) => setSelected(item.id, Boolean(checked))}
												aria-label={`Select ${item.title}`}
											/>
										</Table.Cell>
										<Table.Cell>
											<div class="space-y-1">
												<div class="font-medium text-[var(--dark)]">{item.title}</div>
												<div class="text-xs text-[var(--mid)]">
													{item.verified ? 'Verified' : 'Unverified'}{#if item.website}
														· website{/if}
												</div>
											</div>
										</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{item.tribalAffiliation ?? '—'}
										</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{item.serviceType ?? '—'}
										</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{item.region ?? item.serviceArea ?? '—'}
										</Table.Cell>
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
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
											No directory listings found
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
							aria-label="Red Pages pagination"
						>
							{#snippet children({ pages, currentPage })}
								<Pagination.Content class="flex items-center justify-center gap-1">
									<Pagination.Item>
										<Pagination.Previous />
									</Pagination.Item>
									{#each pages as paginationPage (paginationPage.key)}
										{#if paginationPage.type === 'ellipsis'}
											<Pagination.Item>
												<Pagination.Ellipsis />
											</Pagination.Item>
										{:else}
											<Pagination.Item>
												<Pagination.Link
													page={paginationPage}
													isActive={currentPage === paginationPage.value}
												>
													{paginationPage.value}
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
