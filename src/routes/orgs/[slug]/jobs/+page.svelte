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
			<Card.Title>Submit job</Card.Title>
			<Card.Description
				>Jobs created here stay pending until a site reviewer approves them.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/create" class="space-y-4">
				<Field.Field>
					<Field.Label for="title">Title</Field.Label>
					<Field.Content><Input id="title" name="title" required /></Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="description">Description</Field.Label>
					<Field.Content><Textarea id="description" name="description" rows={4} /></Field.Content>
				</Field.Field>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="location">Location</Field.Label>
						<Field.Content><Input id="location" name="location" /></Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="applicationDeadline">Deadline</Field.Label>
						<Field.Content
							><Input
								id="applicationDeadline"
								name="applicationDeadline"
								type="date"
							/></Field.Content
						>
					</Field.Field>
				</div>
				<Field.Field>
					<Field.Label for="applyUrl">Apply URL</Field.Label>
					<Field.Content><Input id="applyUrl" name="applyUrl" type="url" /></Field.Content>
				</Field.Field>
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
				<Button type="submit">Submit job for review</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Organization jobs</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#if data.jobs.length === 0}
				<p class="text-sm text-muted-foreground">No organization-linked jobs yet.</p>
			{:else}
				{#each data.jobs as job}
					<div class="rounded-xl border border-border/70 p-4">
						<p class="font-medium">{job.title}</p>
						<p class="text-sm text-muted-foreground">Status: {job.status ?? 'draft'}</p>
					</div>
				{/each}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
