<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		children: Snippet;
		sidebar?: Snippet;
		submitLabel: string;
		submitting?: boolean;
		mobileSummary?: string;
	}

	let {
		children,
		sidebar,
		submitLabel,
		submitting = false,
		mobileSummary = 'Save your latest editor changes.'
	}: Props = $props();
</script>

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
	{#if sidebar}
		<aside class="order-1 space-y-4 xl:sticky xl:top-6 xl:order-2 xl:self-start">
			{@render sidebar()}
		</aside>
	{/if}

	<div class="order-2 min-w-0 space-y-4 xl:order-1">
		{@render children()}
	</div>
</div>

<div class="sticky bottom-3 z-20 xl:hidden">
	<div
		class="rounded-2xl border border-[color:var(--rule)] bg-white/95 px-4 py-3 shadow-lg backdrop-blur"
	>
		<div class="flex items-center gap-3">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
					Ready to save
				</p>
				<p class="truncate text-sm font-medium text-[var(--dark)]">{mobileSummary}</p>
			</div>
			<Button type="submit" class="ml-auto" disabled={submitting}>
				{submitting ? 'Saving…' : submitLabel}
			</Button>
		</div>
	</div>
</div>
