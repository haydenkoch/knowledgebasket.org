<script lang="ts">
	import type { JobItem } from '$lib/data/kb';

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
		const short = deadline.slice(0, 50);
		const inDays = (d: Date) => Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
		const parsed = new Date(deadline);
		if (isNaN(parsed.getTime())) return { label: short, kind: 'ok' };
		const days = inDays(parsed);
		const label =
			days <= 7
				? `Closes ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
				: short;
		return { label, kind: days <= 7 ? 'urgent' : 'ok' };
	}

	const pill = $derived(deadlinePill(job.applicationDeadline));
</script>

<a
	{href}
	class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-[box-shadow,transform] duration-150 hover:translate-x-[3px] hover:no-underline hover:shadow-[var(--shh)]"
	style="animation-delay: {index * 30}ms"
>
	<div
		class="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[var(--forest,#2d6a4f)] font-sans text-lg font-bold text-white"
	>
		{initials(job.employerName ?? job.title)}
	</div>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		{#if job.indigenousPriority}
			<span class="text-[11px] font-bold tracking-[0.06em] text-[var(--teal)] uppercase"
				>&#9733; Indigenous Hires Prioritized</span
			>
		{/if}
		<h3 class="font-serif text-base leading-[1.3] font-semibold text-[var(--dark)]">{job.title}</h3>
		{#if job.employerName}
			<p class="text-sm text-[var(--muted-foreground)]">{job.employerName}</p>
		{/if}
		{#if job.sector || job.jobType}
			<div class="mb-1 flex flex-wrap gap-1">
				{#if job.sector}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{job.sector}</span
					>
				{/if}
				{#if job.jobType}
					<span
						class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
						>{job.jobType}</span
					>
				{/if}
			</div>
		{/if}
		{#if job.location || job.seniority}
			<div class="flex flex-wrap gap-1.5 text-xs text-[var(--muted-foreground)]">
				{#if job.location}<span>{job.location}</span>{/if}
				{#if job.seniority}<span>{job.seniority}</span>{/if}
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
