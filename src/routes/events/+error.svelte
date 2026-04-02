<script lang="ts">
	let { status, error } = $props();
	const is404 = $derived(status === 404);
</script>

<svelte:head>
	<title>{is404 ? 'Event not found' : 'Something went wrong'} | Events | Knowledge Basket</title>
</svelte:head>

<div class="kb-event-error">
	{#if is404}
		<h1>Event not found</h1>
		<p>
			We couldn't find the event you're looking for. It may have been removed or the link might be
			incorrect.
		</p>
	{:else}
		<h1>Something went wrong</h1>
		<p>{error?.message ?? 'An error occurred while loading this page.'}</p>
	{/if}
	<a href="/events" class="kb-event-error__link">← Back to all events</a>
</div>

<style>
	.kb-event-error {
		max-width: 36rem;
		margin: 2rem auto;
		padding: 0 1rem;
		text-align: center;
	}
	.kb-event-error h1 {
		font-family: var(--font-serif);
		font-size: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--foreground);
	}
	.kb-event-error p {
		color: var(--muted-foreground);
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}
	.kb-event-error__link {
		display: inline-block;
		font-family: var(--font-sans);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--teal);
		text-decoration: none;
	}
	.kb-event-error__link:hover {
		text-decoration: underline;
	}
</style>
