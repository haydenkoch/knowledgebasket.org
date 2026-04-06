<script lang="ts">
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	let { class: className = '' }: { class?: string } = $props();
</script>

<LoaderCircle class="animate-spin {className}" aria-hidden="true" />
