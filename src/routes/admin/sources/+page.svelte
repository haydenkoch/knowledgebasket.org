<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Database, Pencil, Plus } from '@lucide/svelte';

	let { data } = $props();

	let searchValue = $state('');
	let createOpen = $state(false);

	$effect(() => {
		searchValue = data.currentSearch ?? '';
	});

	const coilOptions = [
		{ value: 'events', label: 'Events' },
		{ value: 'funding', label: 'Funding' },
		{ value: 'jobs', label: 'Jobs' },
		{ value: 'red_pages', label: 'Red Pages' },
		{ value: 'toolbox', label: 'Toolbox' }
	];

	const statusOptions = [
		'all',
		'discovered',
		'configuring',
		'active',
		'paused',
		'deprecated',
		'disabled',
		'manual_only'
	];

	const healthOptions = [
		'all',
		'healthy',
		'degraded',
		'unhealthy',
		'stale',
		'broken',
		'auth_required',
		'unknown'
	];

	function applyFilter(key: string, value: string) {
		const url = new URL($page.url);
		url.searchParams.set(key, value);
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

	function badgeClass(kind: 'status' | 'health' | 'enabled', value: string | boolean) {
		if (kind === 'enabled') {
			return value
				? 'border-emerald-200 bg-emerald-50 text-emerald-700'
				: 'border-slate-200 bg-slate-50 text-slate-600';
		}

		const lookup: Record<string, string> = {
			active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
			healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
			discovered: 'border-sky-200 bg-sky-50 text-sky-700',
			configuring: 'border-sky-200 bg-sky-50 text-sky-700',
			manual_only: 'border-indigo-200 bg-indigo-50 text-indigo-700',
			paused: 'border-amber-200 bg-amber-50 text-amber-700',
			degraded: 'border-amber-200 bg-amber-50 text-amber-700',
			stale: 'border-orange-200 bg-orange-50 text-orange-700',
			unhealthy: 'border-rose-200 bg-rose-50 text-rose-700',
			broken: 'border-rose-200 bg-rose-50 text-rose-700',
			auth_required: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
			deprecated: 'border-slate-200 bg-slate-50 text-slate-600',
			disabled: 'border-slate-200 bg-slate-50 text-slate-600',
			unknown: 'border-slate-200 bg-slate-50 text-slate-600'
		};

		return lookup[String(value)] ?? 'border-slate-200 bg-slate-50 text-slate-600';
	}

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / 25)));
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold">Sources</h1>
			<p class="text-sm text-muted-foreground">
				Manage source registry entries and monitor ingestion readiness.
			</p>
		</div>
		<Button type="button" onclick={() => (createOpen = !createOpen)}>
			<Plus class="mr-2 h-4 w-4" />
			New source
		</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Total sources</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-semibold">{data.healthSummary.total}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Enabled</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-semibold">{data.healthSummary.enabled}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Active</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-semibold">{data.healthSummary.active}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-base">Needs review</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl font-semibold">{data.healthSummary.reviewRequired}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Collapsible.Root bind:open={createOpen}>
		<Card.Root>
			<Collapsible.Trigger class="w-full">
				<Card.Header class="flex flex-row items-center justify-between space-y-0">
					<div>
						<Card.Title class="text-base">Create source</Card.Title>
						<Card.Description>Add a registry entry for a new ingestion source.</Card.Description>
					</div>
					<Database class="h-4 w-4" />
				</Card.Header>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content class="pt-0">
					<form
						method="POST"
						action="?/createSource"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success') {
									toast.success('Source created');
									createOpen = false;
								} else if (result.type === 'failure') {
									toast.error((result.data as { error?: string })?.error ?? 'Create failed');
								}
								await update();
							};
						}}
						class="space-y-4"
					>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="name">Name *</Label>
								<Input id="name" name="name" required />
							</div>
							<div class="space-y-2">
								<Label for="sourceUrl">Source URL *</Label>
								<Input id="sourceUrl" name="sourceUrl" type="url" required />
							</div>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="homepageUrl">Homepage URL</Label>
								<Input id="homepageUrl" name="homepageUrl" type="url" />
							</div>
							<div class="space-y-2">
								<Label for="ingestionMethod">Ingestion method</Label>
								<NativeSelect.Root id="ingestionMethod" name="ingestionMethod">
									<NativeSelect.Option value="manual_only">Manual only</NativeSelect.Option>
									<NativeSelect.Option value="manual_with_reminder">
										Manual with reminder
									</NativeSelect.Option>
									<NativeSelect.Option value="rss_import">RSS import</NativeSelect.Option>
									<NativeSelect.Option value="ical_import">iCal import</NativeSelect.Option>
									<NativeSelect.Option value="api_import">API import</NativeSelect.Option>
									<NativeSelect.Option value="html_scrape">HTML scrape</NativeSelect.Option>
									<NativeSelect.Option value="directory_sync">Directory sync</NativeSelect.Option>
									<NativeSelect.Option value="document_extraction">
										Document extraction
									</NativeSelect.Option>
									<NativeSelect.Option value="newsletter_triage">
										Newsletter triage
									</NativeSelect.Option>
									<NativeSelect.Option value="hybrid">Hybrid</NativeSelect.Option>
								</NativeSelect.Root>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea id="description" name="description" rows={3} />
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="sourceCategory">Category</Label>
								<NativeSelect.Root id="sourceCategory" name="sourceCategory">
									<NativeSelect.Option value="">Unspecified</NativeSelect.Option>
									<NativeSelect.Option value="government_federal">Government (Federal)</NativeSelect.Option>
									<NativeSelect.Option value="government_state">Government (State)</NativeSelect.Option>
									<NativeSelect.Option value="government_tribal">Government (Tribal)</NativeSelect.Option>
									<NativeSelect.Option value="nonprofit">Nonprofit</NativeSelect.Option>
									<NativeSelect.Option value="foundation">Foundation</NativeSelect.Option>
									<NativeSelect.Option value="aggregator">Aggregator</NativeSelect.Option>
									<NativeSelect.Option value="news_media">News media</NativeSelect.Option>
									<NativeSelect.Option value="academic">Academic</NativeSelect.Option>
									<NativeSelect.Option value="professional_association">
										Professional association
									</NativeSelect.Option>
									<NativeSelect.Option value="private_business">Private business</NativeSelect.Option>
									<NativeSelect.Option value="community">Community</NativeSelect.Option>
								</NativeSelect.Root>
							</div>
							<div class="space-y-2">
								<Label>Coils</Label>
								<div class="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
									{#each coilOptions as coil}
										<label class="flex items-center gap-2">
											<input type="checkbox" name="coils" value={coil.value} />
											<span>{coil.label}</span>
										</label>
									{/each}
								</div>
							</div>
						</div>
						<div class="flex flex-wrap gap-4 text-sm">
							<label class="flex items-center gap-2">
								<input type="checkbox" name="enabled" />
								<span>Enabled</span>
							</label>
							<label class="flex items-center gap-2">
								<input type="checkbox" name="autoApprove" />
								<span>Auto approve candidates</span>
							</label>
						</div>
						<Button type="submit">Create source</Button>
					</form>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	{#if data.sources.length === 0 && !data.currentSearch}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No sources yet</Empty.Title>
				<Empty.Description>Create your first source to start building the registry.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button type="button" onclick={() => (createOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					New source
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<Card.Root>
			<Card.Content class="space-y-4 p-4">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<form
						onsubmit={(event) => {
							event.preventDefault();
							doSearch();
						}}
						class="flex w-full max-w-md gap-2"
					>
						<Input
							type="text"
							bind:value={searchValue}
							placeholder="Search name, slug, or URL..."
						/>
						<Button type="submit" variant="secondary">Search</Button>
					</form>
					<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
						<NativeSelect.Root
							value={data.currentStatus}
							onchange={(event) =>
								applyFilter('status', (event.target as HTMLSelectElement).value)}
						>
							{#each statusOptions as option}
								<NativeSelect.Option value={option}>
									{option === 'all' ? 'All statuses' : option.replace(/_/g, ' ')}
								</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
						<NativeSelect.Root
							value={data.currentHealthStatus}
							onchange={(event) =>
								applyFilter('healthStatus', (event.target as HTMLSelectElement).value)}
						>
							{#each healthOptions as option}
								<NativeSelect.Option value={option}>
									{option === 'all' ? 'All health states' : option.replace(/_/g, ' ')}
								</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
						<NativeSelect.Root
							value={data.currentEnabled}
							onchange={(event) =>
								applyFilter('enabled', (event.target as HTMLSelectElement).value)}
						>
							<NativeSelect.Option value="all">All enabled states</NativeSelect.Option>
							<NativeSelect.Option value="true">Enabled only</NativeSelect.Option>
							<NativeSelect.Option value="false">Disabled only</NativeSelect.Option>
						</NativeSelect.Root>
						<NativeSelect.Root
							value={data.currentCoil}
							onchange={(event) => applyFilter('coil', (event.target as HTMLSelectElement).value)}
						>
							<NativeSelect.Option value="all">All coils</NativeSelect.Option>
							{#each coilOptions as coil}
								<NativeSelect.Option value={coil.value}>{coil.label}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</div>
				</div>

				<div class="rounded-md border">
					<div class="overflow-x-auto">
						<Table.Root class="min-w-[980px]">
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Health</Table.Head>
									<Table.Head>Enabled</Table.Head>
									<Table.Head>Coils</Table.Head>
									<Table.Head>Owner</Table.Head>
									<Table.Head>Last checked</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.sources as source}
									<Table.Row>
										<Table.Cell>
											<div class="font-medium">{source.name}</div>
											<div class="text-xs text-muted-foreground">{source.slug}</div>
										</Table.Cell>
										<Table.Cell>
											<span class={`inline-flex rounded-full border px-2 py-0.5 text-xs ${badgeClass('status', source.status)}`}>
												{source.status.replace(/_/g, ' ')}
											</span>
										</Table.Cell>
										<Table.Cell>
											<span class={`inline-flex rounded-full border px-2 py-0.5 text-xs ${badgeClass('health', source.healthStatus)}`}>
												{source.healthStatus.replace(/_/g, ' ')}
											</span>
										</Table.Cell>
										<Table.Cell>
											<span class={`inline-flex rounded-full border px-2 py-0.5 text-xs ${badgeClass('enabled', source.enabled)}`}>
												{source.enabled ? 'Enabled' : 'Disabled'}
											</span>
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-wrap gap-1">
												{#if source.coils.length > 0}
													{#each source.coils as coil}
														<span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
															{coil.replace(/_/g, ' ')}
														</span>
													{/each}
												{:else}
													<span class="text-xs text-muted-foreground">None</span>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">
											{source.ownerName ?? source.ownerEmail ?? '—'}
										</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">
											{source.lastCheckedAt ? source.lastCheckedAt.toLocaleString() : 'Never'}
										</Table.Cell>
										<Table.Cell class="text-right">
											<Button href={`/admin/sources/${source.id}`} variant="ghost" size="icon-sm">
												<Pencil class="h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={8} class="h-24 text-center text-muted-foreground">
											No sources found
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>

				<div class="flex items-center justify-between text-sm text-muted-foreground">
					<span>{data.total} total sources</span>
					<div class="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={data.currentPage <= 1}
							onclick={() => goPage(data.currentPage - 1)}
						>
							Previous
						</Button>
						<span>Page {data.currentPage} of {totalPages}</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={data.currentPage >= totalPages}
							onclick={() => goPage(data.currentPage + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
