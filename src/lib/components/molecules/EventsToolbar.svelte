<script lang="ts">
	type Props = {
		filteredTotal: number;
	};

	let { filteredTotal }: Props = $props();
</script>

<div class="kb-toolbar kb-events-toolbar" aria-live="polite" aria-atomic="true">
	<div class="kb-rcount">Showing <strong>{filteredTotal}</strong> events</div>
</div>

<style>
	.kb-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 22px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--rule);
	}
	.kb-rcount {
		font-family: var(--font-sans);
		font-size: 14px;
		color: var(--muted-foreground);
	}
	.kb-rcount :global(strong) {
		color: var(--dark);
	}
</style>
