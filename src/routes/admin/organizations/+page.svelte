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
		goto(url.toString());
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Organizations</h1>

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
	{/if}

	<Collapsible.Root bind:open={newOrgOpen}>
		<Card.Root>
			<Collapsible.Trigger class="w-full">
				<Card.Header class="flex flex-row items-center justify-between space-y-0">
					<Card.Title class="text-base">New organization</Card.Title>
					<Plus class="h-4 w-4" />
				</Card.Header>
			</Collapsible.Trigger>
			<Collapsible.Content>
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
									placeholder="e.g. nonprofit, tribal"
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
						<Button type="submit">Create</Button>
					</form>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	{#if data.organizations.length > 0 || searchValue}
		<Card.Root>
			<Card.Content class="p-0">
				<div class="rounded-md border">
					<div class="overflow-x-auto">
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
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
