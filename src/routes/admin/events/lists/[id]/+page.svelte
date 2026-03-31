<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.list.title} | Event Lists | KB Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">List: {data.list.title}</h1>
		<div class="flex items-center gap-2">
			<a href="/events/feed.ics?list={data.list.slug}" target="_blank" rel="noopener noreferrer">
				<Button type="button" variant="outline">View iCal feed</Button>
			</a>
			<a href="/admin/events/lists"><Button variant="outline">Back to lists</Button></a>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>List details</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/updateList" use:enhance class="flex flex-wrap items-end gap-4">
				<div class="space-y-2">
					<Label for="title">Title</Label>
					<Input id="title" name="title" value={data.list.title} required />
				</div>
				<div class="space-y-2">
					<Label for="slug">Slug</Label>
					<Input id="slug" name="slug" value={data.list.slug} />
				</div>
				<Button type="submit">Update</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<Card.Title>Events in this list</Card.Title>
			<form method="POST" action="?/addEvent" use:enhance class="flex flex-wrap items-end gap-2">
				<Field.Field>
					<Field.Label for="eventId" class="sr-only">Event ID</Field.Label>
					<Field.Description class="sr-only">Paste an event UUID from the event edit URL</Field.Description>
					<Field.Content>
						<Input id="eventId" name="eventId" placeholder="Event UUID" class="w-64" />
					</Field.Content>
				</Field.Field>
				<Button type="submit">Add event</Button>
			</form>
		</Card.Header>
		<Card.Content class="overflow-x-auto">
			{#if data.listEvents.length === 0}
				<Empty.Root>
					<Empty.Header>
						<Empty.Title>No events in this list</Empty.Title>
						<Empty.Description>Add events by pasting an event UUID above (find it from the event edit URL).</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<Table.Root class="min-w-[400px]">
					<Table.Header>
						<Table.Row>
							<Table.Head>Title</Table.Head>
							<Table.Head>Slug</Table.Head>
							<Table.Head class="w-[100px]">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.listEvents as ev}
							<Table.Row>
								<Table.Cell>{ev.title ?? '—'}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{ev.slug}</Table.Cell>
								<Table.Cell>
									<span class="flex items-center gap-2">
										<a href="/admin/events/{ev.id}" class="text-sm text-primary hover:underline">Edit</a>
										<AlertDialog.Root>
											<AlertDialog.Trigger class="text-sm text-red-600 hover:underline">Remove</AlertDialog.Trigger>
											<AlertDialog.Content>
												<AlertDialog.Header>
													<AlertDialog.Title>Remove from list</AlertDialog.Title>
													<AlertDialog.Description>Remove this event from the list? The event itself is not deleted.</AlertDialog.Description>
												</AlertDialog.Header>
												<AlertDialog.Footer>
													<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
													<form method="POST" action="?/removeEvent" use:enhance>
														<input type="hidden" name="eventId" value={ev.id} />
														<AlertDialog.Action type="submit">Remove</AlertDialog.Action>
													</form>
												</AlertDialog.Footer>
											</AlertDialog.Content>
										</AlertDialog.Root>
									</span>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
