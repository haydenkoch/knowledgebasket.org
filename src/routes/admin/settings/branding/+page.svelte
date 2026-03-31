<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Branding | KB Admin</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
	<h1 class="text-2xl font-bold">Branding</h1>
	<p class="text-muted-foreground">Site logo and favicon. Changes apply to the public site header and browser tab.</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Site logo</Card.Title>
			<Card.Description>Shown in the site header. JPG, PNG, or WebP · max 5 MB.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if data.logoUrl}
				<div class="flex items-center gap-4">
					<img src={data.logoUrl} alt="Current logo" class="h-16 w-auto rounded object-contain" />
				</div>
			{/if}
			<form method="POST" action="?/uploadLogo" enctype="multipart/form-data" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') toast.success('Logo saved');
				else if (result.type === 'failure') toast.error((result.data as { error?: string })?.error ?? 'Upload failed');
				update();
			}} class="flex flex-wrap items-end gap-3">
				<Field.Field>
					<Field.Label for="logo">Upload new logo</Field.Label>
					<Field.Description>JPG, PNG, or WebP · max 5 MB.</Field.Description>
					<Field.Content>
						<Input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" class="w-full" />
					</Field.Content>
				</Field.Field>
				<Button type="submit">Save logo</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Favicon</Card.Title>
			<Card.Description>Browser tab icon. JPG, PNG, or WebP · max 5 MB.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if data.faviconUrl}
				<div class="flex items-center gap-4">
					<img src={data.faviconUrl} alt="Current favicon" class="h-8 w-8 rounded object-contain" />
				</div>
			{/if}
			<form method="POST" action="?/uploadFavicon" enctype="multipart/form-data" use:enhance={() => ({ result, update }) => {
				if (result.type === 'success') toast.success('Favicon saved');
				else if (result.type === 'failure') toast.error((result.data as { error?: string })?.error ?? 'Upload failed');
				update();
			}} class="flex flex-wrap items-end gap-3">
				<Field.Field>
					<Field.Label for="favicon">Upload new favicon</Field.Label>
					<Field.Description>JPG, PNG, or WebP · max 5 MB.</Field.Description>
					<Field.Content>
						<Input id="favicon" name="favicon" type="file" accept="image/jpeg,image/png,image/webp" class="w-full" />
					</Field.Content>
				</Field.Field>
				<Button type="submit">Save favicon</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
