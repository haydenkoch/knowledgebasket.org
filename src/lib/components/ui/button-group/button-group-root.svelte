<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		children,
		class: className = '',
		'aria-label': ariaLabel
	}: { children?: Snippet; class?: string; 'aria-label'?: string } = $props();
</script>

<div role="group" aria-label={ariaLabel} class="inline-flex rounded-md shadow-xs {className}
	[&>*:not(:first-child)]:rounded-l-none
	[&>*:not(:last-child)]:rounded-r-none
	[&>*:not(:first-child)]:-ml-px">
	{@render children?.()}
</div>
