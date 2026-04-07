<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { formatDisplayDateTime } from '$lib/utils/display';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { Check, ChevronDown, GripVertical, MoveDown, MoveUp } from '@lucide/svelte';

	let { data } = $props();

	const initialOrderedEvents = () => data.listEvents;
	let orderedEvents = $state(initialOrderedEvents());
	let pickerOpen = $state(false);
	let selectedEventId = $state('');
	let selectedEventTitle = $state('Select a published event');
	let draggedId = $state<string | null>(null);

	$effect(() => {
		orderedEvents = data.listEvents;
	});

	function chooseEvent(eventId: string, title: string) {
		selectedEventId = eventId;
		selectedEventTitle = title;
		pickerOpen = false;
	}

	function moveEvent(index: number, direction: -1 | 1) {
		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= orderedEvents.length) return;
		const next = [...orderedEvents];
		const [item] = next.splice(index, 1);
		next.splice(nextIndex, 0, item);
		orderedEvents = next;
	}

	function handleDragStart(id: string) {
		draggedId = id;
	}

	function handleDrop(targetId: string) {
		if (!draggedId || draggedId === targetId) return;
		const next = [...orderedEvents];
		const fromIndex = next.findIndex((event) => event.id === draggedId);
		const toIndex = next.findIndex((event) => event.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;
		const [item] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, item);
		orderedEvents = next;
		draggedId = null;
	}
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
			<a href="/admin/events?tab=lists"><Button variant="outline">Back to lists</Button></a>
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
				<div class="flex min-w-[260px] flex-col gap-1.5">
					<Label>Add published event</Label>
					<input type="hidden" name="eventId" value={selectedEventId} />
					<Popover.Root bind:open={pickerOpen}>
						<Popover.Trigger
							class="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
						>
							<span class="truncate">{selectedEventTitle}</span>
							<ChevronDown class="h-4 w-4 opacity-60" />
						</Popover.Trigger>
						<Popover.Content class="w-[340px] p-0" align="end" sideOffset={6}>
							<Command.Root>
								<Command.Input placeholder="Search published events…" />
								<Command.List>
									<Command.Empty>No published events found.</Command.Empty>
									{#each data.publishedEvents as event}
										{@const alreadyAdded = orderedEvents.some((item) => item.id === event.id)}
										<Command.Item
											value={`${event.title} ${event.location ?? ''} ${event.startDate ?? ''}`}
											onSelect={() => !alreadyAdded && chooseEvent(event.id, event.title)}
											class={`flex items-center gap-2 ${alreadyAdded ? 'opacity-50' : ''}`}
										>
											<Check
												class={`h-4 w-4 ${selectedEventId === event.id ? 'opacity-100' : 'opacity-0'}`}
											/>
											<div class="min-w-0">
												<div class="truncate">{event.title}</div>
												<div class="text-xs text-[var(--mid)]">
													{formatDisplayDateTime(event.startDate, undefined, 'No date')} · {event.location ??
														event.region ??
														'No location'}
												</div>
											</div>
										</Command.Item>
									{/each}
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
				<Button type="submit">Add event</Button>
			</form>
		</Card.Header>
		<Card.Content class="overflow-x-auto">
			<div class="mb-4 flex justify-end">
				<form method="POST" action="?/reorder" use:enhance>
					<input
						type="hidden"
						name="orderedIds"
						value={orderedEvents.map((event) => event.id).join(',')}
					/>
					<Button type="submit" variant="secondary">Save order</Button>
				</form>
			</div>

			{#if orderedEvents.length === 0}
				<Empty.Root>
					<Empty.Header>
						<Empty.Title>No events in this list</Empty.Title>
						<Empty.Description>
							Add published events from the searchable picker above.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<Table.Root class="min-w-[760px]">
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[48px]">Order</Table.Head>
							<Table.Head>Title</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>When</Table.Head>
							<Table.Head>Slug</Table.Head>
							<Table.Head class="w-[180px] text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each orderedEvents as ev, index}
							<Table.Row
								draggable="true"
								ondragstart={() => handleDragStart(ev.id)}
								ondragover={(event) => event.preventDefault()}
								ondrop={() => handleDrop(ev.id)}
							>
								<Table.Cell>
									<div class="flex items-center gap-1">
										<GripVertical class="h-4 w-4 text-[var(--mid)]" />
										<div class="flex flex-col gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												onclick={() => moveEvent(index, -1)}
											>
												<MoveUp class="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												onclick={() => moveEvent(index, 1)}
											>
												<MoveDown class="h-4 w-4" />
											</Button>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>{ev.title ?? '—'}</Table.Cell>
								<Table.Cell>
									<StatusBadge status={ev.status ?? 'unknown'} />
								</Table.Cell>
								<Table.Cell class="text-sm text-[var(--mid)]">
									{formatDisplayDateTime(ev.startDate, undefined, 'No date')}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{ev.slug}</Table.Cell>
								<Table.Cell class="text-right">
									<span class="flex items-center justify-end gap-2">
										<a href="/admin/events/{ev.id}" class="text-sm text-primary hover:underline"
											>Edit</a
										>
										<AlertDialog.Root>
											<AlertDialog.Trigger class="text-sm text-red-600 hover:underline"
												>Remove</AlertDialog.Trigger
											>
											<AlertDialog.Content>
												<AlertDialog.Header>
													<AlertDialog.Title>Remove from list</AlertDialog.Title>
													<AlertDialog.Description
														>Remove this event from the list? The event itself is not deleted.</AlertDialog.Description
													>
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
