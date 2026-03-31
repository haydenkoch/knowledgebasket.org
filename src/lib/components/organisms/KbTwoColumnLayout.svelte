<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		sidebar?: Snippet;
		children?: Snippet;
	}
	let { sidebar, children }: Props = $props();
</script>

<div class="kb-two-col-layout">
	<aside class="kb-two-col-sidebar">
		{@render sidebar?.()}
	</aside>
	<main class="kb-two-col-main">
		{@render children?.()}
	</main>
</div>

<style>
.kb-two-col-layout {
	display: flex;
	gap: 0;
	min-height: 0;
}
.kb-two-col-sidebar {
	width: 240px;
	flex-shrink: 0;
	border-right: 1px solid var(--rule, #e5e5e5);
	padding: 24px 20px;
	background: var(--color-alpine-50, #fafaf8);
}
.kb-two-col-main {
	flex: 1;
	min-width: 0;
	padding: 24px 28px;
}
@media (max-width: 768px) {
	.kb-two-col-layout {
		flex-direction: column;
	}
	.kb-two-col-sidebar {
		width: 100%;
		border-right: none;
		border-bottom: 1px solid var(--rule, #e5e5e5);
		padding: 16px 20px;
	}
	.kb-two-col-main {
		padding: 16px 20px;
	}
}
</style>
