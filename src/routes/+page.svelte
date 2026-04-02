<script lang="ts">
	import KbSearch from '$lib/components/organisms/KbSearch.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import { coilLabels, type CoilKey } from '$lib/data/kb';

	let { data } = $props();
	const canonicalUrl = $derived(`${data.origin ?? ''}/`);

	const coils: {
		key: CoilKey;
		label: string;
		path: string;
		emoji: string;
		desc: string;
		gradient: string;
		btnBg: string;
	}[] = [
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
			gradient:
				'linear-gradient(135deg, var(--color-salmonberry-900), var(--color-salmonberry-100))',
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

<svelte:head>
	<title>Knowledge Basket</title>
	<meta
		name="description"
		content="Search Knowledge Basket for Indigenous-led events, funding opportunities, Native-owned businesses, jobs, and practical resources."
	/>
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

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

	<section
		class="border-b border-[var(--rule)] bg-[var(--color-alpine-100,var(--bone))] px-4 py-5 pb-7 sm:px-6 lg:px-10"
		aria-labelledby="kb-home-search"
	>
		<div class="mx-auto max-w-[720px]">
			<h2 id="kb-home-search" class="sr-only">Search Knowledge Basket</h2>
			<KbSearch variant="light" />
			<p class="mt-2 font-sans text-[13px] text-[var(--muted-foreground)]">
				Search events, funding, Red Pages vendors, jobs, and toolbox resources from one place.
			</p>
		</div>
	</section>

	<section
		class="border-t border-[var(--rule)] bg-[var(--color-alpine-100,var(--bone))] px-4 py-4 pb-12 sm:px-6 lg:px-10"
		aria-labelledby="kb-coils-heading"
	>
		<div class="mx-auto max-w-[1080px]">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
				<h2
					id="kb-coils-heading"
					class="m-0 font-serif text-[22px] font-semibold text-[var(--dark)]"
				>
					Browse the five coils
				</h2>
				<p class="m-0 font-sans text-xs text-[var(--muted-foreground)]">
					Jump straight into events, funding, Red Pages, jobs, or the toolbox.
				</p>
			</div>
			<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
				{#each coils as { key, label, path, emoji, desc, gradient, btnBg }}
					<a
						href={path}
						class="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[var(--rule)] bg-white no-underline shadow-[var(--sh)] transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:no-underline hover:shadow-[var(--shh)]"
					>
						<div
							class="relative flex h-[148px] items-center justify-center overflow-hidden"
							style="background: {gradient}"
						>
							<div class="pointer-events-none absolute text-[48px] opacity-[0.35]">{emoji}</div>
						</div>
						<div class="flex min-h-0 flex-1 flex-col p-4 px-[18px]">
							<div
								class="mb-[5px] font-serif text-base leading-[1.35] font-semibold text-[var(--dark)]"
							>
								{label}
							</div>
							<div
								class="mb-[14px] line-clamp-3 min-h-0 flex-auto text-[13px] leading-[1.5] text-[var(--mid)]"
							>
								{desc}
							</div>
							<span
								class="mt-auto block flex-none rounded-[var(--radius)] py-[9px] text-center font-sans text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[filter] duration-150 hover:brightness-110"
								style="background: {btnBg}">Browse {label}</span
							>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
