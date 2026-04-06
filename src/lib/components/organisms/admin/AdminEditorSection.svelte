<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { ChevronDown } from '@lucide/svelte';

	interface Props {
		storageKey: string;
		title: string;
		description?: string;
		defaultOpen?: boolean;
		forceOpen?: boolean;
		summary?: string | null;
		children: Snippet;
	}

	let {
		storageKey,
		title,
		description = '',
		defaultOpen = false,
		forceOpen = false,
		summary = null,
		children
	}: Props = $props();

	const initialOpen = () => forceOpen || defaultOpen;
	let open = $state(initialOpen());
	const persistedKey = $derived(`admin-editor-section:${storageKey}`);

	onMount(() => {
		if (!browser) return;
		const persisted = window.localStorage.getItem(persistedKey);
		if (persisted != null) {
			open = persisted === '1';
		}
		if (forceOpen) open = true;
	});

	$effect(() => {
		if (forceOpen) open = true;
	});

	$effect(() => {
		if (!browser) return;
		window.localStorage.setItem(persistedKey, open ? '1' : '0');
	});
</script>

<Card.Root class="overflow-hidden">
	<Collapsible.Root bind:open>
		<Card.Header class="gap-3">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Card.Title>{title}</Card.Title>
					{#if description}
						<Card.Description>{description}</Card.Description>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					{#if summary}
						<p class="text-xs text-[var(--mid)]">{summary}</p>
					{/if}
					<Collapsible.Trigger
						class="inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)] px-3 py-1.5 text-xs font-semibold text-[var(--dark)]"
					>
						{open ? 'Collapse' : 'Expand'}
						<ChevronDown class={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
					</Collapsible.Trigger>
				</div>
			</div>
		</Card.Header>
		<Collapsible.Content>
			<Card.Content>
				{@render children()}
			</Card.Content>
		</Collapsible.Content>
	</Collapsible.Root>
</Card.Root>
