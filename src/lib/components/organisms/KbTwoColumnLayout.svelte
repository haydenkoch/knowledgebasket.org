<script lang="ts">
	type Props = {
		sidebarClass?: string;
		mainClass?: string;
	};

	let { sidebarClass = '', mainClass = '' }: Props = $props();
</script>

<div class="kb-layout">
	<aside class={`kb-sidebar ${sidebarClass}`}>
		<slot name="sidebar" />
	</aside>
	<main class={`kb-main ${mainClass}`}>
		<slot />
	</main>
</div>
