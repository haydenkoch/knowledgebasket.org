<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data, form } = $props();
</script>

<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
	<Card.Root>
		<Card.Header>
			<Card.Title>Submit resource</Card.Title>
			<Card.Description
				>Resources submitted from a workspace stay pending until review.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/create" class="space-y-4">
				<Field.Field>
					<Field.Label for="title">Title</Field.Label>
					<Field.Content><Input id="title" name="title" required /></Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="resourceType">Resource type</Field.Label>
					<Field.Content
						><Input
							id="resourceType"
							name="resourceType"
							placeholder="guide, toolkit, report…"
						/></Field.Content
					>
				</Field.Field>
				<Field.Field>
					<Field.Label for="description">Description</Field.Label>
					<Field.Content><Textarea id="description" name="description" rows={4} /></Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="externalUrl">External URL</Field.Label>
					<Field.Content><Input id="externalUrl" name="externalUrl" type="url" /></Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="contentMode">Content mode</Field.Label>
					<Field.Content>
						<select
							id="contentMode"
							name="contentMode"
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
						>
							<option value="link">External link</option>
							<option value="hosted">Hosted article</option>
							<option value="file">File</option>
						</select>
					</Field.Content>
				</Field.Field>
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
				<Button type="submit">Submit resource for review</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Organization resources</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#if data.resources.length === 0}
				<p class="text-sm text-muted-foreground">No organization-linked resources yet.</p>
			{:else}
				{#each data.resources as resource}
					<div class="rounded-xl border border-border/70 p-4">
						<p class="font-medium">{resource.title}</p>
						<p class="text-sm text-muted-foreground">Status: {resource.status ?? 'draft'}</p>
					</div>
				{/each}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
