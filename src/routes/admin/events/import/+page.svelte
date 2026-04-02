<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	let { form } = $props();

	let allSelected = $state(true);

	function toggleAll() {
		allSelected = !allSelected;
		const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="selected"]');
		checkboxes.forEach((cb) => (cb.checked = allSelected));
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Import events from iCal</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>iCal URL</Card.Title>
			<Card.Description>Enter a public iCal feed URL to preview and import events.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/preview" use:enhance class="flex gap-2">
				<Label for="ical-url" class="sr-only">iCal URL</Label>
				<Input
					id="ical-url"
					name="url"
					type="url"
					required
					placeholder="https://example.com/events.ics"
					value={form?.url ?? ''}
					class="flex-1"
				/>
				<Button type="submit">Preview</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if form?.error}
		<Alert variant="destructive">
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	{#if form?.success}
		<Alert>
			<AlertTitle>Success</AlertTitle>
			<AlertDescription>Successfully imported {form.imported} event(s).</AlertDescription>
		</Alert>
	{/if}

	{#if form?.events && form.events.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Preview — {form.events.length} events</Card.Title>
				<Card.Description
					>Select events to import. They will be created as pending.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/import" use:enhance>
					<input type="hidden" name="events" value={JSON.stringify(form.events)} />

					<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
						<Button type="button" variant="ghost" size="sm" onclick={toggleAll}>
							{allSelected ? 'Deselect all' : 'Select all'}
						</Button>
						<Button type="submit" class="bg-green-600 hover:bg-green-700">Import selected</Button>
					</div>

					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-10">Import</Table.Head>
									<Table.Head>Title</Table.Head>
									<Table.Head>Start</Table.Head>
									<Table.Head>Location</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each form.events as event, i}
									<Table.Row>
										<Table.Cell>
											<input
												type="checkbox"
												name="selected"
												value={String(i)}
												checked={allSelected}
												aria-label="Import {event.title}"
												class="h-4 w-4 rounded border-input"
											/>
										</Table.Cell>
										<Table.Cell class="font-medium">{event.title}</Table.Cell>
										<Table.Cell class="text-muted-foreground">{event.startDate ?? '—'}</Table.Cell>
										<Table.Cell class="text-muted-foreground">{event.location ?? '—'}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
