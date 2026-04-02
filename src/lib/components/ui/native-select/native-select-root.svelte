<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		id?: string;
		name?: string;
		value?: string;
		class?: string;
		onchange?: (e: Event) => void;
		children?: Snippet;
	}
	let {
		id,
		name,
		value = $bindable(''),
		class: className = '',
		onchange,
		children
	}: Props = $props();
</script>

<select
	{id}
	{name}
	bind:value
	{onchange}
	class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 {className}"
>
	{@render children?.()}
</select>
