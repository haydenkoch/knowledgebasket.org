<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, for: forAttr, class: className = '' }: { children?: Snippet; for?: string; class?: string } = $props();
</script>

<label for={forAttr} class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 {className}">
	{@render children?.()}
</label>
