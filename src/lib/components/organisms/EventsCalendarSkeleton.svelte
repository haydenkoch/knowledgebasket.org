<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
</script>

<div class="kb-calendar-skeleton" aria-hidden="true">
	<div class="kb-calendar-skeleton__header">
		<Skeleton class="h-9 w-24" />
		<Skeleton class="h-9 w-32" />
		<Skeleton class="h-9 w-20" />
	</div>
	<div class="kb-calendar-skeleton__weekdays">
		{#each Array(7) as _}
			<Skeleton class="h-8 flex-1 rounded" />
		{/each}
	</div>
	<div class="kb-calendar-skeleton__grid">
		{#each Array(35) as _}
			<Skeleton class="kb-calendar-skeleton__cell" />
		{/each}
	</div>
</div>

<style>
	.kb-calendar-skeleton {
		min-height: 400px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.kb-calendar-skeleton__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.kb-calendar-skeleton__weekdays {
		display: flex;
		gap: 0.25rem;
	}
	.kb-calendar-skeleton__grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.25rem;
		flex: 1;
	}
	.kb-calendar-skeleton__cell {
		aspect-ratio: 1;
		min-height: 48px;
		border-radius: var(--radius-md);
	}
</style>
