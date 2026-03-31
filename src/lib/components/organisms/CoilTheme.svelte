<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CoilKey } from '$lib/data/kb';

	interface Props {
		coil: CoilKey | string;
		children?: Snippet;
	}
	let { coil, children }: Props = $props();
</script>

<div class="coil-theme coil-theme--{coil}" data-coil={coil}>
	{@render children?.()}
</div>
