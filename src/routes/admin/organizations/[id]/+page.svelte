<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	let { data } = $props();
	let submitting = $state(false);
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold">Edit organization</h1>
		<AlertDialog.Root>
			<AlertDialog.Trigger>
				<Button variant="destructive" type="button">Delete</Button>
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete organization</AlertDialog.Title>
					<AlertDialog.Description>
						This will permanently delete this organization. This action cannot be undone.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<form method="POST" action="?/deleteOrganization" use:enhance>
						<AlertDialog.Action type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Delete
						</AlertDialog.Action>
					</form>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	</div>

	<form method="POST" action="?/updateOrganization" enctype="multipart/form-data" use:enhance={() => {
		submitting = true;
		return ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') toast.success('Organization updated');
			else if (result.type === 'failure') toast.error((result.data as { error?: string })?.error ?? 'Update failed');
			update();
		};
	}} class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Details</Card.Title>
				<Card.Description>Name, type, and description for the organization.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="name">Name *</Field.Label>
						<Field.Content>
							<Input id="name" name="name" type="text" required value={data.organization.name} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="orgType">Type</Field.Label>
						<Field.Content>
							<Input id="orgType" name="orgType" type="text" value={data.organization.orgType ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
				</div>
				<Field.Field>
					<Field.Label for="description">Description</Field.Label>
					<Field.Content>
						<Textarea id="description" name="description" rows={3} value={data.organization.description ?? ''} class="w-full" />
					</Field.Content>
				</Field.Field>
			</Card.Content>
		</Card.Root>
		<Separator />
		<Card.Root>
			<Card.Header>
				<Card.Title>Contact</Card.Title>
				<Card.Description>Email, website, phone, and region.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-3">
					<Field.Field>
						<Field.Label for="email">Email</Field.Label>
						<Field.Content>
							<Input id="email" name="email" type="email" value={data.organization.email ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="website">Website</Field.Label>
						<Field.Content>
							<Input id="website" name="website" type="url" value={data.organization.website ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="phone">Phone</Field.Label>
						<Field.Content>
							<Input id="phone" name="phone" type="tel" value={data.organization.phone ?? ''} class="w-full" />
						</Field.Content>
					</Field.Field>
				</div>
				<Field.Field>
					<Field.Label for="region">Region</Field.Label>
					<Field.Content>
						<Input id="region" name="region" type="text" value={data.organization.region ?? ''} class="w-full" />
					</Field.Content>
				</Field.Field>
			</Card.Content>
		</Card.Root>
		<Separator />
		<Card.Root>
			<Card.Header>
				<Card.Title>Logo</Card.Title>
				<Card.Description>JPG, PNG, or WebP · max 5 MB. Replace by choosing a new file.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Field.Field>
					<Field.Label for="logo">Logo</Field.Label>
					<Field.Content>
						{#if data.organization.logoUrl}
							<div class="mb-2 flex items-center gap-3">
								<img src={data.organization.logoUrl} alt="" class="h-16 w-16 rounded object-contain" />
								<span class="text-muted-foreground text-sm">Replace by choosing a new file.</span>
							</div>
						{/if}
						<Input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" class="w-full" />
					</Field.Content>
				</Field.Field>
			</Card.Content>
		</Card.Root>
		<Button type="submit" disabled={submitting}>
			{#if submitting}<Spinner class="mr-2 h-4 w-4" />{/if}
			{submitting ? 'Saving…' : 'Update organization'}
		</Button>
	</form>
</div>
