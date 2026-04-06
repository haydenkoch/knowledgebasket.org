<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	let { status, error } = $props();
	const is404 = $derived(status === 404);
</script>

<svelte:head>
	<title>{is404 ? 'Resource not found' : 'Something went wrong'} | Toolbox | Knowledge Basket</title
	>
</svelte:head>

<div class="kb-error">
	{#if is404}
		<h1>Resource not found</h1>
		<p>
			We couldn't find the resource you're looking for. It may have been removed or the link might
			be incorrect.
		</p>
	{:else}
		<h1>Something went wrong</h1>
		<p>{error?.message ?? 'An error occurred while loading this page.'}</p>
	{/if}
	<a href="/toolbox" class="kb-error__link"><ArrowLeft class="inline h-4 w-4" /> Back to Toolbox</a>
</div>

<style>
	.kb-error {
		max-width: 36rem;
		margin: 4rem auto;
		padding: 0 1.5rem;
		text-align: center;
	}
	.kb-error h1 {
		font-family: var(--font-serif);
		font-size: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--foreground);
	}
	.kb-error p {
		color: var(--muted-foreground);
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}
	.kb-error__link {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--teal);
	}
	.kb-error__link:hover {
		text-decoration: underline;
	}
</style>
