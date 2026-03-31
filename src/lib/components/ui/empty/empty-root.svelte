<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, class: className = '' }: { children?: Snippet; class?: string } = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 px-6 text-center {className}">
	{@render children?.()}
</div>
