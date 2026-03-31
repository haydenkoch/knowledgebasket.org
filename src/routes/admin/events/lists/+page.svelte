<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Event Lists | KB Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Event Lists</h1>
	<p class="text-muted-foreground">Curated lists (e.g. Featured) shown on the events page. Add events to a list to control order and visibility in sections.</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Create list</Card.Title>
			<Card.Description>New list slug will be used in the public feed (e.g. featured).</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-4">
				<div class="space-y-2">
					<Label for="title">Title</Label>
					<Input id="title" name="title" placeholder="e.g. Featured" required />
				</div>
				<div class="space-y-2">
					<Label for="slug">Slug</Label>
					<Input id="slug" name="slug" placeholder="featured" />
				</div>
				<Button type="submit">Create list</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>All lists</Card.Title>
		</Card.Header>
		<Card.Content class="overflow-x-auto">
			{#if data.lists.length === 0}
				<Empty.Root>
					<Empty.Header>
						<Empty.Title>No lists yet</Empty.Title>
						<Empty.Description>Create your first list above (e.g. "Featured" with slug "featured") to curate events for the site.</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<Table.Root class="min-w-[300px]">
					<Table.Header>
						<Table.Row>
							<Table.Head>Title</Table.Head>
							<Table.Head>Slug</Table.Head>
							<Table.Head class="w-[100px]">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.lists as list}
							<Table.Row>
								<Table.Cell>{list.title}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{list.slug}</Table.Cell>
								<Table.Cell>
									<a href="/admin/events/lists/{list.id}"><Button variant="secondary" size="sm">Edit</Button></a>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
