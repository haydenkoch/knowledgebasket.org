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
		API keys are configured via environment variables. Status below is read-only.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Mapbox</Card.Title>
			<Card.Description
				>Used for geocoding and maps (event/venue location picker, public map). Set
				MAPBOX_ACCESS_TOKEN or MAPBOX_TOKEN in your environment.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-2">
				{#if data.mapboxConfigured}
					<CheckCircle class="h-5 w-5 text-green-600" />
					<span>Configured</span>
				{:else}
					<XCircle class="h-5 w-5 text-amber-600" />
					<span>Not set</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Meilisearch</Card.Title>
			<Card.Description
				>Used for events search. Set MEILISEARCH_HOST and MEILISEARCH_API_KEY in your environment.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-2">
				{#if data.meilisearchConfigured}
					<CheckCircle class="h-5 w-5 text-green-600" />
					<span>Configured</span>
				{:else}
					<XCircle class="h-5 w-5 text-amber-600" />
					<span>Not set</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
