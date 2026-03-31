<script lang="ts">
	import type { JobItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	let { data } = $props();
	let item = $derived(data.item as JobItem | null);
	const heroImage = $derived(item ? (item.imageUrl ?? getPlaceholderImage(0)) : '');
</script>

{#if !item}
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This section is being updated. No listing found.</p>
		<a href="/jobs" class="text-[var(--teal)] underline hover:no-underline">Back to Job Board</a>
	</div>
{:else}
<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<nav class="mb-6 font-sans text-sm text-[var(--muted-foreground)]">
		<a href="/jobs" class="text-[var(--teal)] underline hover:no-underline">Job Board</a>
		<span class="mx-2">›</span>
		<span>{item.title}</span>
	</nav>

	<div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--forest)] to-[var(--color-pinyon-950,#13201a)] p-6 text-white">
		<img src={heroImage} alt="" class="absolute inset-0 h-full w-full object-cover opacity-40" />
		<div class="relative z-10">
			<h1 class="font-serif text-2xl font-bold sm:text-3xl">{item.title}</h1>
			{#if item.employerName}
				<p class="mt-2 text-sm opacity-90">{item.employerName}</p>
			{/if}
			{#if item.location}
				<p class="mt-1 flex items-center gap-1.5 text-sm opacity-90">
					<MapPinIcon class="size-4 shrink-0" /> {item.location}
				</p>
			{/if}
		</div>
	</div>

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
		<div>
			<h2 class="font-serif text-lg font-semibold text-[var(--foreground)]">Position overview</h2>
			{#if item.description}
				<div class="mt-2 prose prose-sm text-[var(--muted-foreground)]">{@html item.description}</div>
			{/if}
		</div>
		<aside class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
			<h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
				Details
			</h3>
			<dl class="mt-3 space-y-2 text-sm">
				{#if item.employerName}
					<dt class="font-semibold text-[var(--muted-foreground)]">Employer</dt>
					<dd class="text-[var(--foreground)]">{item.employerName}</dd>
				{/if}
				{#if item.location}
					<dt class="font-semibold text-[var(--muted-foreground)]">Location</dt>
					<dd class="text-[var(--foreground)]">{item.location}</dd>
				{/if}
				{#if item.jobType}
					<dt class="font-semibold text-[var(--muted-foreground)]">Job type</dt>
					<dd class="text-[var(--foreground)]">{item.jobType}</dd>
				{/if}
				{#if item.sector}
					<dt class="font-semibold text-[var(--muted-foreground)]">Sector</dt>
					<dd class="text-[var(--foreground)]">{item.sector}</dd>
				{/if}
			</dl>
			<a
				href="/jobs"
				class="mt-4 block rounded-lg border-2 border-[var(--forest)] py-2 text-center text-sm font-semibold text-[var(--forest)] transition hover:bg-[var(--forest)] hover:text-white"
			>
				← Back to Job Board
			</a>
		</aside>
	</div>
</div>
{/if}
