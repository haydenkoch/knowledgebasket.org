<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import AdminStatCard from '$lib/components/organisms/admin/AdminStatCard.svelte';
	import HealthBadge from '$lib/components/organisms/admin/HealthBadge.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { Pencil, Plus } from '@lucide/svelte';
	import { friendly, timeAgo, sourceStatusLabel, coilLabel } from '$lib/admin/labels.js';

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

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / 25)));
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Sources"
		title="All sources"
		description="Manage the registry of content sources. Each source feeds one or more content types."
	>
		{#snippet actions()}
			<Button type="button" onclick={() => (createOpen = !createOpen)}>
				<Plus class="mr-2 h-4 w-4" />
				Add source
			</Button>
		{/snippet}
		{#snippet meta()}
			<span>{data.healthSummary.total} sources total</span>
			<span>{data.healthSummary.enabled} enabled</span>
			<span>{data.healthSummary.active} active</span>
		{/snippet}
	</AdminPageHeader>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<AdminStatCard label="Total sources" value={data.healthSummary.total} href="/admin/sources" tone="lake" />
		<AdminStatCard label="Enabled" value={data.healthSummary.enabled} href="/admin/sources?enabled=true" tone="forest" />
		<AdminStatCard label="Active" value={data.healthSummary.active} href="/admin/sources?status=active" tone="gold" />
		<AdminStatCard label="Flagged for review" value={data.healthSummary.reviewRequired} href="/admin/sources/health" tone="ember" />
	</div>

	<!-- Add source dialog -->
	<Dialog.Root bind:open={createOpen}>
		<Dialog.Content class="max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Add a source</Dialog.Title>
				<Dialog.Description>Register a new content source in the system.</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/createSource"
				use:enhance={() => async ({ result, update }) => {
					if (result.type === 'success') {
						toast.success('Source created');
						createOpen = false;
					} else if (result.type === 'failure') {
						toast.error((result.data as { error?: string })?.error ?? 'Create failed');
					}
					await update();
				}}
				class="space-y-6"
			>
				<div class="space-y-4">
					<p class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">Basic info</p>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="name">Name <span class="text-[var(--color-ember-600)]">*</span></Label>
							<Input id="name" name="name" required placeholder="e.g. NCAI Events Calendar" />
						</div>
						<div class="space-y-2">
							<Label for="sourceUrl">Feed or source URL <span class="text-[var(--color-ember-600)]">*</span></Label>
							<Input id="sourceUrl" name="sourceUrl" type="url" required placeholder="https://…" />
						</div>
					</div>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="homepageUrl">Homepage URL</Label>
							<Input id="homepageUrl" name="homepageUrl" type="url" placeholder="https://…" />
						</div>
						<div class="space-y-2">
							<Label for="sourceCategory">Organization type</Label>
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
								<NativeSelect.Option value="professional_association">Professional association</NativeSelect.Option>
								<NativeSelect.Option value="private_business">Private business</NativeSelect.Option>
								<NativeSelect.Option value="community">Community</NativeSelect.Option>
							</NativeSelect.Root>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="description">Description</Label>
						<Textarea id="description" name="description" rows={3} placeholder="What does this source publish? Who runs it?" />
					</div>
				</div>

				<div class="space-y-4">
					<p class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">How it's imported</p>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="ingestionMethod">Import method</Label>
							<NativeSelect.Root id="ingestionMethod" name="ingestionMethod">
								<NativeSelect.Option value="manual_only">Manual entry</NativeSelect.Option>
								<NativeSelect.Option value="manual_with_reminder">Manual with reminders</NativeSelect.Option>
								<NativeSelect.Option value="rss_import">RSS feed</NativeSelect.Option>
								<NativeSelect.Option value="ical_import">Calendar feed</NativeSelect.Option>
								<NativeSelect.Option value="api_import">API connection</NativeSelect.Option>
								<NativeSelect.Option value="html_scrape">Web page import</NativeSelect.Option>
								<NativeSelect.Option value="directory_sync">Directory sync</NativeSelect.Option>
								<NativeSelect.Option value="document_extraction">Document parsing</NativeSelect.Option>
								<NativeSelect.Option value="newsletter_triage">Email / newsletter</NativeSelect.Option>
								<NativeSelect.Option value="hybrid">Mixed methods</NativeSelect.Option>
							</NativeSelect.Root>
						</div>
						<div class="space-y-2">
							<Label>Content types</Label>
							<div class="grid grid-cols-2 gap-2 rounded-lg border border-[color:var(--rule)] p-3 text-sm">
								{#each coilOptions as coil}
									<label class="flex cursor-pointer items-center gap-2">
										<input type="checkbox" name="coils" value={coil.value} class="rounded" />
										<span>{coil.label}</span>
									</label>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<div class="space-y-3">
					<p class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">Settings</p>
					<div class="flex flex-wrap gap-5 text-sm">
						<label class="flex cursor-pointer items-center gap-2">
							<input type="checkbox" name="enabled" class="rounded" />
							<span class="font-medium">Enable this source</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="checkbox" name="autoApprove" class="rounded" />
							<span class="font-medium">Auto-approve new items</span>
						</label>
					</div>
				</div>

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
					<Button type="submit">Create source</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>


	{#if data.sources.length === 0 && !data.currentSearch}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No sources yet</Empty.Title>
				<Empty.Description>Add your first source to start building the registry.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button type="button" onclick={() => (createOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					Add source
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<AdminSectionCard title="Sources">
			{#snippet children()}
				<div class="space-y-4 px-5 py-4">
					<!-- Search + filters -->
					<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<form
							onsubmit={(e) => { e.preventDefault(); doSearch(); }}
							class="flex w-full max-w-md gap-2"
						>
							<Input type="text" bind:value={searchValue} placeholder="Search sources…" />
							<Button type="submit" variant="secondary">Search</Button>
						</form>
						<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
							<NativeSelect.Root
								value={data.currentStatus}
								onchange={(e) => applyFilter('status', (e.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="all">All statuses</NativeSelect.Option>
								<NativeSelect.Option value="discovered">Discovered</NativeSelect.Option>
								<NativeSelect.Option value="configuring">Setting up</NativeSelect.Option>
								<NativeSelect.Option value="active">Active</NativeSelect.Option>
								<NativeSelect.Option value="paused">Paused</NativeSelect.Option>
								<NativeSelect.Option value="deprecated">Phasing out</NativeSelect.Option>
								<NativeSelect.Option value="disabled">Disabled</NativeSelect.Option>
								<NativeSelect.Option value="manual_only">Manual only</NativeSelect.Option>
							</NativeSelect.Root>
							<NativeSelect.Root
								value={data.currentHealthStatus}
								onchange={(e) => applyFilter('healthStatus', (e.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="all">All health states</NativeSelect.Option>
								<NativeSelect.Option value="healthy">Healthy</NativeSelect.Option>
								<NativeSelect.Option value="degraded">Needs attention</NativeSelect.Option>
								<NativeSelect.Option value="stale">Stale</NativeSelect.Option>
								<NativeSelect.Option value="broken">Broken</NativeSelect.Option>
								<NativeSelect.Option value="auth_required">Auth needed</NativeSelect.Option>
								<NativeSelect.Option value="unhealthy">Unhealthy</NativeSelect.Option>
								<NativeSelect.Option value="unknown">Unknown</NativeSelect.Option>
							</NativeSelect.Root>
							<NativeSelect.Root
								value={data.currentEnabled}
								onchange={(e) => applyFilter('enabled', (e.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="all">Enabled or disabled</NativeSelect.Option>
								<NativeSelect.Option value="true">Enabled only</NativeSelect.Option>
								<NativeSelect.Option value="false">Disabled only</NativeSelect.Option>
							</NativeSelect.Root>
							<NativeSelect.Root
								value={data.currentCoil}
								onchange={(e) => applyFilter('coil', (e.target as HTMLSelectElement).value)}
							>
								<NativeSelect.Option value="all">All content types</NativeSelect.Option>
								{#each coilOptions as coil}
									<NativeSelect.Option value={coil.value}>{coil.label}</NativeSelect.Option>
								{/each}
							</NativeSelect.Root>
						</div>
					</div>

					<!-- Table -->
					<div class="overflow-x-auto rounded-lg border border-[color:var(--rule)]">
						<Table.Root class="min-w-[900px]">
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Health</Table.Head>
									<Table.Head>Enabled</Table.Head>
									<Table.Head>Content types</Table.Head>
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
											{#if source.homepageUrl}
												<a href={source.homepageUrl} target="_blank" rel="noreferrer" class="text-xs text-[var(--mid)] hover:underline">{source.homepageUrl}</a>
											{/if}
										</Table.Cell>
										<Table.Cell>
											<StatusBadge status={source.status} />
										</Table.Cell>
										<Table.Cell>
											<HealthBadge health={source.healthStatus} />
										</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{source.enabled ? 'Yes' : 'No'}
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-wrap gap-1">
												{#if source.coils.length > 0}
													{#each source.coils as coil}
														<span class="inline-flex rounded-full border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)] px-2 py-0.5 text-xs text-[var(--mid)]">
															{friendly(coilLabel, coil)}
														</span>
													{/each}
												{:else}
													<span class="text-xs text-[var(--mid)]">None</span>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{source.ownerName ?? source.ownerEmail ?? '—'}
										</Table.Cell>
										<Table.Cell class="text-sm text-[var(--mid)]">
											{timeAgo(source.lastCheckedAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<Button href={`/admin/sources/${source.id}`} variant="ghost" size="icon-sm">
												<Pencil class="h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={8} class="h-24 text-center text-[var(--mid)]">
											No sources match these filters.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<!-- Pagination -->
					<div class="flex items-center justify-between text-sm text-[var(--mid)]">
						<span>Showing {data.sources.length} of {data.total} sources</span>
						<div class="flex items-center gap-2">
							<Button type="button" variant="outline" size="sm" disabled={data.currentPage <= 1} onclick={() => goPage(data.currentPage - 1)}>
								Previous
							</Button>
							<span>Page {data.currentPage} of {totalPages}</span>
							<Button type="button" variant="outline" size="sm" disabled={data.currentPage >= totalPages} onclick={() => goPage(data.currentPage + 1)}>
								Next
							</Button>
						</div>
					</div>
				</div>
			{/snippet}
		</AdminSectionCard>
	{/if}
</div>
