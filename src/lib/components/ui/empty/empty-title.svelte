<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children?: Snippet } = $props();
</script>

<h3 class="mb-1 text-lg font-semibold text-foreground">{@render children?.()}</h3>
