<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children?: Snippet } = $props();
</script>

<h3 class="text-lg font-semibold text-foreground mb-1">{@render children?.()}</h3>
