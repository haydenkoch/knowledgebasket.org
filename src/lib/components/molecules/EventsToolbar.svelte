<script lang="ts">
	let { filteredTotal = 0 }: { filteredTotal?: number } = $props();
</script>

<div class="flex items-center justify-between mb-[22px] pb-4 border-b border-[var(--rule)]" role="status" aria-live="polite" aria-atomic="true">
	<p class="font-sans text-[14px] text-[var(--muted-foreground)]">
		<strong class="text-[var(--dark)]">{filteredTotal.toLocaleString()}</strong>
		{filteredTotal === 1 ? 'event' : 'events'}
	</p>
</div>
