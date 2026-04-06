<script lang="ts" generics="T extends { id: string }">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
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
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';

	type QueueStatusOption = {
		value: string;
		label: string;
	};

	type QueueSortOption = {
		value: string;
		label: string;
	};

	interface Props {
		eyebrow?: string;
		title: string;
		description: string;
		items: T[];
		total: number;
		currentSearch?: string;
		currentStatus: string;
		currentPage: number;
		currentSort: string;
		currentOrder: string;
		statuses: QueueStatusOption[];
		statusCounts?: Record<string, number>;
		sortOptions: QueueSortOption[];
		searchPlaceholder: string;
		addHref: string;
		addLabel: string;
		emptyTitle: string;
		emptyDescription: string;
		sectionTitle: string;
		tableAriaLabel: string;
		columnCount: number;
		tableMinWidthClass?: string;
		pageSize?: number;
		itemLabelSingular: string;
		itemLabelPlural?: string;
		selectionLabel: (item: T) => string;
		approvedToast: string;
		rejectedToast: string;
		deletedToast: string;
		rejectPlaceholder?: string;
		deleteDescription?: string;
		metaText?: string;
		actions?: Snippet;
		headCells?: Snippet;
		rowCells?: Snippet<[T]>;
	}

	let {
		eyebrow = 'Content',
		title,
		description,
		items,
		total,
		currentSearch = '',
		currentStatus,
		currentPage,
		currentSort,
		currentOrder,
		statuses,
		statusCounts = {},
		sortOptions,
		searchPlaceholder,
		addHref,
		addLabel,
		emptyTitle,
		emptyDescription,
		sectionTitle,
		tableAriaLabel,
		columnCount,
		tableMinWidthClass = 'min-w-[920px]',
		pageSize = 25,
		itemLabelSingular,
		itemLabelPlural = `${itemLabelSingular}s`,
		selectionLabel,
		approvedToast,
		rejectedToast,
		deletedToast,
		rejectPlaceholder = 'Add a short reason (optional)',
		deleteDescription,
		metaText,
		actions: extraActions,
		headCells,
		rowCells
	}: Props = $props();

	let searchValue = $state('');
	let selectedIds: string[] = $state([]);
	const selectionResetKey = $derived.by(() =>
		[
			items.map((item) => item.id).join(','),
			currentPage,
			currentStatus,
			currentSearch,
			currentSort,
			currentOrder
		].join('|')
	);

	$effect(() => {
		searchValue = currentSearch ?? '';
	});

	$effect(() => {
		const resetKey = selectionResetKey;
		if (!resetKey && items.length === 0) return;
		selectedIds = [];
	});

	function applyFilter(status: string) {
		const url = new URL($page.url);
		url.searchParams.set('status', status);
		url.searchParams.set('page', '1');
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
		selectedIds = checked ? items.map((item) => item.id) : [];
	}

	function setSelected(id: string, checked: boolean) {
		if (checked) selectedIds = [...selectedIds, id];
		else selectedIds = selectedIds.filter((entry) => entry !== id);
	}

	function pluralizedLabel(count: number) {
		return count === 1 ? itemLabelSingular : itemLabelPlural;
	}

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const allSelected = $derived(items.length > 0 && selectedIds.length === items.length);
	const metaSummary = $derived(
		metaText ?? `${total} ${pluralizedLabel(total)} match current filter`
	);
	const startItem = $derived(total === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	const endItem = $derived(Math.min(total, currentPage * pageSize));
	const deleteMessage = $derived(
		deleteDescription ??
			`This cannot be undone. The selected ${pluralizedLabel(selectedIds.length)} will be permanently deleted.`
	);

	function buildPageHref(nextPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(nextPage));
		return `${url.pathname}${url.search}`;
	}
</script>

<div class="space-y-6">
	<AdminPageHeader {eyebrow} {title} {description}>
		{#snippet actions()}
			<Button href={addHref}>
				<Plus class="mr-2 h-4 w-4" />
				{addLabel}
			</Button>
			{#if extraActions}
				{@render extraActions()}
			{/if}
		{/snippet}
		{#snippet meta()}
			<span>{metaSummary}</span>
		{/snippet}
	</AdminPageHeader>

	{#if total === 0 && !currentSearch}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>{emptyTitle}</Empty.Title>
				<Empty.Description>{emptyDescription}</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href={addHref}>
					<Plus class="mr-2 h-4 w-4" />
					{addLabel}
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<AdminSectionCard title={sectionTitle}>
			{#snippet children()}
				<div class="space-y-4 px-5 py-4">
					<Tabs.Root value={currentStatus} onValueChange={applyFilter}>
						<Tabs.List>
							{#each statuses as status}
								<Tabs.Trigger value={status.value}>
									{status.label}
									<span class="ml-1 text-[10px] opacity-70">
										({status.value === 'all' ? total : (statusCounts?.[status.value] ?? 0)})
									</span>
								</Tabs.Trigger>
							{/each}
						</Tabs.List>
					</Tabs.Root>

					<div class="flex flex-wrap items-center gap-3">
						<form method="GET" class="flex gap-2">
							<input type="hidden" name="status" value={currentStatus} />
							<input type="hidden" name="sort" value={currentSort} />
							<input type="hidden" name="order" value={currentOrder} />
							<input type="hidden" name="page" value="1" />
							<Input
								type="text"
								name="search"
								bind:value={searchValue}
								placeholder={searchPlaceholder}
								class="max-w-xs"
							/>
							<Button type="submit" variant="secondary">Search</Button>
						</form>
						<div class="flex items-center gap-2 text-sm text-[var(--mid)]">
							<span>Sort</span>
							<NativeSelect.Root
								value={currentSort}
								onchange={(event) => applySort((event.target as HTMLSelectElement).value)}
							>
								{#each sortOptions as option}
									<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
								{/each}
							</NativeSelect.Root>
							<NativeSelect.Root
								value={currentOrder}
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
											if (result.type === 'success') toast.success(approvedToast);
											update();
										}}
									class="contents"
								>
									{#each selectedIds as id}
										<input type="hidden" name="ids" value={id} />
									{/each}
									<Button type="submit" size="sm">Approve ({selectedIds.length})</Button>
								</form>
								<AlertDialog.Root>
									<AlertDialog.Trigger>
										<Button type="button" size="sm" variant="outline">Reject</Button>
									</AlertDialog.Trigger>
									<AlertDialog.Content>
										<AlertDialog.Header>
											<AlertDialog.Title>
												Reject {selectedIds.length}
												{pluralizedLabel(selectedIds.length)}?
											</AlertDialog.Title>
											<AlertDialog.Description>
												Add a rejection reason if the moderator should keep context for this
												decision.
											</AlertDialog.Description>
										</AlertDialog.Header>
										<form
											method="POST"
											action="?/bulkReject"
											use:enhance={() =>
												({ result, update }) => {
													if (result.type === 'success') toast.success(rejectedToast);
													update();
												}}
											class="space-y-3"
										>
											{#each selectedIds as id}
												<input type="hidden" name="ids" value={id} />
											{/each}
											<textarea
												name="reason"
												rows="3"
												class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
												placeholder={rejectPlaceholder}
											></textarea>
											<AlertDialog.Footer>
												<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
												<AlertDialog.Action type="submit">Reject</AlertDialog.Action>
											</AlertDialog.Footer>
										</form>
									</AlertDialog.Content>
								</AlertDialog.Root>
								<AlertDialog.Root>
									<AlertDialog.Trigger>
										<Button size="sm" variant="destructive" type="button">Delete</Button>
									</AlertDialog.Trigger>
									<AlertDialog.Content>
										<AlertDialog.Header>
											<AlertDialog.Title>
												Delete {selectedIds.length}
												{pluralizedLabel(selectedIds.length)}?
											</AlertDialog.Title>
											<AlertDialog.Description>{deleteMessage}</AlertDialog.Description>
										</AlertDialog.Header>
										<AlertDialog.Footer>
											<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
											<form
												method="POST"
												action="?/bulkDelete"
												use:enhance={() =>
													({ result, update }) => {
														if (result.type === 'success') toast.success(deletedToast);
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
						<Table.Root class={tableMinWidthClass} aria-label={tableAriaLabel}>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-10">
										<Checkbox
											checked={allSelected}
											onCheckedChange={(checked) => setAllSelected(Boolean(checked))}
											aria-label={`Select all ${itemLabelPlural}`}
										/>
									</Table.Head>
									{#if headCells}
										{@render headCells()}
									{/if}
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each items as item}
									<Table.Row>
										<Table.Cell>
											<Checkbox
												checked={selectedIds.includes(item.id)}
												onCheckedChange={(checked) => setSelected(item.id, Boolean(checked))}
												aria-label={selectionLabel(item)}
											/>
										</Table.Cell>
										{#if rowCells}
											{@render rowCells(item)}
										{/if}
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell
											colspan={columnCount}
											class="h-24 text-center text-muted-foreground"
										>
											No {itemLabelPlural} found
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<div
						class="flex flex-col gap-3 text-sm text-[var(--mid)] sm:flex-row sm:items-center sm:justify-between"
					>
						<span>Showing {startItem}-{endItem} of {total} {pluralizedLabel(total)}</span>
						{#if totalPages > 1}
							<div class="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									href={currentPage > 1 ? buildPageHref(currentPage - 1) : undefined}
									disabled={currentPage <= 1}
								>
									Previous
								</Button>
								<span>Page {currentPage} of {totalPages}</span>
								<Button
									variant="outline"
									size="sm"
									href={currentPage < totalPages ? buildPageHref(currentPage + 1) : undefined}
									disabled={currentPage >= totalPages}
								>
									Next
								</Button>
							</div>
						{/if}
					</div>
				</div>
			{/snippet}
		</AdminSectionCard>
	{/if}
</div>
