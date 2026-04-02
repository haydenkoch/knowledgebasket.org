<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';

	let { event, index = 0 }: { event: EventItem; index?: number } = $props();

	const href = $derived(`/events/${event.slug ?? event.id}`);

	function formatDate(d?: string) {
		if (!d) return '';
		try {
			return new Date(d).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return '';
		}
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
			<span class="absolute text-[48px] opacity-[0.35]" aria-hidden="true">🗓</span>
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
				<svg
					class="h-[14px] w-[14px] flex-none text-inherit"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
					/><circle cx="12" cy="9" r="2.5" /></svg
				>
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
