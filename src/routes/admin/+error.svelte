<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { error } = $props();

	const is404 = $derived((error as { status?: number })?.status === 404);
	const message = $derived(is404 ? 'Page not found' : (error?.message ?? 'Something went wrong'));
</script>

<svelte:head>
	<title>{is404 ? 'Not found' : 'Error'} | KB Admin</title>
</svelte:head>

<div class="flex min-h-[50vh] items-center justify-center p-6">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<Card.Title>{is404 ? 'Not found' : 'Something went wrong'}</Card.Title>
			<Card.Description>{message}</Card.Description>
		</Card.Header>
		<Card.Footer class="flex gap-2">
			<Button href="/admin">Dashboard</Button>
			{#if !is404}
				<Button href="/admin/events" variant="outline">Events</Button>
			{/if}
		</Card.Footer>
	</Card.Root>
</div>
