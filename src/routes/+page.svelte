<script lang="ts">
	import KbSearch from '$lib/components/organisms/KbSearch.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import { coilLabels, type CoilKey } from '$lib/data/kb';

	const coils: { key: CoilKey; label: string; path: string; emoji: string; desc: string; gradient: string; btnBg: string }[] = [
		{
			key: 'events',
			label: coilLabels.events,
			path: '/events',
			emoji: '🗓',
			desc: 'Gatherings, trainings, and cultural events that connect Tribes, partners, and community across the Sierra Nevada.',
			gradient: 'linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))',
			btnBg: 'var(--teal)'
		},
		{
			key: 'funding',
			label: coilLabels.funding,
			path: '/funding',
			emoji: '💰',
			desc: 'Grants, contracts, and opportunities for Tribal governments, Native-led nonprofits, and Indigenous individuals.',
			gradient: 'linear-gradient(135deg, var(--color-flicker-900), var(--color-flicker-100))',
			btnBg: 'var(--gold)'
		},
		{
			key: 'redpages',
			label: coilLabels.redpages,
			path: '/red-pages',
			emoji: '📖',
			desc: 'Native-owned vendors, artists, and service providers you can hire and support.',
			gradient: 'linear-gradient(135deg, var(--color-salmonberry-900), var(--color-salmonberry-100))',
			btnBg: 'var(--red)'
		},
		{
			key: 'jobs',
			label: coilLabels.jobs,
			path: '/jobs',
			emoji: '💼',
			desc: 'Jobs and fellowships with Tribes and Indigenous-serving organizations, with Indigenous hires prioritized.',
			gradient: 'linear-gradient(135deg, var(--color-pinyon-800), var(--color-pinyon-200))',
			btnBg: 'var(--forest)'
		},
		{
			key: 'toolbox',
			label: coilLabels.toolbox,
			path: '/toolbox',
			emoji: '🧰',
			desc: 'Toolkits, policy documents, and a digital library for building Indigenous-based economies.',
			gradient: 'linear-gradient(135deg, var(--color-glacier-600), var(--color-glacier-200))',
			btnBg: 'var(--slate)'
		}
	];
</script>

{#snippet weaveHome()}
	<defs>
		<pattern id="wv-home" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="10" height="4" fill="white" />
			<rect x="10" y="10" width="10" height="4" fill="white" />
			<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-home)" />
{/snippet}

<div>
	<KbHero
		coil="home"
		eyebrow="Knowledge Basket"
		title="Search the Knowledge Basket"
		description="Find events, funding, Native-owned vendors, jobs, and tools that support Indigenous-led economies in the Sierra Nevada and beyond."
		weave={weaveHome}
	/>

	<section class="px-10 py-5 pb-7 bg-[var(--color-alpine-100,var(--bone))] border-b border-[var(--rule)]" aria-labelledby="kb-home-search">
		<div class="max-w-[720px] mx-auto">
			<h2 id="kb-home-search" class="sr-only">Search Knowledge Basket</h2>
			<KbSearch variant="light" />
			<p class="mt-2 font-sans text-[13px] text-[var(--muted-foreground)]">Search events, funding, Red Pages vendors, jobs, and toolbox resources from one place.</p>
		</div>
	</section>

	<section class="px-10 py-4 pb-12 border-t border-[var(--rule)] bg-[var(--color-alpine-100,var(--bone))]" aria-labelledby="kb-coils-heading">
		<div class="max-w-[1080px] mx-auto">
			<div class="flex justify-between items-center mb-4 flex-wrap gap-2">
				<h2 id="kb-coils-heading" class="font-serif text-[22px] font-semibold text-[var(--dark)] m-0">Browse the five coils</h2>
				<p class="font-sans text-xs text-[var(--muted-foreground)] m-0">Jump straight into events, funding, Red Pages, jobs, or the toolbox.</p>
			</div>
			<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
				{#each coils as { key, label, path, emoji, desc, gradient, btnBg }}
					<a href={path} class="bg-white rounded-lg shadow-[var(--sh)] overflow-hidden flex flex-col transition-[transform,box-shadow] duration-150 cursor-pointer border border-[var(--rule)] no-underline hover:-translate-y-[3px] hover:shadow-[var(--shh)] hover:no-underline">
						<div class="h-[148px] flex items-center justify-center relative overflow-hidden" style="background: {gradient}">
							<div class="absolute text-[48px] opacity-[0.35]">{emoji}</div>
						</div>
						<div class="p-4 px-[18px] flex-1 min-h-0 flex flex-col">
							<div class="font-serif text-base font-semibold text-[var(--dark)] leading-[1.35] mb-[5px]">{label}</div>
							<div class="text-[13px] leading-[1.5] text-[var(--mid)] mb-[14px] flex-auto min-h-0 line-clamp-3">{desc}</div>
							<span class="block flex-none text-center text-white font-sans text-[13px] font-bold py-[9px] rounded-[var(--radius)] no-underline tracking-[0.03em] transition-[filter] duration-150 mt-auto hover:brightness-110" style="background: {btnBg}">Browse {label}</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
