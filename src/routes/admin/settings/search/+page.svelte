<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { CheckCircle, XCircle, RefreshCw } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Search | KB Admin</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
	<h1 class="text-2xl font-bold">Search</h1>
	<p class="text-muted-foreground">
		Reindex events in Meilisearch so the public events search stays in sync after bulk edits or
		imports.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Index status</Card.Title>
			<Card.Description
				>Meilisearch is used for event search. Set MEILISEARCH_HOST and MEILISEARCH_API_KEY in your
				environment.</Card.Description
			>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center gap-2">
				{#if data.meilisearchConfigured}
					<CheckCircle class="h-5 w-5 text-green-600" />
					<span>Configured</span>
				{:else}
					<XCircle class="h-5 w-5 text-amber-600" />
					<span>Not configured</span>
				{/if}
			</div>
			{#if data.meilisearchConfigured}
				<form
					method="POST"
					action="?/reindex"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') toast.success('Reindex complete');
							else if (result.type === 'failure')
								toast.error((result.data as { error?: string })?.error ?? 'Reindex failed');
							update();
						}}
					class="flex flex-wrap items-center gap-2"
				>
					<Button type="submit">
						<RefreshCw class="mr-2 h-4 w-4" />
						Reindex events now
					</Button>
					{#if data.reindexed != null}
						<span class="text-sm text-muted-foreground">Indexed {data.reindexed} events.</span>
					{/if}
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
