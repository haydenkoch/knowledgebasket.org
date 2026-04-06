<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data, form } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Organization settings</Card.Title>
		<Card.Description
			>Update the public details visitors see on the organization page.</Card.Description
		>
	</Card.Header>
	<Card.Content>
		<form method="POST" action="?/save" class="space-y-4">
			<Field.Field>
				<Field.Label for="name">Name</Field.Label>
				<Field.Content><Input id="name" name="name" value={data.organization.name} /></Field.Content
				>
			</Field.Field>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="website">Website</Field.Label>
					<Field.Content>
						<Input id="website" name="website" type="url" value={data.organization.website ?? ''} />
					</Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Field.Content>
						<Input id="email" name="email" type="email" value={data.organization.email ?? ''} />
					</Field.Content>
				</Field.Field>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="phone">Phone</Field.Label>
					<Field.Content
						><Input id="phone" name="phone" value={data.organization.phone ?? ''} /></Field.Content
					>
				</Field.Field>
				<Field.Field>
					<Field.Label for="region">Region</Field.Label>
					<Field.Content
						><Input
							id="region"
							name="region"
							value={data.organization.region ?? ''}
						/></Field.Content
					>
				</Field.Field>
			</div>
			<Field.Field>
				<Field.Label for="description">Description</Field.Label>
				<Field.Content>
					<Textarea
						id="description"
						name="description"
						rows={5}
						value={data.organization.description ?? ''}
					/>
				</Field.Content>
			</Field.Field>
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit">Save settings</Button>
		</form>
	</Card.Content>
</Card.Root>
