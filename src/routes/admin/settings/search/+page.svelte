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
		Keep the public search index up to date after bulk edits or imports.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Search index</Card.Title>
			<Card.Description>
				Powers the public events search. Configured by your developer via environment variables.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center gap-2">
				{#if data.meilisearchConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">Not configured</span>
				{/if}
			</div>
			{#if data.meilisearchConfigured}
				<form
					method="POST"
					action="?/reindex"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') toast.success('Search index rebuilt successfully');
							else if (result.type === 'failure')
								toast.error((result.data as { error?: string })?.error ?? 'Rebuild failed');
							update();
						}}
					class="flex flex-wrap items-center gap-2"
				>
					<Button type="submit">
						<RefreshCw class="mr-2 h-4 w-4" />
						Rebuild search index
					</Button>
					{#if data.reindexed != null}
						<span class="text-sm text-[var(--mid)]">Indexed {data.reindexed} events.</span>
					{/if}
				</form>
				<p class="text-xs text-[var(--mid)]">
					This updates the search index with all currently published events. Use this after bulk imports or major edits.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
