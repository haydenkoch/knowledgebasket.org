<script lang="ts">
	import type { Snippet } from 'svelte';
	import Heart from '@lucide/svelte/icons/heart';

	/**
	 * Unified utility bar for public coil detail pages.
	 *
	 * Docks immediately beneath the hero with a hairline top border and renders up
	 * to four regions in a single horizontal strip:
	 *
	 *   [ breadcrumb ] · [ meta ] · [ actions ] · [ primary CTA ]
	 *
	 * - `breadcrumb` (required): the page's Breadcrumb markup (left).
	 * - `meta` (optional): short contextual info — date chip, location line, etc.
	 * - `actions` (optional): small secondary action buttons (Directions, Share,
	 *   Add to calendar...).
	 * - `primary` (optional): the big right-end CTA (Register, Apply, Visit site).
	 *
	 * The heart save button is rendered internally (consistent across all coils)
	 * and posts to `?/toggleBookmark`. It animates on save: outline → filled with
	 * the coil's accent color, scale bounce.
	 *
	 * Width-agnostic: the parent page chooses its container width (events uses
	 * 1200px; all others use 1200px after pass 2). Consumers can override padding
	 * via a wrapper using `:global(.coil-rail)` for cases like the red-pages
	 * overlapping logo.
	 */
	let {
		isAuthed = false,
		isBookmarked = false,
		loginHref = '',
		saveLabel = '',
		accent = 'var(--teal)',
		breadcrumb,
		meta,
		actions,
		primary
	}: {
		isAuthed?: boolean;
		isBookmarked?: boolean;
		loginHref?: string;
		/** Short label for the save action, used in aria-label (e.g. "event", "job"). */
		saveLabel?: string;
		/** CSS color for the filled heart state; defaults to teal. */
		accent?: string;
		breadcrumb: Snippet;
		meta?: Snippet;
		actions?: Snippet;
		primary?: Snippet;
	} = $props();
</script>

<div class="coil-rail" style="--coil-accent: {accent}">
	<div class="coil-rail-crumb">
		{@render breadcrumb()}
	</div>

	{#if meta}
		<div class="coil-rail-meta">
			{@render meta()}
		</div>
	{/if}

	<div class="coil-rail-tail">
		{#if saveLabel}
			{#if isAuthed}
				<form method="POST" action="?/toggleBookmark" class="coil-rail-heart-form">
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

<style>
	.coil-rail {
		border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
		padding: 0.75rem 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: nowrap;
		background: color-mix(in srgb, var(--background) 94%, transparent);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}
	.coil-rail-crumb {
		min-width: 0;
		flex: 0 1 auto;
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
	}
	.coil-rail-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: nowrap;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		min-width: 0;
		flex: 1 1 auto;
		justify-content: flex-end;
		white-space: nowrap;
		overflow: hidden;
	}
	.coil-rail-tail {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: nowrap;
		flex: 0 0 auto;
		margin-left: auto;
	}
	.coil-rail:has(.coil-rail-meta) .coil-rail-tail {
		margin-left: 0;
	}
	.coil-rail-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: nowrap;
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
		transition:
			background-color 0.18s ease,
			border-color 0.18s ease,
			color 0.18s ease,
			transform 0.18s ease;
	}
	.coil-rail-heart:hover {
		border-color: var(--coil-accent, var(--teal));
		color: var(--coil-accent, var(--teal));
		transform: translateY(-1px);
	}
	.coil-rail-heart:active {
		transform: scale(0.92);
	}
	.coil-rail-heart.is-saved {
		background: color-mix(in srgb, var(--coil-accent, var(--teal)) 12%, var(--background));
		border-color: var(--coil-accent, var(--teal));
		color: var(--coil-accent, var(--teal));
		animation: coil-heart-pop 0.32s ease-out;
	}
	.coil-rail-heart.is-saved :global(svg) {
		fill: var(--coil-accent, var(--teal));
		stroke: var(--coil-accent, var(--teal));
	}
	@keyframes coil-heart-pop {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.22);
		}
		100% {
			transform: scale(1);
		}
	}

	/* ── Responsive: stack cleanly on narrow viewports ─── */
	@media (max-width: 900px) {
		.coil-rail {
			flex-wrap: wrap;
			flex-direction: column;
			align-items: stretch;
			gap: 0.625rem;
			padding: 0.75rem 0 0.875rem;
		}
		.coil-rail-crumb,
		.coil-rail-meta {
			white-space: normal;
			overflow: visible;
			justify-content: flex-start;
		}
		.coil-rail-crumb {
			order: 0;
		}
		.coil-rail-meta {
			order: 1;
			flex-wrap: wrap;
		}
		.coil-rail-tail {
			order: 2;
			justify-content: space-between;
			margin-left: 0 !important;
			flex-wrap: wrap;
		}
		.coil-rail-actions {
			flex-wrap: wrap;
		}
	}
</style>
