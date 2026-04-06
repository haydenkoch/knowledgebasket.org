<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import { formatDisplayDate } from '$lib/utils/display';
	import { stripHtml } from '$lib/utils/format';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import MapPin from '@lucide/svelte/icons/map-pin';

	let { event, index = 0 }: { event: EventItem; index?: number } = $props();

	const href = $derived(`/events/${event.slug ?? event.id}`);

	function formatDate(d?: string) {
		return formatDisplayDate(
			d,
			{
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			},
			''
		);
	}

	const plainDesc = $derived(event.description ? stripHtml(event.description) : '');
	const types = $derived(event.types?.length ? event.types : event.type ? [event.type] : []);
</script>

<a
	{href}
	class="flex cursor-pointer flex-col overflow-clip rounded-lg border border-[var(--rule)] bg-white no-underline shadow-[var(--sh)] transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:no-underline hover:shadow-[var(--shh)]"
	style="animation-delay: {index * 40}ms"
>
	<div
		class="relative flex h-[148px] items-center justify-center overflow-hidden"
		style="background: var(--color-lakebed-800);"
	>
		{#if event.imageUrl}
			<img
				src={event.imageUrl}
				alt={event.title}
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		{:else}
			<CalendarDays class="absolute h-12 w-12 text-white opacity-[0.35]" aria-hidden="true" />
		{/if}
		{#if event.startDate}
			<span
				class="absolute bottom-[10px] left-3 font-sans text-[11px] font-bold tracking-[0.08em] text-white/80 uppercase"
				>{formatDate(event.startDate)}</span
			>
		{/if}
		{#if event.cost}
			<span class="absolute right-[10px] bottom-[10px]">
				<span
					class="inline-flex items-center rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
				>
					{event.cost === 'Free / Sponsored' ? 'Free' : '$'}
				</span>
			</span>
		{/if}
	</div>
	<div class="flex min-h-0 flex-1 flex-col p-4 px-[18px]">
		{#if types.length}
			<div class="mb-2 flex flex-wrap gap-[5px]">
				{#each types.slice(0, 2) as tag}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{tag}</span
					>
				{/each}
			</div>
		{/if}
		<h3 class="mb-[5px] font-serif text-base leading-[1.35] font-semibold text-[var(--dark)]">
			{event.title}
		</h3>
		{#if event.location || event.region}
			<p class="mb-[6px] flex items-center gap-1 font-sans text-xs text-[var(--muted-foreground)]">
				<MapPin class="h-[14px] w-[14px] flex-none text-inherit" aria-hidden="true" />
				{event.location ?? event.region}
			</p>
		{/if}
		{#if event.organizationName}
			<p class="mb-[6px] flex items-center gap-1 font-sans text-xs text-[var(--muted-foreground)]">
				{event.organizationName}
			</p>
		{/if}
		{#if plainDesc}
			<p
				class="mb-[14px] line-clamp-3 min-h-0 flex-auto text-[13px] leading-[1.5] text-[var(--mid)]"
			>
				{plainDesc}
			</p>
		{/if}
		<span
			class="mt-auto block flex-none rounded-[var(--radius)] bg-[var(--teal)] py-[9px] text-center font-sans text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[filter] duration-150 hover:brightness-110"
			>View event</span
		>
	</div>
</a>
