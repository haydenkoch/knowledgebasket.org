<script lang="ts">
	let { status = 'unknown' }: { status?: string } = $props();

	const variants: Record<string, string> = {
		pending:
			'border-[color:color-mix(in_srgb,var(--color-flicker-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_90%,white)] text-[var(--color-flicker-900)]',
		pending_review:
			'border-[color:color-mix(in_srgb,var(--color-flicker-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_90%,white)] text-[var(--color-flicker-900)]',
		published:
			'border-[color:color-mix(in_srgb,var(--color-pinyon-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_92%,white)] text-[var(--color-pinyon-800)]',
		approved:
			'border-[color:color-mix(in_srgb,var(--color-pinyon-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_92%,white)] text-[var(--color-pinyon-800)]',
		auto_approved:
			'border-[color:color-mix(in_srgb,var(--color-lakebed-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_92%,white)] text-[var(--color-lakebed-900)]',
		rejected:
			'border-[color:color-mix(in_srgb,var(--color-ember-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_92%,white)] text-[var(--color-ember-900)]',
		cancelled:
			'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-800)]',
		archived:
			'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-800)]',
		draft:
			'border-[color:color-mix(in_srgb,var(--color-lakebed-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_92%,white)] text-[var(--color-lakebed-900)]',
		needs_info:
			'border-[color:color-mix(in_srgb,var(--color-salmonberry-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-salmonberry-50)_92%,white)] text-[var(--color-salmonberry-900)]',
		closed:
			'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-800)]',
		unknown:
			'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-700)]'
	};

	const labels: Record<string, string> = {
		pending: 'Pending',
		pending_review: 'Needs review',
		published: 'Published',
		approved: 'Approved',
		auto_approved: 'Auto-approved',
		rejected: 'Rejected',
		cancelled: 'Cancelled',
		archived: 'Archived',
		draft: 'Draft',
		needs_info: 'Waiting on info',
		closed: 'Closed',
		unknown: 'Unknown'
	};

	const classes = $derived(variants[status] ?? variants.unknown);
	const label = $derived(labels[status] ?? status.replace(/_/g, ' '));
</script>

<span
	class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase {classes}"
>
	{label}
</span>
