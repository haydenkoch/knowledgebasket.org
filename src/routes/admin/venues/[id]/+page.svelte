<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	let { data } = $props();
	let submitting = $state(false);
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold">Edit venue</h1>
		<AlertDialog.Root>
			<AlertDialog.Trigger>
				<Button variant="destructive" type="button">Delete</Button>
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete venue</AlertDialog.Title>
					<AlertDialog.Description>
						This will permanently delete this venue. This action cannot be undone.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<form method="POST" action="?/deleteVenue" use:enhance>
						<AlertDialog.Action type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Delete
						</AlertDialog.Action>
					</form>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	</div>

	<form method="POST" action="?/updateVenue" enctype="multipart/form-data" use:enhance={() => {
		submitting = true;
		return ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') toast.success('Venue updated');
			else if (result.type === 'failure') toast.error((result.data as { error?: string })?.error ?? 'Update failed');
			update();
		};
	}} class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Details</Card.Title>
				<Card.Description>Name, type, and description for the venue.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="name">Name *</Field.Label>
						<Field.Content>
							<Input id="name" name="name" type="text" required value={data.venue.name} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="venueType">Type</Field.Label>
						<Field.Content>
							<Input id="venueType" name="venueType" type="text" value={data.venue.venueType ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
				</div>
				<Field.Field>
					<Field.Label for="description">Description</Field.Label>
					<Field.Content>
						<Textarea id="description" name="description" rows={3} value={data.venue.description ?? ''} class="w-full" />
					</Field.Content>
				</Field.Field>
			</Card.Content>
		</Card.Root>
		<Separator />
		<Card.Root>
			<Card.Header>
				<Card.Title>Address</Card.Title>
				<Card.Description>Street, city, state, zip, and website.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-3">
					<Field.Field>
						<Field.Label for="address">Address</Field.Label>
						<Field.Content>
							<Input id="address" name="address" type="text" value={data.venue.address ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="city">City</Field.Label>
						<Field.Content>
							<Input id="city" name="city" type="text" value={data.venue.city ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="state">State</Field.Label>
						<Field.Content>
							<Input id="state" name="state" type="text" value={data.venue.state ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="zip">Zip</Field.Label>
						<Field.Content>
							<Input id="zip" name="zip" type="text" value={data.venue.zip ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="website">Website</Field.Label>
						<Field.Content>
							<Input id="website" name="website" type="url" value={data.venue.website ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
				</div>
			</Card.Content>
		</Card.Root>
		<Separator />
		<Card.Root>
			<Card.Header>
				<Card.Title>Organization &amp; Image</Card.Title>
				<Card.Description>Link to an organization. JPG, PNG, or WebP · max 5 MB.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<Field.Field>
					<Field.Label for="organizationId">Organization</Field.Label>
					<Field.Content>
						<NativeSelect.Root id="organizationId" name="organizationId" value={data.venue.organizationId ?? ''} class="w-full">
							<NativeSelect.Option value="">None</NativeSelect.Option>
							{#each data.organizations as org}
								<NativeSelect.Option value={org.id}>{org.name}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="image">Image</Field.Label>
					<Field.Content>
						{#if data.venue.imageUrl}
							<div class="mb-2 flex items-center gap-3">
								<img src={data.venue.imageUrl} alt="" class="h-20 w-20 rounded object-cover" />
								<span class="text-muted-foreground text-sm">Replace by choosing a new file.</span>
							</div>
						{/if}
						<Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" class="w-full" />
					</Field.Content>
				</Field.Field>
			</Card.Content>
		</Card.Root>
		<Button type="submit" disabled={submitting}>
			{#if submitting}<Spinner class="mr-2 h-4 w-4" />{/if}
			{submitting ? 'Saving…' : 'Update venue'}
		</Button>
	</form>
</div>
