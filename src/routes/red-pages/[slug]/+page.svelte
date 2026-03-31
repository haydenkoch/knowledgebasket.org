<script lang="ts">
	import type { RedPagesItem } from '$lib/data/kb';

	let { data } = $props();
	let item = $derived(data.item as RedPagesItem | null);

	function initials(title: string): string {
		return title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
	}
</script>

{#if !item}
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This section is being updated. No listing found.</p>
		<a href="/red-pages" class="text-[var(--teal)] underline hover:no-underline">Back to Red Pages</a>
	</div>
{:else}
<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<nav class="mb-6 font-sans text-sm text-[var(--muted-foreground)]">
		<a href="/red-pages" class="text-[var(--teal)] underline hover:no-underline">Red Pages</a>
		<span class="mx-2">›</span>
		<span>{item.title}</span>
	</nav>

	<div class="rounded-xl bg-gradient-to-br from-[var(--red)] to-[var(--color-elderberry-950,#3f0d16)] p-6 text-white">
		<div class="flex items-start gap-4">
			<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 font-sans text-2xl font-bold">
				{initials(item.title)}
			</div>
			<div>
				<h1 class="font-serif text-2xl font-bold sm:text-3xl">{item.title}</h1>
				{#if item.tribalAffiliation}
					<p class="mt-1 italic opacity-90">{item.tribalAffiliation}</p>
				{/if}
				{#if item.serviceType}
					<p class="mt-1 text-sm opacity-90">{item.serviceType}</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
		<div>
			<h2 class="font-serif text-lg font-semibold text-[var(--foreground)]">About</h2>
			{#if item.description}
				<div class="mt-2 prose prose-sm text-[var(--muted-foreground)]">{@html item.description}</div>
			{/if}
		</div>
		<aside class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
			<h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
				Details
			</h3>
			<dl class="mt-3 space-y-2 text-sm">
				{#if item.tribalAffiliation}
					<dt class="font-semibold text-[var(--muted-foreground)]">Tribal affiliation</dt>
					<dd class="text-[var(--foreground)]">{item.tribalAffiliation}</dd>
				{/if}
				{#if item.serviceType}
					<dt class="font-semibold text-[var(--foreground)]">Service type</dt>
					<dd class="text-[var(--foreground)]">{item.serviceType}</dd>
				{/if}
				{#if item.region}
					<dt class="font-semibold text-[var(--muted-foreground)]">Service area</dt>
					<dd class="text-[var(--foreground)]">{item.region}</dd>
				{/if}
			</dl>
			<a
				href="/red-pages"
				class="mt-4 block rounded-lg border-2 border-[var(--red)] py-2 text-center text-sm font-semibold text-[var(--red)] transition hover:bg-[var(--red)] hover:text-white"
			>
				← Back to Red Pages
			</a>
		</aside>
	</div>
</div>
{/if}
