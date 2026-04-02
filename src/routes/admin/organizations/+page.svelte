<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import { Pencil, Plus } from '@lucide/svelte';

	let { data } = $props();

	let searchValue = $state('');
	let newOrgOpen = $state(false);

	$effect(() => {
		searchValue = data.currentSearch;
	});

	function doSearch() {
		const url = new URL($page.url);
		url.searchParams.set('search', searchValue);
		goto(url);
	}
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Directory"
		title="Organizations"
		description="Organizations linked to events, jobs, and other content."
	>
		{#snippet actions()}
			<Button type="button" onclick={() => (newOrgOpen = !newOrgOpen)}>
				<Plus class="mr-2 h-4 w-4" />
				New organization
			</Button>
		{/snippet}
	</AdminPageHeader>

	<Collapsible.Root bind:open={newOrgOpen}>
		<Collapsible.Content>
			<Card.Root class="mb-2">
				<Card.Header>
					<Card.Title>New organization</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0">
					<form method="POST" action="?/createOrganization" use:enhance class="space-y-4">
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="org-name">Name *</Label>
								<Input id="org-name" name="name" type="text" required />
							</div>
							<div class="space-y-2">
								<Label for="org-type">Type</Label>
								<Input
									id="org-type"
									name="orgType"
									type="text"
									placeholder="e.g. Nonprofit, Foundation, Tribal organization"
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="org-desc">Description</Label>
							<Textarea id="org-desc" name="description" rows={2} />
						</div>
						<div class="grid gap-4 sm:grid-cols-3">
							<div class="space-y-2">
								<Label for="org-email">Email</Label>
								<Input id="org-email" name="email" type="email" />
							</div>
							<div class="space-y-2">
								<Label for="org-website">Website</Label>
								<Input id="org-website" name="website" type="url" />
							</div>
							<div class="space-y-2">
								<Label for="org-region">Region</Label>
								<Input id="org-region" name="region" type="text" />
							</div>
						</div>
						<Button type="submit">Create organization</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</Collapsible.Content>
	</Collapsible.Root>

	{#if data.organizations.length === 0 && !searchValue}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No organizations yet</Empty.Title>
				<Empty.Description>Add your first organization to link to events.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button type="button" onclick={() => (newOrgOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					New organization
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<div class="flex gap-2">
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
					placeholder="Search organizations..."
					class="max-w-sm"
				/>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
		</div>

		<Card.Root>
			<Card.Content class="p-0">
				<div class="overflow-x-auto rounded-md">
					<Table.Root class="min-w-[500px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Name</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Region</Table.Head>
								<Table.Head>Email</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.organizations as org}
								<Table.Row>
									<Table.Cell class="font-medium">{org.name}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{org.orgType ?? '—'}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{org.region ?? '—'}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{org.email ?? '—'}</Table.Cell>
									<Table.Cell class="text-right">
										<Button href="/admin/organizations/{org.id}" variant="ghost" size="icon-sm">
											<Pencil class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
										No organizations found
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
