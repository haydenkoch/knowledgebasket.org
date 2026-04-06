<script lang="ts">
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import { X } from '@lucide/svelte';

	let {
		item,
		index,
		isLead = false,
		onremove
	}: {
		item: { coil: CoilKey; itemId: string; title: string };
		index: number;
		isLead: boolean;
		onremove: () => void;
	} = $props();
</script>

<div
	class="group flex items-center gap-2.5 rounded-xl border border-[color:var(--rule)] bg-white px-3 py-2.5 transition-colors hover:bg-[var(--color-alpine-snow-100)]/40"
>
	<!-- Position number -->
	<span
		class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold {isLead
			? 'bg-[var(--color-flicker-100)] text-[var(--color-flicker-900)]'
			: 'bg-[var(--color-alpine-snow-200)]/60 text-[var(--mid)]'}"
	>
		{index + 1}
	</span>

	<!-- Title -->
	<div class="min-w-0 flex-1">
		<span class="block truncate text-sm font-medium text-[var(--dark)]">{item.title}</span>
	</div>

	<!-- Lead badge -->
	{#if isLead}
		<span
			class="hidden shrink-0 rounded-full bg-[var(--color-flicker-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-flicker-900)] uppercase sm:inline"
		>
			Lead
		</span>
	{/if}

	<!-- Coil badge -->
	<span
		class="shrink-0 rounded-full bg-[var(--color-alpine-snow-200)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--mid)]"
	>
		{coilLabels[item.coil]}
	</span>

	<!-- Remove -->
	<button
		type="button"
		class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--mid)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-ember-50)] hover:text-[var(--color-ember-700)]"
		onclick={(e) => {
			e.stopPropagation();
			onremove();
		}}
		title="Remove"
	>
		<X class="h-3.5 w-3.5" />
	</button>
</div>
