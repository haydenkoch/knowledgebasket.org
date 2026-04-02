<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		sidebar?: Snippet;
		children?: Snippet;
	}
	let { sidebar, children }: Props = $props();
</script>

<div class="kb-two-col">
	<aside class="kb-two-col__side">
		{@render sidebar?.()}
	</aside>
	<main class="kb-two-col__main">
		{@render children?.()}
	</main>
</div>

<style>
	.kb-two-col {
		display: flex;
		min-height: 0;
	}
	.kb-two-col__side {
		width: 272px;
		flex: 0 0 272px;
		border-right: 1px solid var(--rule, #e5e5e5);
		padding: 24px 12px;
		background: var(--color-alpine-50, #fafaf8);
		overflow: hidden; /* contain children */
		overflow-y: auto; /* scroll if sidebar is very long */
		min-height: 0;
	}
	.kb-two-col__main {
		flex: 1 1 0%;
		min-width: 0;
		padding: 24px 28px;
	}
	@media (max-width: 768px) {
		.kb-two-col {
			flex-direction: column;
		}
		.kb-two-col__side {
			width: 100%;
			flex: none;
			border-right: none;
			border-bottom: 1px solid var(--rule, #e5e5e5);
			padding: 16px;
			overflow: visible;
		}
		.kb-two-col__main {
			padding: 16px;
		}
	}
</style>
