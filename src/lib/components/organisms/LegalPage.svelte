<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LEGAL_LAST_UPDATED_DATE } from '$lib/legal/config';
	import { legalNavLinks } from '$lib/legal/config';
	import { page } from '$app/stores';

	interface Props {
		eyebrow?: string;
		title: string;
		description: string;
		lastUpdated?: string;
		children?: Snippet;
	}

	let {
		eyebrow = 'Legal',
		title,
		description,
		lastUpdated = LEGAL_LAST_UPDATED_DATE,
		children
	}: Props = $props();

	const pathname = $derived($page.url.pathname);
</script>

<article class="legal-page">
	<!-- Hero -->
	<header class="legal-hero">
		<div class="legal-hero__inner">
			<p class="legal-hero__kicker">{eyebrow}</p>
			<h1 class="legal-hero__title">{title}</h1>
			<p class="legal-hero__lede">{description}</p>
			<p class="legal-hero__updated">Last updated {lastUpdated}</p>
		</div>
	</header>

	<!-- Cross-nav -->
	<nav class="legal-nav" aria-label="Support and policy pages">
		<div class="legal-nav__inner">
			{#each legalNavLinks as link}
				<a
					href={link.href}
					class="legal-nav__link"
					class:legal-nav__link--active={pathname === link.href}
					aria-current={pathname === link.href ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</div>
	</nav>

	<!-- Body -->
	<div class="legal-body">
		<div class="legal-body__inner legal-prose">
			{@render children?.()}
		</div>
	</div>
</article>

<style>
	/* ── Hero ──────────────────────────────────────────── */
	.legal-hero {
		background: var(--color-lakebed-950);
		color: #fff;
		padding: 3.5rem 1rem 2.5rem;
	}
	@media (min-width: 768px) {
		.legal-hero {
			padding: 4.5rem 2rem 3.5rem;
		}
	}
	.legal-hero__inner {
		max-width: 720px;
		margin: 0 auto;
	}
	.legal-hero__kicker {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-flicker-400);
		margin-bottom: 1.25rem;
	}
	.legal-hero__title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.75rem, 4.5vw, 2.75rem);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0 0 1rem;
	}
	.legal-hero__lede {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.65);
		max-width: 560px;
	}
	.legal-hero__updated {
		margin-top: 1.25rem;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.35);
	}

	/* ── Cross-nav bar ────────────────────────────────── */
	.legal-nav {
		border-bottom: 1px solid var(--border);
		background: var(--color-alpine-snow-100);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	.legal-nav__inner {
		display: flex;
		gap: 0;
		max-width: 720px;
		margin: 0 auto;
		padding: 0 1rem;
	}
	@media (min-width: 768px) {
		.legal-nav__inner {
			padding: 0 2rem;
		}
	}
	.legal-nav__link {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-obsidian-500);
		text-decoration: none;
		padding: 0.85rem 1rem;
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		transition:
			color 0.12s ease,
			border-color 0.12s ease;
	}
	.legal-nav__link:hover {
		color: var(--color-obsidian-900);
		text-decoration: none;
	}
	.legal-nav__link--active {
		color: var(--color-obsidian-950);
		border-bottom-color: var(--color-lakebed-950);
	}

	/* ── Body / prose ─────────────────────────────────── */
	.legal-body {
		padding: 2.5rem 1rem 4rem;
	}
	@media (min-width: 768px) {
		.legal-body {
			padding: 3rem 2rem 5rem;
		}
	}
	.legal-body__inner {
		max-width: 720px;
		margin: 0 auto;
	}

	/* Prose styling — scoped so we don't need Tailwind typography plugin */
	.legal-prose :global(h2) {
		font-family: var(--font-sans);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-obsidian-950);
		margin: 2.5rem 0 0.75rem;
		scroll-margin-top: 6rem;
		letter-spacing: -0.005em;
		line-height: 1.3;
	}
	.legal-prose :global(h2:first-child) {
		margin-top: 0;
	}
	.legal-prose :global(p) {
		font-family: var(--font-serif);
		font-size: 0.92rem;
		line-height: 1.8;
		color: var(--color-obsidian-700);
		margin: 0 0 1rem;
	}
	.legal-prose :global(ul) {
		margin: 0 0 1.25rem;
		padding-left: 1.25rem;
	}
	.legal-prose :global(li) {
		font-family: var(--font-serif);
		font-size: 0.92rem;
		line-height: 1.75;
		color: var(--color-obsidian-700);
		margin-bottom: 0.35rem;
	}
	.legal-prose :global(li::marker) {
		color: var(--color-obsidian-400);
	}
	.legal-prose :global(strong) {
		font-weight: 700;
		color: var(--color-obsidian-900);
	}
	.legal-prose :global(a) {
		color: var(--color-lakebed-700);
		text-decoration: none;
		text-underline-offset: 3px;
		transition: color 0.12s ease;
	}
	.legal-prose :global(a:hover) {
		color: var(--color-lakebed-950);
		text-decoration: underline;
	}
</style>
