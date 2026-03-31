<script lang="ts">
	import type { FundingItem } from '$lib/data/kb';

	let { data } = $props();
	let item = $derived(data.item as FundingItem | null);
</script>

{#if !item}
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This section is being updated. No listing found.</p>
		<a href="/funding" class="text-[var(--teal)] underline hover:no-underline">Back to Funding</a>
	</div>
{:else}
<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<nav class="mb-6 font-sans text-sm text-[var(--muted-foreground)]">
		<a href="/funding" class="text-[var(--teal)] underline hover:no-underline">Funding</a>
		<span class="mx-2">›</span>
		<span>{item.title}</span>
	</nav>

	<div class="rounded-xl bg-gradient-to-br from-amber-900 to-[var(--gold)] p-6 text-white">
		{#if item.status}
			<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{item.status}</span>
		{/if}
		{#if item.amountDescription}
			<p class="mt-2 font-serif text-2xl font-bold">{item.amountDescription}</p>
		{/if}
		<h1 class="mt-2 font-serif text-2xl font-bold sm:text-3xl">
			{item.title}
		</h1>
		{#if item.funderName}
			<p class="mt-2 text-sm opacity-90">{item.funderName}</p>
		{/if}
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
				{#if item.amountDescription}
					<dt class="font-semibold text-[var(--muted-foreground)]">Amount</dt>
					<dd class="text-[var(--foreground)]">{item.amountDescription}</dd>
				{/if}
				{#if item.applicationStatus}
					<dt class="font-semibold text-[var(--muted-foreground)]">Status</dt>
					<dd class="text-[var(--foreground)] capitalize">{item.applicationStatus}</dd>
				{/if}
				{#if item.funderName}
					<dt class="font-semibold text-[var(--muted-foreground)]">Funder</dt>
					<dd class="text-[var(--foreground)]">{item.funderName}</dd>
				{/if}
				{#if item.deadline}
					<dt class="font-semibold text-[var(--muted-foreground)]">Deadline</dt>
					<dd class="text-[var(--foreground)]">{item.deadline}</dd>
				{/if}
				{#if item.region}
					<dt class="font-semibold text-[var(--muted-foreground)]">Region</dt>
					<dd class="text-[var(--foreground)]">{item.region}</dd>
				{/if}
				{#if item.applyUrl}
					<dt class="font-semibold text-[var(--muted-foreground)]">Apply</dt>
					<dd><a href={item.applyUrl} class="text-[var(--teal)] underline" target="_blank" rel="noopener">Apply Now →</a></dd>
				{/if}
			</dl>
			<a
				href="/funding"
				class="mt-4 block rounded-lg border-2 border-[var(--gold)] py-2 text-center text-sm font-semibold text-[var(--gold)] transition hover:bg-[var(--gold)] hover:text-white"
			>
				← Back to Funding
			</a>
		</aside>
	</div>
</div>
{/if}
