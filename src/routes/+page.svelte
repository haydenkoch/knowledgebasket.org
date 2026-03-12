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

<div class="kb-coil kb-coil--home">
	<KbHero
		heroClass="kb-hero--home"
		eyebrow="Knowledge Basket"
		title="Search the Knowledge Basket"
		description="Find events, funding, Native-owned vendors, jobs, and tools that support Indigenous-led economies in the Sierra Nevada and beyond."
	>
		<svelte:fragment slot="weave">
			<defs>
				<pattern id="wv-home" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
					<rect x="0" y="0" width="10" height="4" fill="white" />
					<rect x="10" y="10" width="10" height="4" fill="white" />
					<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
				</pattern>
			</defs>
			<rect width="200" height="400" fill="url(#wv-home)" />
		</svelte:fragment>
	</KbHero>

	<section class="kb-home-search-section" aria-labelledby="kb-home-search">
		<div class="kb-home-search-inner">
			<h2 id="kb-home-search" class="sr-only">Search Knowledge Basket</h2>
			<KbSearch variant="light" />
			<p class="kb-home-search-hint">Search events, funding, Red Pages vendors, jobs, and toolbox resources from one place.</p>
		</div>
	</section>

	<section class="kb-home-coils" aria-labelledby="kb-coils-heading">
		<div class="kb-home-coils-inner">
			<div class="kb-home-coils-header">
				<h2 id="kb-coils-heading">Browse the five coils</h2>
				<p>Jump straight into events, funding, Red Pages, jobs, or the toolbox.</p>
			</div>
			<div class="kb-grid">
				{#each coils as { key, label, path, emoji, desc, gradient, btnBg }}
					<a href={path} class="kb-card kb-card--home-coil">
						<div class="kb-cimg" style="background: {gradient}">
							<div class="kb-cimg-ico">{emoji}</div>
						</div>
						<div class="kb-cbody">
							<div class="kb-ctit">{label}</div>
							<div class="kb-cdesc">{desc}</div>
							<span class="kb-ccta" style="background: {btnBg}">Browse {label}</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
