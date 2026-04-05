<script lang="ts">
	let { health = 'unknown' }: { health?: string } = $props();

	const variants: Record<string, string> = {
		healthy:
			'border-[color:color-mix(in_srgb,var(--color-pinyon-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_92%,white)] text-[var(--color-pinyon-800)]',
		degraded:
			'border-[color:color-mix(in_srgb,var(--color-flicker-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_90%,white)] text-[var(--color-flicker-900)]',
		stale:
			'border-[color:color-mix(in_srgb,var(--color-flicker-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_90%,white)] text-[var(--color-flicker-900)]',
		unhealthy:
			'border-[color:color-mix(in_srgb,var(--color-ember-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_92%,white)] text-[var(--color-ember-900)]',
		broken:
			'border-[color:color-mix(in_srgb,var(--color-ember-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_92%,white)] text-[var(--color-ember-900)]',
		auth_required:
			'border-[color:color-mix(in_srgb,var(--color-salmonberry-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-salmonberry-50)_92%,white)] text-[var(--color-salmonberry-900)]',
		unknown:
			'border-[color:color-mix(in_srgb,var(--color-granite-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_94%,white)] text-[var(--color-granite-700)]'
	};

	const labels: Record<string, string> = {
		healthy: 'Healthy',
		degraded: 'Needs attention',
		stale: 'Stale',
		unhealthy: 'Unhealthy',
		broken: 'Broken',
		auth_required: 'Auth needed',
		unknown: 'Unknown'
	};

	const classes = $derived(variants[health] ?? variants.unknown);
	const label = $derived(labels[health] ?? health.replace(/_/g, ' '));
</script>

<span
	class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase {classes}"
>
	{label}
</span>
