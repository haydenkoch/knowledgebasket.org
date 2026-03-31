<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';

	let { data, form } = $props();
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Duplicate detection</h1>

	{#if form?.success}
		<Alert>
			<AlertTitle>Success</AlertTitle>
			<AlertDescription>Events merged successfully.</AlertDescription>
		</Alert>
	{/if}
	{#if form?.error}
		<Alert variant="destructive">
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	{#if data.groups.length === 0}
		<Card.Root>
			<Card.Content class="pt-6">
				<p class="text-muted-foreground">No potential duplicates found.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-sm text-muted-foreground">{data.groups.length} potential duplicate group(s) found.</p>

		{#each data.groups as group, gi}
			<Card.Root>
				<Card.Header>
					<Card.Title>Group {gi + 1} — {group.group.length} events</Card.Title>
					<Card.Description>Choose one event to keep. The others will be merged into it and then removed.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" action="?/merge" use:enhance>
						<div class="space-y-3">
							{#each group.group as event}
								<div class="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
									<Label class="flex cursor-pointer items-center gap-3 font-normal">
										<input type="radio" name="keeperId" value={event.id} class="h-4 w-4" />
										<input type="hidden" name="mergeIds" value={event.id} />
										<span class="font-medium">{event.title}</span>
										<span class="text-xs text-muted-foreground">{event.startDate ?? 'No date'}</span>
									</Label>
									<StatusBadge status={event.status ?? 'unknown'} />
									<Button href="/admin/events/{event.id}" variant="ghost" size="sm">
										Edit
									</Button>
								</div>
							{/each}
						</div>
						<Button type="submit" variant="secondary" class="mt-4 bg-amber-100 text-amber-800 hover:bg-amber-200">
							Merge into selected
						</Button>
					</form>
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
