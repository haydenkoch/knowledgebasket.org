<script lang="ts">
	import type { RedPagesItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';

	let { vendor, index = 0 }: { vendor: RedPagesItem; index?: number } = $props();

	const href = $derived(`/red-pages/${vendor.slug ?? vendor.id}`);
	const plainDesc = $derived(vendor.description ? stripHtml(String(vendor.description)) : '');

	function initials(title: string): string {
		return (
			title
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((w) => w[0])
				.join('')
				.toUpperCase() || '?'
		);
	}

	function serviceTags(serviceType?: string): string[] {
		if (!serviceType?.trim()) return [];
		const raw = serviceType
			.split(/[:,)]+/)
			.map((s) => s.replace(/\s*\([^)]*$/, '').trim())
			.filter((s) => s.length > 0 && s.length < 45);
		return [...new Set(raw)];
	}

	const tags = $derived(serviceTags(vendor.serviceType));
</script>

<a
	{href}
	class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline shadow-[var(--sh)] transition-[box-shadow,transform] duration-150 hover:translate-x-[3px] hover:no-underline hover:shadow-[var(--shh)]"
	style="animation-delay: {index * 30}ms"
>
	<div
		class="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[var(--red)] font-sans text-xl font-bold text-white"
	>
		{initials(vendor.title)}
	</div>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<h3 class="font-serif text-base font-semibold text-[var(--dark)]">{vendor.title}</h3>
		{#if vendor.tribalAffiliation}
			<p class="text-sm text-[var(--muted-foreground)]">{vendor.tribalAffiliation}</p>
		{/if}
		{#if tags.length || vendor.region}
			<div class="flex flex-wrap gap-1.5">
				<span
					class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
					>Native-owned</span
				>
				{#if vendor.region}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{vendor.region}</span
					>
				{/if}
				{#each tags.slice(0, 3) as tag}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{tag}</span
					>
				{/each}
			</div>
		{/if}
		{#if plainDesc}
			<p class="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-[var(--mid)]">{plainDesc}</p>
		{/if}
	</div>
</a>
