<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	type Tag = { id: string; slug: string; label: string; group: string; sortOrder: number };
	type Option = { id: string; key: string; value: string; label: string; sortOrder: number };

	let { data } = $props();

	const tagGroups = [
		{ value: 'event_type', label: 'Event type' },
		{ value: 'topic', label: 'Topic' },
		{ value: 'custom', label: 'Custom' }
	];

	const optionKeys = [
		{ value: 'region', label: 'Region' },
		{ value: 'audience', label: 'Audience' },
		{ value: 'cost', label: 'Cost' }
	];

	const tags = $derived((data?.tags ?? []) as Tag[]);
	const options = $derived((data?.options ?? []) as Option[]);

	const optionsByKey = $derived(
		optionKeys.map((k) => ({
			key: k.value,
			label: k.label,
			items: options.filter((o) => o.key === k.value)
		}))
	);
</script>

<svelte:head>
	<title>Taxonomies | KB Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Taxonomies</h1>
	<p class="text-muted-foreground">
		Manage tags (event types, topics) and dropdown options (region, audience, cost) used in event
		forms.
	</p>

	<Tabs.Root value="tags" class="w-full">
		<Tabs.List class="grid w-full max-w-md grid-cols-2">
			<Tabs.Trigger value="tags">Tags</Tabs.Trigger>
			<Tabs.Trigger value="options">Options</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="tags" class="space-y-4">
			<Card.Root>
				<Card.Header class="flex flex-row flex-wrap items-end justify-between gap-4">
					<div>
						<Card.Title>Tags</Card.Title>
						<Card.Description>Event types and topics for tagging events.</Card.Description>
					</div>
					<form
						method="POST"
						action="?/createTag"
						use:enhance
						class="flex flex-wrap items-end gap-2"
					>
						<Field.Field class="flex-row items-end gap-2">
							<Field.Label for="new-tag-label" class="sr-only">New tag label</Field.Label>
							<Field.Content>
								<Input id="new-tag-label" name="label" placeholder="New tag label" class="w-40" />
							</Field.Content>
							<Field.Label for="new-tag-group" class="sr-only">Group</Field.Label>
							<Field.Content>
								<NativeSelect.Root id="new-tag-group" name="group" class="w-36">
									{#each tagGroups as g}
										<NativeSelect.Option value={g.value}>{g.label}</NativeSelect.Option>
									{/each}
								</NativeSelect.Root>
							</Field.Content>
						</Field.Field>
						<Button type="submit">Add</Button>
					</form>
				</Card.Header>
				<Card.Content class="overflow-x-auto">
					<Table.Root class="min-w-[400px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Label</Table.Head>
								<Table.Head>Slug</Table.Head>
								<Table.Head>Group</Table.Head>
								<Table.Head class="w-[100px]">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each tags as tag}
								<Table.Row>
									<Table.Cell>{tag.label}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{tag.slug}</Table.Cell>
									<Table.Cell>{tag.group}</Table.Cell>
									<Table.Cell>
										<AlertDialog.Root>
											<AlertDialog.Trigger
												class="inline-flex h-8 items-center rounded border border-red-200 px-2 text-sm text-red-700 hover:bg-red-50"
											>
												Delete
											</AlertDialog.Trigger>
											<AlertDialog.Content>
												<AlertDialog.Header>
													<AlertDialog.Title>Delete tag</AlertDialog.Title>
													<AlertDialog.Description
														>Remove “{tag.label}”? This does not remove it from existing events.</AlertDialog.Description
													>
												</AlertDialog.Header>
												<AlertDialog.Footer>
													<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
													<form method="POST" action="?/deleteTag" use:enhance>
														<input type="hidden" name="id" value={tag.id} />
														<AlertDialog.Action type="submit">Delete</AlertDialog.Action>
													</form>
												</AlertDialog.Footer>
											</AlertDialog.Content>
										</AlertDialog.Root>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
					{#if tags.length === 0}
						<p class="py-4 text-sm text-muted-foreground">
							No tags yet. Add one above or refresh to seed from defaults.
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
		<Tabs.Content value="options" class="space-y-6">
			{#each optionsByKey as { key, label, items }}
				<Card.Root>
					<Card.Header class="flex flex-row flex-wrap items-end justify-between gap-4">
						<div>
							<Card.Title>{label}</Card.Title>
							<Card.Description
								>Options for the {label.toLowerCase()} dropdown in event forms.</Card.Description
							>
						</div>
						<form
							method="POST"
							action="?/createOption"
							use:enhance
							class="flex flex-wrap items-end gap-2"
						>
							<input type="hidden" name="key" value={key} />
							<Field.Field class="flex-row items-end gap-2">
								<Field.Label for="opt-value-{key}" class="sr-only">Value</Field.Label>
								<Field.Content>
									<Input id="opt-value-{key}" name="value" placeholder="Value" class="w-32" />
								</Field.Content>
								<Field.Label for="opt-label-{key}" class="sr-only">Label</Field.Label>
								<Field.Content>
									<Input
										id="opt-label-{key}"
										name="label"
										placeholder="Label (optional)"
										class="w-40"
									/>
								</Field.Content>
							</Field.Field>
							<Button type="submit">Add</Button>
						</form>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Value</Table.Head>
									<Table.Head>Label</Table.Head>
									<Table.Head class="w-[100px]">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each items as opt}
									<Table.Row>
										<Table.Cell>{opt.value}</Table.Cell>
										<Table.Cell>{opt.label}</Table.Cell>
										<Table.Cell>
											<AlertDialog.Root>
												<AlertDialog.Trigger
													class="inline-flex h-8 items-center rounded border border-red-200 px-2 text-sm text-red-700 hover:bg-red-50"
												>
													Delete
												</AlertDialog.Trigger>
												<AlertDialog.Content>
													<AlertDialog.Header>
														<AlertDialog.Title>Delete option</AlertDialog.Title>
														<AlertDialog.Description
															>Remove “{opt.label}” from {label}?</AlertDialog.Description
														>
													</AlertDialog.Header>
													<AlertDialog.Footer>
														<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
														<form method="POST" action="?/deleteOption" use:enhance>
															<input type="hidden" name="id" value={opt.id} />
															<AlertDialog.Action type="submit">Delete</AlertDialog.Action>
														</form>
													</AlertDialog.Footer>
												</AlertDialog.Content>
											</AlertDialog.Root>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
						{#if items.length === 0}
							<p class="py-4 text-sm text-muted-foreground">
								No options. Add one above or refresh to seed from defaults.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</Tabs.Content>
	</Tabs.Root>
</div>
