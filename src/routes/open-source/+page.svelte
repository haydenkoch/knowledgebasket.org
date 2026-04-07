<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? '') as string);
</script>

<SeoHead
	{origin}
	pathname="/open-source"
	title="Open Source Thanks | Knowledge Basket"
	description="A living thank-you page for the open source libraries and tools that help power Knowledge Basket."
	ogImage={buildOgImagePath({
		title: 'Open Source Thanks',
		eyebrow: 'Built on the work of others',
		theme: 'open-source',
		meta: `${data.openSource.totalDirectPackages} packages powering Knowledge Basket`
	})}
	ogImageAlt="Knowledge Basket open source social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Open Source', pathname: '/open-source' }
	]}
/>

<article class="oss-page">
	<header class="oss-hero">
		<div class="oss-hero__inner">
			<p class="oss-hero__kicker">Open Source</p>
			<h1 class="oss-hero__title">Built on the work of others.</h1>
			<p class="oss-hero__lede">
				Knowledge Basket depends on {data.openSource.totalDirectPackages} open source packages. This page
				exists to say thank you. Click any name to visit its repository.
			</p>
			<a href="/about" class="oss-hero__back">&larr; Back to About</a>
		</div>
	</header>

	{#each data.openSource.groups as group}
		<section class="oss-group">
			<div class="oss-group__inner">
				<div class="oss-group__header">
					<h2 class="oss-group__title">{group.title}</h2>
					<p class="oss-group__desc">{group.description}</p>
					<span class="oss-group__count">{group.packages.length}</span>
				</div>
				<ul class="oss-list">
					{#each group.packages as pkg}
						<li class="oss-list__item">
							<a
								href={pkg.repositoryUrl ?? pkg.homepage ?? pkg.npmUrl}
								target="_blank"
								rel="noreferrer"
								class="oss-list__link"
							>
								<span class="oss-list__name">{pkg.name}</span>
								<ExternalLinkIcon size={13} class="oss-list__ext" />
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/each}
</article>

<style>
	/* ── Hero ──────────────────────────────────────────── */
	.oss-hero {
		background: var(--color-lakebed-950);
		color: #fff;
		padding: 4rem 1rem 3rem;
	}
	@media (min-width: 768px) {
		.oss-hero {
			padding: 5rem 2rem 4rem;
		}
	}
	.oss-hero__inner {
		max-width: 720px;
		margin: 0 auto;
	}
	.oss-hero__kicker {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-flicker-400);
		margin-bottom: 1.25rem;
	}
	.oss-hero__title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		margin: 0 0 1.25rem;
	}
	.oss-hero__lede {
		font-family: var(--font-serif);
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.7);
		max-width: 560px;
	}
	.oss-hero__back {
		display: inline-block;
		margin-top: 1.5rem;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
		transition: color 0.15s ease;
	}
	.oss-hero__back:hover {
		color: rgba(255, 255, 255, 0.8);
		text-decoration: none;
	}

	/* ── Group sections ───────────────────────────────── */
	.oss-group {
		padding: 2.5rem 1rem;
		border-bottom: 1px solid var(--border);
	}
	@media (min-width: 768px) {
		.oss-group {
			padding: 3rem 2rem;
		}
	}
	.oss-group:last-child {
		border-bottom: none;
	}
	.oss-group__inner {
		max-width: 720px;
		margin: 0 auto;
	}
	.oss-group__header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1rem;
		margin-bottom: 1.5rem;
	}
	.oss-group__title {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-obsidian-500);
		margin: 0;
	}
	.oss-group__count {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		color: var(--color-obsidian-400);
	}
	.oss-group__desc {
		width: 100%;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-obsidian-500);
		margin: 0;
	}

	/* ── Package list ─────────────────────────────────── */
	.oss-list {
		list-style: none;
		margin: 0;
		padding: 0;
		columns: 1;
		column-gap: 2rem;
	}
	@media (min-width: 480px) {
		.oss-list {
			columns: 2;
		}
	}
	@media (min-width: 768px) {
		.oss-list {
			columns: 3;
		}
	}
	.oss-list__item {
		break-inside: avoid;
		padding: 0;
	}
	.oss-list__link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-sans);
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--color-obsidian-800);
		text-decoration: none;
		padding: 4px 0;
		transition: color 0.12s ease;
		line-height: 1.4;
	}
	.oss-list__link:hover {
		color: var(--color-lakebed-700);
		text-decoration: none;
	}
	.oss-list__name {
		word-break: break-all;
	}
	:global(.oss-list__ext) {
		flex-shrink: 0;
		opacity: 0;
		color: var(--color-obsidian-400);
		transition: opacity 0.12s ease;
	}
	.oss-list__link:hover :global(.oss-list__ext) {
		opacity: 1;
	}
</style>
