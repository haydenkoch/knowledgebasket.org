<script lang="ts">
	import LogoBadge from '$lib/components/molecules/LogoBadge.svelte';
	import type { JobItem } from '$lib/data/kb';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import Star from '@lucide/svelte/icons/star';

	let { job, index = 0 }: { job: JobItem; index?: number } = $props();

	const href = $derived(`/jobs/${job.slug ?? job.id}`);

	function initials(s: string): string {
		if (!s?.trim()) return '?';
		return s
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}

	function deadlinePill(deadline?: string): { label: string; kind: 'urgent' | 'ok' | 'rolling' } {
		if (!deadline?.trim()) return { label: 'Open until filled', kind: 'rolling' };
		const lower = deadline.toLowerCase();
		if (lower.includes('rolling') || lower.includes('open until'))
			return { label: 'Open until filled', kind: 'rolling' };
		const inDays = (d: Date) => Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
		const parsed = new Date(deadline);
		if (isNaN(parsed.getTime()))
			return { label: formatDisplayValue(deadline, { key: 'applicationDeadline' }), kind: 'ok' };
		const days = inDays(parsed);
		const shortDate = formatDisplayValue(deadline, {
			key: 'applicationDeadline',
			dateOptions: { month: 'short', day: 'numeric' }
		});
		const fullDate = formatDisplayValue(deadline, { key: 'applicationDeadline' });
		const label = days <= 7 ? `Closes ${shortDate}` : fullDate;
		return { label, kind: days <= 7 ? 'urgent' : 'ok' };
	}

	const pill = $derived(deadlinePill(job.applicationDeadline));
	const sectorLabel = $derived(
		job.sector ? formatDisplayValue(job.sector, { key: 'sector' }) : null
	);
	const jobTypeLabel = $derived(
		job.jobType ? formatDisplayValue(job.jobType, { key: 'jobType' }) : null
	);
	const workArrangementLabel = $derived(
		job.workArrangement ? formatDisplayValue(job.workArrangement, { key: 'workArrangement' }) : null
	);
	const seniorityLabel = $derived(
		job.seniority ? formatDisplayValue(job.seniority, { key: 'seniority' }) : null
	);

	function normalizeForComparison(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	}

	function locationAlreadyCoversArrangement(
		location: string | undefined,
		arrangement: string | null
	): boolean {
		if (!location || !arrangement) return false;

		const normalizedLocation = normalizeForComparison(location);
		const normalizedArrangement = normalizeForComparison(arrangement);
		if (!normalizedLocation || !normalizedArrangement) return false;

		if (normalizedLocation.includes(normalizedArrangement)) return true;
		if (normalizedArrangement === 'in office' && normalizedLocation.includes('office')) return true;
		return false;
	}

	const metaDetails = $derived.by(() => {
		const details: Array<{ label: string; value: string }> = [];
		const locationValue = job.location?.trim();
		const regionValue = job.region?.trim();

		if (locationValue) details.push({ label: 'Location', value: locationValue });
		else if (regionValue) details.push({ label: 'Region', value: regionValue });

		if (
			workArrangementLabel &&
			!locationAlreadyCoversArrangement(locationValue, workArrangementLabel)
		) {
			details.push({ label: 'Work setup', value: workArrangementLabel });
		}

		if (seniorityLabel) details.push({ label: 'Level', value: seniorityLabel });

		return details;
	});

	const fallbackInitials = $derived(initials(job.employerName ?? job.title));
</script>

<a
	{href}
	class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-[box-shadow,transform] duration-150 hover:translate-x-[3px] hover:no-underline hover:shadow-[var(--shh)]"
	style="animation-delay: {index * 30}ms"
>
	<LogoBadge
		src={job.imageUrl ?? null}
		alt=""
		fallbackText={fallbackInitials}
		size="card"
		containerClass="flex-none"
	/>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		{#if job.indigenousPriority}
			<span class="text-[11px] font-bold tracking-[0.06em] text-[var(--teal)] uppercase"
				><Star class="inline h-3 w-3 fill-current" /> Indigenous Hires Prioritized</span
			>
		{/if}
		<h3 class="font-serif text-base leading-[1.3] font-semibold text-[var(--dark)]">{job.title}</h3>
		{#if job.employerName}
			<p class="text-sm text-[var(--muted-foreground)]">{job.employerName}</p>
		{/if}
		{#if sectorLabel || jobTypeLabel}
			<div class="mb-1 flex flex-wrap gap-1">
				{#if sectorLabel}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{sectorLabel}</span
					>
				{/if}
				{#if jobTypeLabel}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{jobTypeLabel}</span
					>
				{/if}
			</div>
		{/if}
		{#if metaDetails.length > 0}
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--muted-foreground)]"
			>
				{#each metaDetails as detail, detailIndex (`${detail.label}-${detail.value}`)}
					<span class="inline-flex items-baseline gap-1.5">
						{#if detailIndex > 0}
							<span aria-hidden="true" class="text-[var(--line)]">•</span>
						{/if}
						<span class="font-semibold text-[var(--dark)]">{detail.label}:</span>
						<span>{detail.value}</span>
					</span>
				{/each}
			</div>
		{/if}
	</div>
	<div class="flex flex-none flex-col items-end gap-2">
		<span
			class="rounded-full px-2 py-0.5 text-[11px] font-semibold {pill.kind === 'urgent'
				? 'bg-red-100 text-red-700'
				: 'bg-[var(--muted)] text-[var(--muted-foreground)]'}">{pill.label}</span
		>
	</div>
</a>
