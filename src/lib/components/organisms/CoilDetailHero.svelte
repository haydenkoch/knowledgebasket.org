<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		getPlaceholderImageSrcset,
		DEFAULT_SIZES_HERO,
		LANDSCAPE_PLACEHOLDERS
	} from '$lib/data/placeholders';

	/**
	 * Shared hero for non-event coil detail pages (toolbox, funding, jobs,
	 * red-pages). 1:1 visual match for the events page hero
	 * (`src/routes/events/[slug]/+page.svelte`):
	 *   • full-bleed, image-forward — falls back to a deterministic landscape
	 *     placeholder (same set events uses) so it never paints a flat gradient
	 *   • solid `--color-lakebed-950` shell behind the image
	 *   • bottom-up dark scrim (0.85 → 0.45 → 0.05)
	 *   • content anchored to bottom-left, max-width 1200 on lg
	 *   • uniform `kb-coil-tag` chips inside the badges snippet
	 *   • optional bottom-left overlap `logo` (red-pages)
	 *   • optional bottom-right gallery filmstrip
	 *
	 * Render this **outside** your page's max-width wrapper.
	 */

	function hashKey(key: string): number {
		let h = 0;
		for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
		return Math.abs(h);
	}

	let {
		title,
		subtitle = undefined,
		bannerImages = [],
		selectedBannerIndex = 0,
		onSelectBanner = undefined,
		galleryLabel = 'Gallery',
		imageFit = 'cover',
		imageFrame = 'panel',
		placeholderKey = undefined,
		badges,
		eyebrow,
		extras,
		logo
	}: {
		title: string;
		subtitle?: string;
		bannerImages?: string[];
		selectedBannerIndex?: number;
		onSelectBanner?: (index: number) => void;
		galleryLabel?: string;
		imageFit?: 'cover' | 'contain' | 'logo-on-cover';
		imageFrame?: 'panel' | 'none';
		/** Stable string used to pick a deterministic placeholder image when no
		 * bannerImages are provided. Defaults to `title`. */
		placeholderKey?: string;
		badges?: Snippet;
		eyebrow?: Snippet;
		extras?: Snippet;
		logo?: Snippet;
	} = $props();

	const hasBanner = $derived(bannerImages.length > 0);
	const activeBanner = $derived(bannerImages[selectedBannerIndex] ?? bannerImages[0] ?? '');
	const placeholderIndex = $derived(
		hashKey(placeholderKey ?? title ?? '') % Math.max(LANDSCAPE_PLACEHOLDERS.length, 1)
	);
	const placeholder = $derived(
		hasBanner ? null : getPlaceholderImageSrcset(placeholderIndex, { sizes: DEFAULT_SIZES_HERO })
	);
</script>

<header
	class="coil-hero"
	class:has-logo={!!logo}
	class:contain-mode={imageFit === 'contain'}
	class:contain-framed={imageFit === 'contain' && imageFrame === 'panel'}
	class:contain-bleed={imageFit === 'contain' && imageFrame === 'none'}
	class:logo-on-cover={imageFit === 'logo-on-cover'}
>
	{#if hasBanner}
		{#if imageFit === 'logo-on-cover'}
			<img
				src={activeBanner}
				alt=""
				aria-hidden="true"
				class="coil-hero-img coil-hero-img--bg"
				loading="lazy"
			/>
			<img src={activeBanner} alt="" class="coil-hero-img coil-hero-img--logo" loading="lazy" />
		{:else}
			<img
				src={activeBanner}
				alt=""
				class="coil-hero-img"
				class:coil-hero-img--contain={imageFit === 'contain'}
				loading="lazy"
			/>
		{/if}
	{:else if placeholder}
		<img
			src={placeholder.src}
			srcset={placeholder.srcSet}
			sizes={placeholder.sizes}
			alt=""
			class="coil-hero-img"
			class:coil-hero-img--contain={imageFit === 'contain'}
			loading="lazy"
		/>
	{/if}
	<div class="coil-hero-overlay" aria-hidden="true"></div>

	<div class="coil-hero-content">
		<div class="coil-hero-copy">
			{#if badges}
				<div class="coil-hero-tags">{@render badges()}</div>
			{/if}
			{#if eyebrow}
				<div class="coil-hero-eyebrow">{@render eyebrow()}</div>
			{/if}
			<h1 class="coil-hero-title">{title}</h1>
			{#if subtitle}
				<p class="coil-hero-subtitle">{subtitle}</p>
			{/if}
			{#if extras}
				<div class="coil-hero-extras">{@render extras()}</div>
			{/if}
		</div>

		{#if bannerImages.length > 1 && onSelectBanner}
			<div class="coil-hero-filmstrip" role="tablist" aria-label={galleryLabel}>
				{#each bannerImages as url, i (url + i)}
					<button
						type="button"
						class="coil-hero-thumb"
						class:selected={i === selectedBannerIndex}
						aria-label="View image {i + 1}"
						aria-selected={i === selectedBannerIndex}
						role="tab"
						onclick={() => onSelectBanner?.(i)}
					>
						<img src={url} alt="" loading="lazy" />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if logo}
		<div class="coil-hero-logo">{@render logo()}</div>
	{/if}
</header>

<style>
	/* ── Hero shell: full-bleed, image-forward (events pattern) ── */
	.coil-hero {
		position: relative;
		width: 100%;
		height: 320px;
		overflow: hidden;
		background: var(--color-lakebed-950);
	}
	.coil-hero.contain-framed {
		background:
			radial-gradient(circle at top, rgba(255, 244, 222, 0.18), transparent 50%),
			linear-gradient(180deg, #23313a 0%, #10181e 100%);
	}
	.coil-hero.contain-framed::before {
		content: '';
		position: absolute;
		inset: clamp(1rem, 3vw, 2rem);
		border-radius: 1.5rem;
		background: linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(244, 236, 223, 0.94));
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.18),
			inset 0 1px 0 rgba(255, 255, 255, 0.75);
	}
	/* When a logo is provided it overlaps the bottom edge — let it escape. The
	   image and overlay are absolutely positioned with inset:0 so they stay
	   clipped to the hero box even with overflow visible. */
	.coil-hero.has-logo {
		overflow: visible;
	}
	@media (min-width: 640px) {
		.coil-hero {
			height: 400px;
		}
	}
	@media (min-width: 1024px) {
		.coil-hero {
			height: 500px;
		}
	}

	.coil-hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 1;
	}
	.coil-hero-img--contain {
		object-fit: contain;
		object-position: center;
		padding: clamp(1.25rem, 4vw, 3rem);
	}
	.coil-hero.contain-bleed .coil-hero-img--contain {
		inset: clamp(0.75rem, 2vw, 1.5rem);
		width: auto;
		height: auto;
		max-width: calc(100% - clamp(1.5rem, 4vw, 3rem));
		max-height: calc(100% - clamp(1.5rem, 4vw, 3rem));
		margin: auto;
		padding: 0;
	}
	/* ── logo-on-cover: same image as blurred cover background + centered clean logo ── */
	.coil-hero.logo-on-cover {
		background: var(--color-lakebed-950, #10181e);
	}
	.coil-hero-img--bg {
		object-fit: cover;
		transform: scale(1.1);
		filter: blur(28px) brightness(0.5) saturate(1.2);
	}
	.coil-hero-img--logo {
		object-fit: contain;
		object-position: center;
		padding: clamp(2rem, 6vw, 4rem);
		filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
		z-index: 1;
	}

	.coil-hero-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.85) 0%,
			rgba(0, 0, 0, 0.45) 45%,
			rgba(0, 0, 0, 0.05) 100%
		);
	}
	.coil-hero.logo-on-cover .coil-hero-overlay {
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.78) 0%,
			rgba(0, 0, 0, 0.25) 40%,
			rgba(0, 0, 0, 0) 70%
		);
	}
	.coil-hero.contain-framed .coil-hero-overlay {
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.82) 0%,
			rgba(0, 0, 0, 0.28) 38%,
			rgba(0, 0, 0, 0.04) 72%
		);
	}

	/* ── Bottom-anchored content row ── */
	.coil-hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 3;
		padding: 1.5rem;
		color: white;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}
	@media (min-width: 1024px) {
		.coil-hero-content {
			max-width: 1200px;
			margin: 0 auto;
			padding: 2rem 1.5rem;
		}
	}
	/* When a logo overlaps the bottom-left, push content right to clear it so
	   title/subtitle/chips never run behind the circular logo badge. The logo
	   is ~112px wide and sits at `left: 1.5rem`, so content must start after
	   ~9.25rem including gutter. Applied at all breakpoints. */
	.coil-hero.has-logo .coil-hero-content {
		padding-left: 9.25rem;
	}

	.coil-hero-copy {
		min-width: 0;
		flex: 1 1 auto;
		max-width: 48rem;
	}

	.coil-hero-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.625rem;
	}
	/* Uniform tag chip used by all coil pages — opt in by passing `kb-coil-tag`
	   on a span inside the badges snippet. Highlight variants follow. */
	.coil-hero-tags :global(.kb-coil-tag) {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.18);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: white;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}
	.coil-hero-tags :global(.kb-coil-tag--accent) {
		background: var(--color-flicker-400, #fb923c);
		color: rgba(0, 0, 0, 0.85);
	}
	.coil-hero-tags :global(.kb-coil-tag--free) {
		background: rgba(16, 185, 129, 0.32);
	}
	.coil-hero-tags :global(.kb-coil-tag--urgent) {
		background: var(--color-flicker-500, #f97316);
		color: rgba(0, 0, 0, 0.88);
		animation: kb-coil-pulse 2.4s ease-in-out infinite;
	}
	.coil-hero-tags :global(.kb-coil-tag--closed) {
		text-decoration: line-through;
		opacity: 0.7;
	}
	@keyframes kb-coil-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.55);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
		}
	}

	.coil-hero-eyebrow {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.25rem, 3vw, 1.875rem);
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.005em;
		margin-bottom: 0.4rem;
		color: white;
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.45);
	}

	.coil-hero-title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.75rem, 5vw, 3.25rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem 0;
		color: white;
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.45);
	}

	.coil-hero-subtitle {
		margin: 0;
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1rem;
		opacity: 0.9;
	}

	.coil-hero-extras {
		margin-top: 0.75rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
		font-size: 0.875rem;
		opacity: 0.9;
	}

	/* ── Hero-docked filmstrip ── */
	.coil-hero-filmstrip {
		display: none;
		flex-shrink: 0;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	@media (min-width: 640px) {
		.coil-hero-filmstrip {
			display: flex;
		}
	}
	.coil-hero-thumb {
		width: 64px;
		height: 64px;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 6px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.06);
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.coil-hero-thumb:hover {
		transform: translateY(-1px);
	}
	.coil-hero-thumb.selected {
		border-color: white;
	}
	.coil-hero-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.coil-hero.contain-mode .coil-hero-thumb img {
		object-fit: contain;
		padding: 0.35rem;
		background: linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(244, 236, 223, 0.94));
	}

	/* ── Logo overlap (red-pages) ── */
	.coil-hero-logo {
		position: absolute;
		z-index: 5;
		left: 1.5rem;
		bottom: -36px;
	}
	@media (min-width: 1024px) {
		.coil-hero-logo {
			left: max(1.5rem, calc((100vw - 1200px) / 2 + 1.5rem));
		}
	}
</style>
