<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { legalConfig } from '$lib/legal/config';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import type { Component } from 'svelte';

	const coils: { title: string; description: string; href: string; icon: Component; color: string }[] = [
		{
			title: 'Events',
			description: 'Gatherings, workshops, conferences, and cultural moments worth showing up for.',
			href: '/events',
			icon: CalendarDays,
			color: 'var(--teal)'
		},
		{
			title: 'Funding',
			description: 'Grants, contracts, and fellowships supporting Indigenous communities and organizations.',
			href: '/funding',
			icon: HandCoins,
			color: 'var(--gold)'
		},
		{
			title: 'Red Pages',
			description: 'Organizations, businesses, and community resources in a friendlier directory.',
			href: '/red-pages',
			icon: Store,
			color: 'var(--red)'
		},
		{
			title: 'Jobs',
			description: 'Work opportunities organized to help people find the right fit.',
			href: '/jobs',
			icon: Briefcase,
			color: 'var(--forest)'
		},
		{
			title: 'Toolbox',
			description: 'Practical resources, guides, and materials gathered into a usable knowledge base.',
			href: '/toolbox',
			icon: Wrench,
			color: 'var(--slate)'
		}
	];
</script>

<svelte:head>
	<title>About Knowledge Basket</title>
	<meta
		name="description"
		content="Knowledge Basket brings events, opportunities, jobs, directory listings, and practical resources into one warmer, easier-to-use community product."
	/>
</svelte:head>

<article class="about-page">
	<!-- Hero -->
	<header class="about-hero">
		<div class="about-hero__inner">
			<p class="about-hero__kicker">About</p>
			<h1 class="about-hero__title">
				A warmer way to explore<br />community knowledge.
			</h1>
			<p class="about-hero__lede">
				Knowledge Basket brings together events, funding, jobs, a business directory, and
				practical resources into one place — making it easier to find what is happening,
				what is available, and who is doing meaningful work across the community.
			</p>
			<p class="about-hero__attribution">
				Operated by {legalConfig.operatorName}
			</p>
		</div>
	</header>

	<!-- Coils -->
	<section class="about-coils">
		<div class="about-coils__inner">
			<h2 class="about-section-heading">What lives here</h2>
			<div class="about-coils__grid">
				{#each coils as coil}
					<a href={coil.href} class="about-coil-row">
						<span class="about-coil-row__icon" style:--coil-color={coil.color}>
							<coil.icon size={20} />
						</span>
						<span class="about-coil-row__body">
							<span class="about-coil-row__title">{coil.title}</span>
							<span class="about-coil-row__desc">{coil.description}</span>
						</span>
						<ArrowRight size={16} class="about-coil-row__arrow" />
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="about-section about-section--muted">
		<div class="about-section__inner">
			<h2 class="about-section-heading">How submissions work</h2>
			<div class="about-prose">
				<p>
					Community members can submit events, funding, jobs, businesses, and resources.
					Submissions enter a moderation flow before appearing publicly — staff may edit
					for clarity, formatting, or policy compliance.
				</p>
			</div>
		</div>
	</section>

	<!-- Bottom links -->
	<section class="about-section">
		<div class="about-section__inner">
			<div class="about-links-grid">
				<div class="about-link-block">
					<h3 class="about-link-block__title">Open source</h3>
					<p class="about-link-block__desc">
						Knowledge Basket is built with open source software. We keep a public
						thank-you page listing every dependency.
					</p>
					<Button href="/open-source" variant="secondary" class="mt-3 gap-2">
						View open source thanks <ArrowRight size={14} />
					</Button>
				</div>

				<div class="about-link-block">
					<h3 class="about-link-block__title">Legal &amp; privacy</h3>
					<p class="about-link-block__desc">
						For privacy rights, cookie choices, and site terms, use the dedicated legal pages.
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<Button href="/privacy" variant="secondary">Privacy</Button>
						<Button href="/terms" variant="secondary">Terms</Button>
						<Button href="/cookies" variant="secondary">Cookies</Button>
					</div>
				</div>
			</div>
		</div>
	</section>
</article>

<style>
	/* ── Hero ──────────────────────────────────────────── */
	.about-hero {
		background: var(--color-lakebed-950);
		color: #fff;
		padding: 4rem 1rem 3.5rem;
	}
	@media (min-width: 768px) {
		.about-hero {
			padding: 5.5rem 2rem 4.5rem;
		}
	}
	.about-hero__inner {
		max-width: 720px;
		margin: 0 auto;
	}
	.about-hero__kicker {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-flicker-400);
		margin-bottom: 1.25rem;
	}
	.about-hero__title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(2rem, 5vw, 3.25rem);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0 0 1.5rem;
	}
	.about-hero__lede {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.75);
		max-width: 600px;
	}
	.about-hero__attribution {
		margin-top: 1.75rem;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.4);
	}

	/* ── Section reusable ─────────────────────────────── */
	.about-section {
		padding: 3rem 1rem;
	}
	@media (min-width: 768px) {
		.about-section {
			padding: 3.5rem 2rem;
		}
	}
	.about-section--muted {
		background: var(--color-alpine-snow-100);
	}
	.about-section__inner {
		max-width: 720px;
		margin: 0 auto;
	}
	.about-section-heading {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-obsidian-500);
		margin-bottom: 1.5rem;
	}
	.about-prose {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.about-prose p {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		line-height: 1.75;
		color: var(--color-obsidian-700);
		margin: 0;
	}

	/* ── Coils grid ───────────────────────────────────── */
	.about-coils {
		padding: 3rem 1rem;
	}
	@media (min-width: 768px) {
		.about-coils {
			padding: 3.5rem 2rem;
		}
	}
	.about-coils__inner {
		max-width: 720px;
		margin: 0 auto;
	}
	.about-coils__grid {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--border);
	}
	.about-coil-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		color: inherit;
		transition: background-color 0.12s ease;
		margin: 0 -0.5rem;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
		border-radius: 6px;
	}
	.about-coil-row:hover {
		background: var(--color-alpine-snow-100);
		text-decoration: none;
		border-color: transparent;
	}
	.about-coil-row__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--coil-color) 10%, transparent);
		color: var(--coil-color);
		flex-shrink: 0;
	}
	.about-coil-row__body {
		flex: 1;
		min-width: 0;
	}
	.about-coil-row__title {
		display: block;
		font-family: var(--font-sans);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-obsidian-950);
	}
	.about-coil-row__desc {
		display: block;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-obsidian-500);
		margin-top: 2px;
	}
	:global(.about-coil-row__arrow) {
		flex-shrink: 0;
		color: var(--color-obsidian-400);
		opacity: 0;
		transform: translateX(-4px);
		transition: opacity 0.15s ease, transform 0.15s ease;
	}
	.about-coil-row:hover :global(.about-coil-row__arrow) {
		opacity: 1;
		transform: translateX(0);
	}

	/* ── Bottom links grid ────────────────────────────── */
	.about-links-grid {
		display: grid;
		gap: 2.5rem;
	}
	@media (min-width: 640px) {
		.about-links-grid {
			grid-template-columns: 1fr 1fr;
			gap: 3rem;
		}
	}
	.about-link-block__title {
		font-family: var(--font-sans);
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-obsidian-950);
		margin: 0 0 0.5rem;
	}
	.about-link-block__desc {
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-obsidian-600);
		margin: 0;
	}
</style>
