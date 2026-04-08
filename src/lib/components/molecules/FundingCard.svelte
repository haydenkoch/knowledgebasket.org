<script lang="ts">
	import type { FundingItem } from '$lib/data/kb';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { stripHtml } from '$lib/utils/format';
	import { getPlaceholderImage } from '$lib/data/placeholders';

	let { item, index = 0 }: { item: FundingItem; index?: number } = $props();

	const href = $derived(`/funding/${item.slug ?? item.id}`);
	const plainDesc = $derived(item.description ? stripHtml(String(item.description)) : '');
	const mediaClass = $derived(
		'relative flex h-[148px] items-center justify-center overflow-hidden bg-[var(--color-lakebed-950,#10181e)]'
	);
	const applicationStatusLabel = $derived(
		item.applicationStatus
			? formatDisplayValue(item.applicationStatus, { key: 'applicationStatus' })
			: null
	);
	const fundingTypeLabel = $derived(
		item.fundingType ? formatDisplayValue(item.fundingType, { key: 'fundingType' }) : null
	);
	const deadlineLabel = $derived(
		item.deadline ? formatDisplayValue(item.deadline, { key: 'deadline' }) : null
	);
</script>

<a
	{href}
	class="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[var(--rule)] bg-white no-underline shadow-[var(--sh)] transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:no-underline hover:shadow-[var(--shh)]"
	style="animation-delay: {index * 40}ms"
>
	<div class={mediaClass}>
		{#if item.imageUrl}
			<img
				src={item.imageUrl}
				alt=""
				aria-hidden="true"
				class="absolute inset-0 h-full w-full scale-110 object-cover blur-lg brightness-50 saturate-125"
				loading="lazy"
			/>
			<img
				src={item.imageUrl}
				alt={item.funderName ? `${item.funderName} logo` : item.title}
				class="relative h-full w-full object-contain p-5 drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
				loading="lazy"
			/>
		{:else}
			<img
				src={getPlaceholderImage(index)}
				alt=""
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		{/if}
		{#if applicationStatusLabel}
			<span
				class="absolute bottom-2 left-3 rounded bg-black/30 px-2 py-0.5 text-[11px] font-bold tracking-[0.05em] text-white/90 uppercase backdrop-blur-sm"
				>{applicationStatusLabel}</span
			>
		{/if}
	</div>
	<div class="flex min-h-0 flex-1 flex-col p-4">
		<div class="mb-1.5 flex flex-wrap gap-1">
			{#if fundingTypeLabel}
				<span
					class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
					>{fundingTypeLabel}</span
				>
			{/if}
		</div>
		<h3 class="mb-1 font-serif text-base leading-[1.35] font-semibold text-[var(--dark)]">
			{item.title}
		</h3>
		{#if item.amountDescription}
			<p class="mb-1 font-sans text-xs text-[var(--muted-foreground)]">{item.amountDescription}</p>
		{/if}
		{#if item.funderName}
			<p class="mb-1 font-sans text-xs text-[var(--muted-foreground)]">{item.funderName}</p>
		{/if}
		{#if deadlineLabel}
			<p class="mb-1 font-sans text-xs text-[var(--muted-foreground)]">Deadline: {deadlineLabel}</p>
		{/if}
		{#if plainDesc}
			<p
				class="mb-3 line-clamp-3 overflow-hidden text-[13px] leading-[1.5] text-[var(--mid)]"
				style="max-height: calc(1.5em * 3);"
			>
				{plainDesc}
			</p>
		{/if}
		<span
			class="mt-auto block flex-none rounded-[var(--radius)] bg-[var(--gold)] py-2 text-center font-sans text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[filter] duration-150 hover:brightness-110"
			>View Opportunity</span
		>
	</div>
</a>
