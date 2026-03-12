<script lang="ts">
	import type { RedPagesItem } from '$lib/data/kb';

	let { data } = $props();
	let item = $derived(data.item as RedPagesItem);
</script>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<nav class="mb-6 font-[family-name:var(--font-sans)] text-sm text-[var(--color-kb-slate)]">
		<a href="/red-pages" class="text-[var(--color-kb-teal)] underline hover:no-underline">Red Pages</a>
		<span class="mx-2">›</span>
		<span>{item.title}</span>
	</nav>

	<div class="rounded-xl bg-gradient-to-br from-[var(--color-kb-red)] to-red-800 p-6 text-white">
		<div class="flex items-start gap-4">
			<div
				class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold"
			>
				{item.title
					.split(' ')
					.map((w) => w[0])
					.join('')
					.slice(0, 2)}
			</div>
			<div>
				<h1 class="font-[family-name:var(--font-serif)] text-2xl font-bold sm:text-3xl">
					{item.title}
				</h1>
				{#if item.tribe}
					<p class="mt-1 italic opacity-90">{item.tribe}</p>
				{/if}
				{#if item.serviceType}
					<p class="mt-1 text-sm opacity-90">{item.serviceType}</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr,280px]">
		<div>
			<h2 class="font-[family-name:var(--font-serif)] text-lg font-semibold text-[var(--color-kb-navy)]">
				About
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
				{#if item.tribe}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Tribal affiliation</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.tribe}</dd>
				{/if}
				{#if item.serviceType}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Service type</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.serviceType}</dd>
				{/if}
				{#if item.region}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Service area</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.region}</dd>
				{/if}
			</dl>
			<a
				href="/red-pages"
				class="mt-4 block rounded-lg border-2 border-[var(--color-kb-red)] py-2 text-center text-sm font-semibold text-[var(--color-kb-red)] transition hover:bg-[var(--color-kb-red)] hover:text-white"
			>
				← Back to Red Pages
			</a>
		</aside>
	</div>
</div>
