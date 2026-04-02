<script lang="ts">
	import type { CoilKey } from '$lib/data/kb';

	interface Props {
		coil: CoilKey;
		heading: string;
		description: string;
		href: string;
		label: string;
	}

	let { coil, heading, description, href, label }: Props = $props();

	const coilColors: Record<CoilKey, string> = {
		events: 'var(--teal)',
		funding: 'var(--gold)',
		redpages: 'var(--red)',
		jobs: 'var(--forest)',
		toolbox: 'var(--slate)'
	};

	const coilBg: Record<CoilKey, string> = {
		events: 'var(--color-lakebed-50, #f0f4f6)',
		funding: 'var(--color-flicker-50, #fef9f0)',
		redpages: 'var(--color-salmonberry-50, #fef2f2)',
		jobs: 'var(--color-pinyon-50, #f0f5f2)',
		toolbox: 'var(--color-granite-50, #f5f5f5)'
	};

	const btnColor = $derived(coilColors[coil] ?? 'var(--teal)');
	const bgColor = $derived(coilBg[coil] ?? 'var(--color-alpine-100)');
</script>

<div
	class="flex flex-wrap items-center justify-between gap-6 border-t border-[var(--rule)] px-4 py-8 sm:px-6 lg:px-10"
	style="background: {bgColor}"
>
	<div>
		<h3 class="m-0 font-serif text-lg font-semibold" style="color: {btnColor}">{heading}</h3>
		<p class="m-0 mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
	</div>
	<a
		{href}
		class="inline-block flex-none rounded px-6 py-3 font-sans text-sm font-semibold text-white no-underline transition-[filter] duration-150 hover:no-underline hover:brightness-110"
		style="background: {btnColor}">{label}</a
	>
</div>
