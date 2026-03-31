<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children?: Snippet } = $props();
</script>

<div class="mb-4">
	{@render children?.()}
</div>
