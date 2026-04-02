<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { CheckCircle, XCircle } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Integrations | KB Admin</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
	<h1 class="text-2xl font-bold">Integrations</h1>
	<p class="text-muted-foreground">
		These integrations are configured by your developer. Status is shown here for reference.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Mapbox</Card.Title>
			<Card.Description>
				Enables maps and location search — used for event and venue location pickers and the public map view.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-2">
				{#if data.mapboxConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">Not configured</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Meilisearch</Card.Title>
			<Card.Description>
				Powers the public events search. Required for search to work on the site.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-2">
				{#if data.meilisearchConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">Not configured</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
