<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDown, Copy } from '@lucide/svelte';

	let { label = 'Debug info', data }: { label?: string; data: unknown } = $props();

	let open = $state(false);

	const formatted = $derived(() => {
		try {
			return JSON.stringify(data, null, 2);
		} catch {
			return String(data);
		}
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(formatted());
		} catch {
			// ignore
		}
	}
</script>

<Collapsible.Root bind:open>
	<Collapsible.Trigger
		class="flex w-full items-center gap-2 rounded-lg border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/60 px-3 py-2 text-left text-xs font-medium text-[var(--mid)] transition-colors hover:bg-[var(--color-alpine-snow-200)]/60"
	>
		<ChevronDown
			class="h-3.5 w-3.5 transition-transform duration-150 {open ? 'rotate-180' : ''}"
		/>
		{label}
	</Collapsible.Trigger>
	<Collapsible.Content>
		<div
			class="relative mt-1 rounded-lg border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/60"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class="absolute top-2 right-2 opacity-60 hover:opacity-100"
				onclick={copy}
				title="Copy to clipboard"
			>
				<Copy class="h-3.5 w-3.5" />
			</Button>
			<pre class="max-h-80 overflow-auto p-4 text-xs leading-5 text-[var(--mid)]">{formatted()}</pre>
		</div>
	</Collapsible.Content>
</Collapsible.Root>
