<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		value = '',
		disabled = false,
		children
	}: { value?: string; disabled?: boolean; children?: Snippet } = $props();
</script>

<option {value} {disabled}>{@render children?.()}</option>
