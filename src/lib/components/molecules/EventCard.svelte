<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';

	let { event, index = 0 }: { event: EventItem; index?: number } = $props();

	const href = $derived(`/events/${event.slug ?? event.id}`);

	function formatDate(d?: string) {
		if (!d) return '';
		try {
			return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		} catch { return ''; }
	}

	const plainDesc = $derived(event.description ? stripHtml(event.description) : '');
	const types = $derived(event.types?.length ? event.types : event.type ? [event.type] : []);
</script>

<a
	{href}
	class="bg-white rounded-lg shadow-[var(--sh)] overflow-hidden flex flex-col transition-[transform,box-shadow] duration-150 cursor-pointer border border-[var(--rule)] no-underline hover:-translate-y-[3px] hover:shadow-[var(--shh)]"
	style="animation-delay: {index * 40}ms"
>
	<div class="h-[148px] flex items-center justify-center relative overflow-hidden" style="background: var(--color-lakebed-800);">
		{#if event.imageUrl}
			<img src={event.imageUrl} alt={event.title} class="w-full h-full object-cover" loading="lazy" />
		{:else}
			<span class="absolute text-[48px] opacity-[0.35]" aria-hidden="true">🗓</span>
		{/if}
		{#if event.startDate}
			<span class="absolute left-3 bottom-[10px] font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-white/80">{formatDate(event.startDate)}</span>
		{/if}
		{#if event.cost}
			<span class="absolute right-[10px] bottom-[10px]">
				<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
					{event.cost === 'Free / Sponsored' ? 'Free' : '$'}
				</span>
			</span>
		{/if}
	</div>
	<div class="p-4 px-[18px] flex-1 min-h-0 flex flex-col">
		{#if types.length}
			<div class="flex flex-wrap gap-[5px] mb-2">
				{#each types.slice(0, 2) as tag}
					<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{tag}</span>
				{/each}
			</div>
		{/if}
		<h3 class="font-serif text-base font-semibold text-[var(--dark)] leading-[1.35] mb-[5px]">{event.title}</h3>
		{#if event.location || event.region}
			<p class="font-sans text-xs text-[var(--muted-foreground)] mb-[6px] flex items-center gap-1">
				<svg class="w-[14px] h-[14px] flex-none text-inherit" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
				{event.location ?? event.region}
			</p>
		{/if}
		{#if event.organizationName}
			<p class="font-sans text-xs text-[var(--muted-foreground)] mb-[6px] flex items-center gap-1">{event.organizationName}</p>
		{/if}
		{#if plainDesc}
			<p class="text-[13px] leading-[1.5] text-[var(--mid)] mb-[14px] flex-auto min-h-0 line-clamp-3">{plainDesc}</p>
		{/if}
		<span class="block flex-none text-center bg-[var(--teal)] text-white font-sans text-[13px] font-bold py-[9px] rounded-[var(--radius)] no-underline tracking-[0.03em] transition-[filter] duration-150 mt-auto hover:brightness-110">View event</span>
	</div>
</a>
