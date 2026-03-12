<script lang="ts">
	import type { FundingItem } from '$lib/data/kb';

	let { data } = $props();
	let item = $derived(data.item as FundingItem);
</script>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<nav class="mb-6 font-[family-name:var(--font-sans)] text-sm text-[var(--color-kb-slate)]">
		<a href="/funding" class="text-[var(--color-kb-teal)] underline hover:no-underline">Funding</a>
		<span class="mx-2">›</span>
		<span>{item.title}</span>
	</nav>

	<div class="rounded-xl bg-gradient-to-br from-amber-900 to-[var(--color-kb-gold)] p-6 text-white">
		{#if item.status}
			<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{item.status}</span>
		{/if}
		{#if item.amount}
			<p class="mt-2 font-[family-name:var(--font-serif)] text-2xl font-bold">{item.amount}</p>
		{/if}
		<h1 class="mt-2 font-[family-name:var(--font-serif)] text-2xl font-bold sm:text-3xl">
			{item.title}
		</h1>
		{#if item.funder}
			<p class="mt-2 text-sm opacity-90">{item.funder}</p>
		{/if}
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
				{#if item.amount}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Amount</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.amount}</dd>
				{/if}
				{#if item.status}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Status</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.status}</dd>
				{/if}
				{#if item.funder}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Funder</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.funder}</dd>
				{/if}
				{#if item.region}
					<dt class="font-semibold text-[var(--color-kb-slate)]">Region</dt>
					<dd class="text-[var(--color-kb-navy)]">{item.region}</dd>
				{/if}
			</dl>
			<a
				href="/funding"
				class="mt-4 block rounded-lg border-2 border-[var(--color-kb-gold)] py-2 text-center text-sm font-semibold text-[var(--color-kb-gold)] transition hover:bg-[var(--color-kb-gold)] hover:text-white"
			>
				← Back to Funding
			</a>
		</aside>
	</div>
</div>
