<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
		children?: Snippet;
		class?: string;
	}

	let { title, description, actions, children, class: className = '' }: Props = $props();
</script>

<Card.Root class={`border-[color:var(--rule)] bg-white/90 shadow-[var(--sh)] ${className}`.trim()}>
	<Card.Header
		class="gap-3 border-b border-[color:var(--rule)]/80 bg-[var(--color-alpine-snow-100)]/55"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-1">
				<h2 class="font-serif text-[1.1rem] text-[var(--dark)]">{title}</h2>
				{#if description}
					<Card.Description class="max-w-3xl text-[13px] leading-5 text-[var(--mid)]">
						{description}
					</Card.Description>
				{/if}
			</div>
			{#if actions}
				<div class="flex flex-wrap items-center gap-2">
					{@render actions()}
				</div>
			{/if}
		</div>
	</Card.Header>
	<Card.Content class="p-0">
		{@render children?.()}
	</Card.Content>
</Card.Root>
