<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import * as Sentry from '@sentry/sveltekit';
	import Bug from '@lucide/svelte/icons/bug';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Send from '@lucide/svelte/icons/send';
	import Shield from '@lucide/svelte/icons/shield';
	import type { CoilKey } from '$lib/data/kb';
	import { privacyChoicesOpen } from '$lib/privacy/consent';
	import { legalConfig } from '$lib/legal/config';
	import * as Popover from '$lib/components/ui/popover/index.js';

	type SubmitMeta = {
		accent: string;
		label: string;
		href: string;
	};

	const SUBMIT_META: Record<CoilKey, SubmitMeta> = {
		events: {
			accent: 'var(--color-lakebed-950, #172647)',
			label: 'Submit an event',
			href: '/events/submit'
		},
		funding: {
			accent: 'var(--color-flicker-900, #762b0c)',
			label: 'Submit funding',
			href: '/funding/submit'
		},
		jobs: {
			accent: 'var(--color-pinyon-800, #2b4336)',
			label: 'Submit a job',
			href: '/jobs/submit'
		},
		redpages: {
			accent: 'var(--color-ember-900, #72181a)',
			label: 'Submit a listing',
			href: '/red-pages/submit'
		},
		toolbox: {
			accent: 'var(--color-obsidian-950, #252525)',
			label: 'Submit a resource',
			href: '/toolbox/submit'
		}
	};

	function coilFromPath(pathname: string): CoilKey | null {
		if (pathname.startsWith('/events')) return 'events';
		if (pathname.startsWith('/funding')) return 'funding';
		if (pathname.startsWith('/jobs')) return 'jobs';
		if (pathname.startsWith('/red-pages')) return 'redpages';
		if (pathname.startsWith('/toolbox')) return 'toolbox';
		return null;
	}

	type SentryFeedbackForm = {
		appendToDom?: () => void;
		removeFromDom?: () => void;
		open: () => void;
		close?: () => void;
	};

	type SentryFeedbackIntegration = {
		createForm: (options?: Record<string, unknown>) => Promise<SentryFeedbackForm>;
	};

	let open = $state(false);
	let mounted = $state(false);
	let feedbackForm: SentryFeedbackForm | null = null;
	let feedbackBusy = $state(false);

	function getFeedbackIntegration(): SentryFeedbackIntegration | null {
		const client = Sentry.getClient();
		if (!client) return null;
		const integration = client.getIntegrationByName?.('Feedback') as
			| SentryFeedbackIntegration
			| undefined;
		return integration ?? null;
	}

	function openMailtoFallback() {
		if (!browser) return;
		const subject = encodeURIComponent('Knowledge Basket bug report');
		const body = encodeURIComponent(
			`What happened:\n\n\nWhat you expected:\n\n\nPage: ${window.location.href}\nBrowser: ${navigator.userAgent}\n`
		);
		window.location.href = `mailto:${legalConfig.supportEmail}?subject=${subject}&body=${body}`;
	}

	const coil = $derived(coilFromPath($page.url.pathname));
	const submit = $derived(coil ? SUBMIT_META[coil] : null);
	const accent = $derived(submit?.accent ?? 'var(--color-obsidian-950, #252525)');

	async function reportBug() {
		open = false;
		if (!browser || feedbackBusy) return;
		feedbackBusy = true;
		try {
			const integration = getFeedbackIntegration();
			if (!integration) {
				console.warn(
					'[KbActionDock] Sentry Feedback integration unavailable — falling back to mailto. ' +
						'This usually means PUBLIC_SENTRY_DSN is not configured for this environment.'
				);
				openMailtoFallback();
				return;
			}
			if (!feedbackForm) {
				feedbackForm = await integration.createForm();
				feedbackForm.appendToDom?.();
			}
			feedbackForm.open();
		} catch (error) {
			console.error('[KbActionDock] Failed to open Sentry feedback form:', error);
			openMailtoFallback();
		} finally {
			feedbackBusy = false;
		}
	}

	function openPrivacy() {
		open = false;
		privacyChoicesOpen.set(true);
	}

	onMount(() => {
		mounted = true;
		return () => {
			feedbackForm?.removeFromDom?.();
			feedbackForm = null;
		};
	});
</script>

{#if mounted}
	<div class="kb-dock" style="--dock-accent: {accent};">
		<Popover.Root bind:open>
			<Popover.Trigger
				class={`kb-dock__trigger${open ? ' is-open' : ''}`}
				aria-label={open ? 'Close help menu' : 'Open help menu'}
			>
				<span class="kb-dock__trigger-dot" aria-hidden="true"></span>
				<span class="kb-dock__trigger-label">Help</span>
			</Popover.Trigger>

			<Popover.Content
				side="top"
				align="end"
				sideOffset={12}
				class="kb-dock__popover w-72 border-border/80 p-1.5 shadow-xl"
				style={`--dock-accent: ${accent};`}
			>
				<div class="flex flex-col">
					{#if submit}
						<a
							href={submit.href}
							onclick={() => (open = false)}
							class="kb-dock__item kb-dock__item--primary"
							role="menuitem"
						>
							<span class="kb-dock__icon">
								<Send class="h-4 w-4" />
							</span>
							<span class="kb-dock__label">{submit.label}</span>
							<ChevronRight class="kb-dock__chev h-4 w-4" />
						</a>
					{/if}

					<button type="button" onclick={openPrivacy} class="kb-dock__item" role="menuitem">
						<span class="kb-dock__icon">
							<Shield class="h-4 w-4" />
						</span>
						<span class="kb-dock__label">Privacy choices</span>
						<ChevronRight class="kb-dock__chev h-4 w-4" />
					</button>

					<button type="button" onclick={reportBug} class="kb-dock__item" role="menuitem">
						<span class="kb-dock__icon">
							<Bug class="h-4 w-4" />
						</span>
						<span class="kb-dock__label">Report a bug</span>
						<ChevronRight class="kb-dock__chev h-4 w-4" />
					</button>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>
{/if}

<style>
	.kb-dock {
		position: fixed;
		right: 1.25rem;
		bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
		z-index: 40;
		display: none;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.6rem;
	}

	@media (min-width: 768px) {
		.kb-dock {
			display: flex;
		}
	}

	/* ── Trigger (unchanged) ── */
	:global(.kb-dock__trigger) {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.5rem 0.95rem 0.5rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 70%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--background) 96%, white);
		backdrop-filter: blur(14px);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.6) inset,
			0 14px 30px -16px rgba(15, 23, 42, 0.3),
			0 3px 10px -2px rgba(15, 23, 42, 0.08);
		color: var(--color-obsidian-950, #1f1f1f);
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.22s ease,
			background 0.22s ease,
			border-color 0.22s ease;
	}

	:global(.kb-dock__trigger:hover) {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--dock-accent) 35%, var(--rule, #e5e5e5));
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.6) inset,
			0 20px 38px -16px rgba(15, 23, 42, 0.34),
			0 4px 12px -2px rgba(15, 23, 42, 0.1);
	}

	:global(.kb-dock__trigger.is-open) {
		background: var(--background);
		border-color: color-mix(in srgb, var(--dock-accent) 40%, var(--rule, #e5e5e5));
	}

	.kb-dock__trigger-dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: var(--dock-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--dock-accent) 14%, transparent);
		transition: box-shadow 0.22s ease;
	}

	:global(.kb-dock__trigger:hover) .kb-dock__trigger-dot,
	:global(.kb-dock__trigger.is-open) .kb-dock__trigger-dot {
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--dock-accent) 18%, transparent);
	}

	/* ── Popover content: inherits shadcn bg-popover / border / shadow ── */
	:global(.kb-dock__popover) {
		/* Pass the dock accent down into the portalled content */
		--dock-accent: var(--dock-accent, var(--color-obsidian-950));
		border-radius: var(--radius);
	}

	/* ── Menu items ── */
	.kb-dock__item {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		padding: 0.55rem 0.6rem;
		border: none;
		border-radius: calc(var(--radius) - 2px);
		background: transparent;
		color: var(--foreground);
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 0.82rem;
		font-weight: 500;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.kb-dock__item:hover,
	.kb-dock__item:focus-visible {
		background: var(--muted);
		text-decoration: none;
		outline: none;
	}

	.kb-dock__item:focus-visible {
		box-shadow: 0 0 0 2px var(--ring);
	}

	.kb-dock__item--primary {
		background: color-mix(in srgb, var(--dock-accent) 8%, transparent);
		color: var(--dock-accent);
	}

	.kb-dock__item--primary:hover {
		background: color-mix(in srgb, var(--dock-accent) 14%, transparent);
	}

	.kb-dock__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: calc(var(--radius) - 2px);
		background: color-mix(in srgb, var(--dock-accent) 10%, transparent);
		color: var(--dock-accent);
		flex-shrink: 0;
	}

	.kb-dock__item--primary .kb-dock__icon {
		background: var(--dock-accent);
		color: var(--color-alpine-snow-50, #ffffff);
	}

	.kb-dock__label {
		flex: 1 1 auto;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.kb-dock__chev) {
		color: color-mix(in srgb, var(--foreground) 35%, transparent);
		transition:
			transform 0.15s ease,
			color 0.15s ease;
		flex-shrink: 0;
	}

	.kb-dock__item:hover :global(.kb-dock__chev) {
		transform: translateX(2px);
		color: var(--dock-accent);
	}
</style>
