<script lang="ts">
	import { X, Send } from '@lucide/svelte';
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

	const storageKey = $derived(`kb-submit-dismissed-${coil}`);

	let dismissed = $state(false);

	$effect(() => {
		try {
			dismissed = localStorage.getItem(storageKey) === '1';
		} catch {
			/* SSR or blocked storage */
		}
	});

	function dismiss() {
		dismissed = true;
		try {
			localStorage.setItem(storageKey, '1');
		} catch {
			/* blocked storage */
		}
	}

	function restore() {
		dismissed = false;
		try {
			localStorage.removeItem(storageKey);
		} catch {
			/* blocked storage */
		}
	}
</script>

<!-- Desktop: sticky collapsible footer (hidden on mobile via CSS to prevent hydration flash) -->
{#if dismissed}
	<button
		class="kb-submit-tab"
		style="--accent: {btnColor}"
		onclick={restore}
		aria-label="Show submit banner"
	>
		<Send class="h-3.5 w-3.5" />
		<span>{label}</span>
	</button>
{:else}
	<div class="kb-submit-bar" style="--accent: {btnColor}; --bg: {bgColor}">
		<div class="kb-submit-bar__inner">
			<div class="kb-submit-bar__accent" aria-hidden="true"></div>
			<div class="kb-submit-bar__body">
				<p class="kb-submit-bar__heading">{heading}</p>
				<span class="kb-submit-bar__sep" aria-hidden="true">·</span>
				<p class="kb-submit-bar__desc">{description}</p>
			</div>
			<a {href} class="kb-submit-bar__cta" style="background: {btnColor}">{label}</a>
			<button class="kb-submit-bar__close" onclick={dismiss} aria-label="Dismiss submit banner">
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>
{/if}

<style>
	/* ── Desktop sticky bar ── */
	.kb-submit-bar {
		position: sticky;
		bottom: 0;
		z-index: 30;
		border-top: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 80%, transparent);
		background: var(--bg);
		backdrop-filter: blur(12px);
		animation: kb-submit-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.kb-submit-bar__inner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 1rem 0.65rem 0;
		max-width: 100%;
	}
	.kb-submit-bar__accent {
		width: 3px;
		align-self: stretch;
		background: var(--accent);
		border-radius: 0 2px 2px 0;
		flex-shrink: 0;
	}
	.kb-submit-bar__body {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex: 1 1 auto;
		min-width: 0;
		padding-left: 0.75rem;
	}
	.kb-submit-bar__heading {
		margin: 0;
		font-family: var(--font-serif, Georgia, serif);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
	}
	.kb-submit-bar__sep {
		color: var(--muted-foreground);
		opacity: 0.5;
		flex-shrink: 0;
	}
	.kb-submit-bar__desc {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.kb-submit-bar__cta {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4rem 1rem;
		border-radius: var(--radius, 0.375rem);
		font-size: 0.78rem;
		font-weight: 600;
		color: white;
		text-decoration: none;
		transition: filter 0.15s;
	}
	.kb-submit-bar__cta:hover {
		filter: brightness(1.1);
		text-decoration: none;
	}
	.kb-submit-bar__close {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: var(--radius, 0.375rem);
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		opacity: 0.55;
		transition: opacity 0.15s;
	}
	.kb-submit-bar__close:hover {
		opacity: 1;
	}

	/* ── Collapsed tab ── */
	.kb-submit-tab {
		position: sticky;
		bottom: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-left: auto;
		width: fit-content;
		padding: 0.4rem 0.85rem 0.4rem 0.7rem;
		border: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 80%, transparent);
		border-bottom: none;
		border-radius: var(--radius, 0.375rem) var(--radius, 0.375rem) 0 0;
		background: color-mix(in srgb, var(--background) 94%, white);
		backdrop-filter: blur(12px);
		color: var(--accent);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		animation: kb-submit-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.kb-submit-tab:hover {
		background: color-mix(in srgb, var(--accent) 8%, var(--background));
	}

	/* ── Hide on mobile (CSS-only, no hydration flash) ── */
	@media (max-width: 767px) {
		.kb-submit-bar,
		.kb-submit-tab {
			display: none;
		}
	}

	/* ── Animation ── */
	@keyframes kb-submit-slide-up {
		from {
			opacity: 0;
			transform: translateY(100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
