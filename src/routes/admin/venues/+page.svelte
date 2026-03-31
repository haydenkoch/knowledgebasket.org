<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Pencil, Plus } from '@lucide/svelte';

	let { data } = $props();

	const initialSearch = data.currentSearch;
	let searchValue = $state(initialSearch);
	let newVenueOpen = $state(false);

	function doSearch() {
		const url = new URL($page.url);
		url.searchParams.set('search', searchValue);
		goto(url.toString());
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Venues</h1>

	{#if data.venues.length === 0 && !searchValue}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No venues yet</Empty.Title>
				<Empty.Description>Add your first venue to link to events.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button type="button" onclick={() => (newVenueOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					New venue
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
	<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-2">
		<Input type="text" bind:value={searchValue} placeholder="Search venues..." class="max-w-sm" />
		<Button type="submit" variant="secondary">Search</Button>
	</form>
	{/if}

	<Collapsible.Root bind:open={newVenueOpen}>
		<Card.Root>
			<Collapsible.Trigger class="w-full">
				<Card.Header class="flex flex-row items-center justify-between space-y-0">
					<Card.Title class="text-base">New venue</Card.Title>
					<Plus class="h-4 w-4" />
				</Card.Header>
			</Collapsible.Trigger>
			<Collapsible.Content>
			<Card.Content class="pt-0">
				<form method="POST" action="?/createVenue" use:enhance class="space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="venue-name">Name *</Label>
							<Input id="venue-name" name="name" type="text" required />
						</div>
						<div class="space-y-2">
							<Label for="venue-type">Type</Label>
							<Input id="venue-type" name="venueType" type="text" placeholder="e.g. theater, park" />
						</div>
					</div>
					<div class="grid gap-4 sm:grid-cols-3">
						<div class="space-y-2">
							<Label for="venue-address">Address</Label>
							<Input id="venue-address" name="address" type="text" />
						</div>
						<div class="space-y-2">
							<Label for="venue-city">City</Label>
							<Input id="venue-city" name="city" type="text" />
						</div>
						<div class="space-y-2">
							<Label for="venue-state">State</Label>
							<Input id="venue-state" name="state" type="text" />
						</div>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="venue-zip">Zip</Label>
							<Input id="venue-zip" name="zip" type="text" />
						</div>
						<div class="space-y-2">
							<Label for="venue-org">Organization</Label>
							<select id="venue-org" name="organizationId" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs">
								<option value="">None</option>
								{#each data.organizations as org}
									<option value={org.id}>{org.name}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="venue-website">Website</Label>
						<Input id="venue-website" name="website" type="url" />
					</div>
					<Button type="submit">Create</Button>
				</form>
			</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	{#if data.venues.length > 0 || searchValue}
	<Card.Root>
		<Card.Content class="p-0">
			<div class="overflow-x-auto rounded-md border">
				<Table.Root class="min-w-[500px]">
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head>City</Table.Head>
							<Table.Head>State</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.venues as venue}
							<Table.Row>
								<Table.Cell class="font-medium">{venue.name}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{venue.venueType ?? '—'}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{venue.city ?? '—'}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{venue.state ?? '—'}</Table.Cell>
								<Table.Cell class="text-right">
									<Button href="/admin/venues/{venue.id}" variant="ghost" size="icon-sm">
										<Pencil class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
									No venues found
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
