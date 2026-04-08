<script lang="ts">
	import { trackSaveClicked } from '$lib/insights/events';
	import type { Snippet } from 'svelte';
	import Heart from '@lucide/svelte/icons/heart';

	/**
	 * Unified utility bar for public coil detail pages.
	 *
	 * Docks immediately beneath the hero as a single horizontal strip with up
	 * to four snippet regions laid out on a three-column grid:
	 *
	 *   [ breadcrumb ] · [ meta ] · [ tail: save + actions + primary CTA ]
	 *
	 * ─── Layout stability ─────────────────────────────────────────────────
	 *
	 * The rail is physically incapable of overflowing its parent. Three
	 * layers of protection combine to make it bulletproof regardless of
	 * content length, async reflow, or font-swap:
	 *
	 *   1. Grid columns are `auto | minmax(0, 1fr) | auto` — the middle
	 *      column can shrink to zero, so the tail is always reachable.
	 *   2. Every cell carries an explicit `min-width: 0` to opt out of the
	 *      default `min-width: auto` that would otherwise inflate flex/grid
	 *      items to their intrinsic min-content width.
	 *   3. The outer strip uses `overflow-x: clip` as a hard safety net —
	 *      anything that somehow escapes the grid is clipped horizontally
	 *      without creating a scroll context (focus rings and portaled
	 *      tooltips remain visible).
	 *
	 * At ≤720px viewport the rail collapses into a stacked layout: the
	 * meta region becomes a block with inline children so author lists,
	 * dates, and venue names flow as natural prose and wrap at word
	 * boundaries. The tail (heart + actions + primary CTA) drops to its
	 * own row with the CTA stretched full-width.
	 *
	 * ─── Meta fade (desktop) ──────────────────────────────────────────────
	 *
	 * Long meta content on desktop fades gracefully into transparent via
	 * a `mask-image` gradient on the right edge rather than being abruptly
	 * clipped. When content fits with trailing room the fade falls over
	 * empty background and is invisible.
	 *
	 * ─── Logo overhang ────────────────────────────────────────────────────
	 *
	 * Pages whose hero drops a 112px circular logo -36px into the rail
	 * (jobs, red-pages, organizations) pass `hasLogoOverhang={true}`. The
	 * component shifts its grid 9rem right on desktop to clear the logo,
	 * and swaps the indent for a top spacer in the stacked layout so the
	 * logo never collides with rail content.
	 *
	 * ─── Save button ──────────────────────────────────────────────────────
	 *
	 * The heart save button is rendered internally for cross-coil
	 * consistency and posts to `?/toggleBookmark`. It animates on save
	 * using the provided `accent` color with a cubic-bezier overshoot.
	 */
	let {
		isAuthed = false,
		isBookmarked = false,
		loginHref = '',
		contentType = undefined,
		contentSlug = undefined,
		saveLabel = '',
		accent = 'var(--teal)',
		hasLogoOverhang = false,
		breadcrumb,
		meta,
		actions,
		primary
	}: {
		isAuthed?: boolean;
		isBookmarked?: boolean;
		loginHref?: string;
		contentType?: 'event' | 'funding' | 'redpage' | 'job' | 'toolbox';
		contentSlug?: string;
		/** Short label for the save action, used in aria-label (e.g. "event", "job"). */
		saveLabel?: string;
		/** CSS color for the filled heart state; defaults to teal. */
		accent?: string;
		/**
		 * Set true on pages whose hero drops a circular logo that overlaps
		 * the rail's top-left (jobs, red-pages, organizations). Shifts inner
		 * content right on desktop and down in stacked mode.
		 */
		hasLogoOverhang?: boolean;
		breadcrumb?: Snippet;
		meta?: Snippet;
		actions?: Snippet;
		primary?: Snippet;
	} = $props();
</script>

<div
	class="coil-rail"
	class:has-logo-overhang={hasLogoOverhang}
	style="--coil-accent: {accent}"
>
	<div class="coil-rail-inner">
		{#if breadcrumb}
			<div class="coil-rail-crumb">
				{@render breadcrumb()}
			</div>
		{/if}

		<div class="coil-rail-meta" class:is-empty={!meta}>
			{#if meta}{@render meta()}{/if}
		</div>

		<div class="coil-rail-tail">
			{#if saveLabel}
				{#if isAuthed}
					<form
						method="POST"
						action="?/toggleBookmark"
						class="coil-rail-heart-form"
						onsubmit={() =>
							contentType &&
							trackSaveClicked({
								contentType,
								slug: contentSlug,
								signedIn: isAuthed,
								isBookmarked
							})}
					>
						<button
							type="submit"
							class="coil-rail-heart"
							class:is-saved={isBookmarked}
							aria-label={isBookmarked ? `Remove ${saveLabel} from saved` : `Save ${saveLabel}`}
							aria-pressed={isBookmarked}
						>
							<Heart class="size-[18px]" />
						</button>
					</form>
				{:else if loginHref}
					<a
						href={loginHref}
						class="coil-rail-heart"
						aria-label={`Sign in to save this ${saveLabel}`}
						onclick={() =>
							contentType &&
							trackSaveClicked({
								contentType,
								slug: contentSlug,
								signedIn: false,
								isBookmarked,
								requiresAuth: true
							})}
					>
						<Heart class="size-[18px]" />
					</a>
				{/if}
			{/if}

			{#if actions}
				<div class="coil-rail-actions">
					{@render actions()}
				</div>
			{/if}

			{#if primary}
				<div class="coil-rail-primary">
					{@render primary()}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.coil-rail {
		position: relative;
		background: color-mix(in srgb, var(--background) 92%, transparent);
		backdrop-filter: blur(10px) saturate(1.05);
		-webkit-backdrop-filter: blur(10px) saturate(1.05);
		border-top: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--border) 45%, transparent);

		/* Bulletproof horizontal containment. `overflow-x: clip` clips
		   without creating a scroll/overflow context, so it doesn't break
		   position: sticky on ancestors (events page) and doesn't cut off
		   focus rings or portaled tooltip content. */
		overflow-x: clip;
		overflow-y: visible;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	/* Gossamer accent line across the top edge — catches a whisper of the
	   page's coil color and gives the strip a quiet anchor under the hero. */
	.coil-rail::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			color-mix(in srgb, var(--coil-accent, var(--teal)) 35%, transparent) 50%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 1;
	}

	.coil-rail-inner {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		column-gap: 1.25rem;
		row-gap: 0;
		padding-block: 0.875rem;
		min-width: 0;
		max-width: 100%;
	}

	/* Logo overhang: shift the grid past the 112px dangling logo. */
	.coil-rail.has-logo-overhang .coil-rail-inner {
		padding-left: 9rem;
	}

	/* ── Breadcrumb cell ───────────────────────────────── */
	.coil-rail-crumb {
		grid-column: 1;
		min-width: 0;
		max-width: 100%;
		font-size: 0.8125rem;
		letter-spacing: 0.005em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-variant-numeric: tabular-nums;
	}

	/* ── Meta cell ─────────────────────────────────────── */
	.coil-rail-meta {
		/* Explicit column placement: always the flexible middle column,
		   even when the breadcrumb snippet isn't passed (otherwise the
		   grid would auto-place meta into column 1 and size it to its
		   content, letting the fade mask eat the last few characters). */
		grid-column: 2;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		max-width: 100%;
		/* Right padding creates a runway for the fade mask: when content
		   fits, the fade falls entirely inside this padding (over empty
		   background and is invisible); when content overflows, only the
		   overflowing tail fades. */
		padding-right: 1.75rem;
		overflow: hidden;
		white-space: nowrap;
		font-size: 0.8125rem;
		letter-spacing: 0.005em;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;

		mask-image: linear-gradient(
			to right,
			black 0%,
			black calc(100% - 1.75rem),
			transparent 100%
		);
		-webkit-mask-image: linear-gradient(
			to right,
			black 0%,
			black calc(100% - 1.75rem),
			transparent 100%
		);
		mask-mode: alpha;
		-webkit-mask-mode: alpha;
	}
	.coil-rail-meta.is-empty {
		display: none;
	}
	/* Any snippet content inside meta shouldn't introduce its own min-width. */
	.coil-rail-meta :global(*) {
		min-width: 0;
	}

	/* ── Tail cell (heart + actions + primary) ─────────── */
	.coil-rail-tail {
		grid-column: 3;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: flex-end;
		min-width: 0;
	}
	.coil-rail-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.coil-rail-primary {
		display: flex;
		align-items: center;
	}

	/* ── Heart save button ─────────────────────────────── */
	.coil-rail-heart-form {
		display: inline-flex;
	}
	.coil-rail-heart {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--background);
		color: var(--muted-foreground);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background-color 0.22s ease,
			border-color 0.22s ease,
			color 0.22s ease,
			transform 0.22s ease,
			box-shadow 0.22s ease;
	}
	.coil-rail-heart:hover {
		border-color: var(--coil-accent, var(--teal));
		color: var(--coil-accent, var(--teal));
		transform: translateY(-1px);
		box-shadow: 0 2px 12px
			color-mix(in srgb, var(--coil-accent, var(--teal)) 20%, transparent);
	}
	.coil-rail-heart:active {
		transform: scale(0.92);
	}
	.coil-rail-heart.is-saved {
		background: color-mix(in srgb, var(--coil-accent, var(--teal)) 14%, var(--background));
		border-color: var(--coil-accent, var(--teal));
		color: var(--coil-accent, var(--teal));
		animation: coil-heart-pop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.coil-rail-heart.is-saved :global(svg) {
		fill: var(--coil-accent, var(--teal));
		stroke: var(--coil-accent, var(--teal));
	}
	@keyframes coil-heart-pop {
		0% {
			transform: scale(1);
		}
		45% {
			transform: scale(1.25);
		}
		100% {
			transform: scale(1);
		}
	}

	/* ── Stacked layout on narrow viewports ─────────────────────
	   Using a media query (not a container query) for maximum
	   reliability across Svelte scoping and browser quirks. The rail
	   is always near-full-width of the content area so viewport width
	   ≈ rail inline-size for our purposes. */
	@media (max-width: 720px) {
		.coil-rail-inner {
			grid-template-columns: minmax(0, 1fr);
			grid-auto-flow: row;
			row-gap: 0.625rem;
			padding-block: 0.875rem 1rem;
		}

		/* Reset explicit column placements so each region flows into its
		   own row in the single-column stacked layout. */
		.coil-rail-crumb,
		.coil-rail-meta,
		.coil-rail-tail {
			grid-column: auto;
		}

		.coil-rail-crumb {
			white-space: normal;
			overflow: visible;
			text-overflow: clip;
		}

		/* Switch meta to natural inline/block flow. Everything inside
		   (author text, separator dots, dates, location icons) flows as
		   prose and wraps at word boundaries like a sentence, regardless
		   of `white-space: nowrap` that pages set for their desktop look. */
		.coil-rail-meta {
			display: block;
			flex-wrap: initial;
			white-space: normal;
			overflow: visible;
			padding-right: 0;
			mask-image: none;
			-webkit-mask-image: none;
			line-height: 1.55;
		}
		.coil-rail-meta :global(*) {
			display: inline;
			white-space: normal;
			overflow-wrap: anywhere;
			max-width: 100%;
		}
		/* Exception: keep icons (svg) as inline-flex aligned glyphs so
		   they don't collapse to a baseline-broken square. */
		.coil-rail-meta :global(svg) {
			display: inline-block;
			vertical-align: -0.15em;
		}

		.coil-rail-tail {
			justify-content: flex-start;
			flex-wrap: wrap;
			gap: 0.5rem 0.625rem;
		}

		.coil-rail-primary {
			flex: 1 1 auto;
			min-width: 0;
		}
		.coil-rail-primary :global(a),
		.coil-rail-primary :global(button) {
			width: 100%;
			justify-content: center;
		}

		/* Logo-overhang pages: swap horizontal indent for top spacer that
		   clears the 36px dangling logo + its shadow. */
		.coil-rail.has-logo-overhang .coil-rail-inner {
			padding-left: 0;
			padding-top: 3.75rem;
		}
	}

	/* Very narrow phones: tighten gaps. */
	@media (max-width: 420px) {
		.coil-rail-inner {
			column-gap: 0.75rem;
		}
		.coil-rail-tail {
			gap: 0.375rem 0.5rem;
		}
	}
</style>
