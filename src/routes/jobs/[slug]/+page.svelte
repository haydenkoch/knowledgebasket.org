<script lang="ts">
	import type { JobItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	let { data } = $props();
	let item = $derived(data.item as JobItem);
	const heroImage = $derived(item.imageUrl ?? getPlaceholderImage(0));
</script>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<nav class="mb-6 font-[family-name:var(--font-sans)] text-sm text-[var(--color-kb-slate)]">
		<a href="/jobs" class="text-[var(--color-kb-teal)] underline hover:no-underline">Job Board</a>
		<span class="mx-2">›</span>
		<span>{item.title}</span>
	</nav>

	<div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--color-kb-forest)] to-green-800 p-6 text-white">
		<img src={heroImage} alt="" class="absolute inset-0 h-full w-full object-cover opacity-40" />
		<div class="relative z-10">
		<h1 class="font-[family-name:var(--font-serif)] text-2xl font-bold sm:text-3xl">
			{item.title}
		</h1>
		{#if item.employer}
			<p class="mt-2 text-sm opacity-90">{item.employer}</p>
		{/if}
		{#if item.location}
			<p class="mt-1 flex items-center gap-1.5 text-sm opacity-90">
				<MapPinIcon class="size-4 shrink-0" /> {item.location}
			</p>
		{/if}
		</div>
	</div>

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr,280px]">
		<div>
			<h2 class="font-[family-name:var(--font-serif)] text-lg font-semibold text-[var(--color-kb-navy)]">
				Position overview
			</h2>
			{#if item.description}
				<div class="mt-2 text-[var(--color-kb-slate)] kb-detail-description">{@html item.description}</div>
			{/if}
		</div>
		<aside class="rounded-xl border border-[var(--color-kb-slate-light)] bg-white p-5">
			<h3 class="font-[family-name:var(--font-sans)] text-xs font-bold uppercase tracking-wider text-[var(--color-kb-slate)]">
				Details
			</h3>
			<dl class="mt-3 space-y-2 text-sm">
				{#if item.employer}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Employer</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.employer}</dd>
				{/if}
				{#if item.location}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Location</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.location}</dd>
				{/if}
				{#if item.type}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Job type</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.type}</dd>
				{/if}
				{#if item.sector}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Sector</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.sector}</dd>
				{/if}
			</dl>
			<a
				href="/jobs"
				class="mt-4 block rounded-lg border-2 border-[var(--color-kb-forest)] py-2 text-center text-sm font-semibold text-[var(--color-kb-forest)] transition hover:bg-[var(--color-kb-forest)] hover:text-white"
			>
				← Back to Job Board
			</a>
		</aside>
	</div>
</div>
