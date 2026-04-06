<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Shield from '@lucide/svelte/icons/shield';
	import X from '@lucide/svelte/icons/x';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import {
		CONSENT_UPDATED_EVENT,
		CONSENT_CATEGORIES,
		closePrivacyChoices,
		getConsent,
		hasConsent,
		privacyChoicesOpen,
		readStoredConsent,
		saveConsent,
		type ConsentCategory
	} from '$lib/privacy/consent';
	import { cn } from '$lib/utils.js';

	const editableCategories = CONSENT_CATEGORIES.filter((category) => category !== 'essential');
	const PRIVACY_LAUNCHER_DISMISS_KEY = 'kb:privacy-launcher-dismissed';

	const categoryLabels: Record<Exclude<ConsentCategory, 'essential'>, string> = {
		preferences: 'Preferences cookies',
		analytics: 'Analytics cookies',
		marketing: 'Marketing cookies'
	};

	const categoryDescriptions: Record<Exclude<ConsentCategory, 'essential'>, string> = {
		preferences: 'Remember UI choices like the collapsible submit banner and sidebar state.',
		analytics: 'Reserved for privacy-respecting analytics tools once they are enabled.',
		marketing: 'Reserved for future marketing, retargeting, and ad-related technologies.'
	};

	const sidebar = useSidebar();

	let open = $state(false);
	let bannerEl = $state<HTMLDivElement | null>(null);
	let mounted = $state(false);
	let consent = $state(getConsent());
	let consentResolved = $state(false);
	let launcherDismissed = $state(false);
	let preferences = $state(false);
	let analytics = $state(false);
	let marketing = $state(false);

	const showBanner = $derived(mounted && !consentResolved);
	const showLauncher = $derived(
		mounted &&
			consentResolved &&
			!launcherDismissed &&
			!open &&
			!sidebar.isMobile &&
			!sidebar.openMobile
	);

	function syncLauncherDismissed() {
		if (!browser) return;
		try {
			launcherDismissed =
				hasConsent('preferences') && localStorage.getItem(PRIVACY_LAUNCHER_DISMISS_KEY) === '1';
		} catch {
			launcherDismissed = false;
		}
	}

	function syncFromStoredConsent() {
		const stored = readStoredConsent();
		consentResolved = stored != null;
		const record = stored ?? getConsent();
		consent = record;
		preferences = record.categories.preferences;
		analytics = record.categories.analytics;
		marketing = record.categories.marketing;
		syncLauncherDismissed();
	}

	function persistSelection(source: 'banner' | 'preferences') {
		consent = saveConsent(
			{
				preferences,
				analytics,
				marketing
			},
			source
		);
		consentResolved = true;
		closePrivacyChoices();
	}

	function acceptAll() {
		preferences = true;
		analytics = true;
		marketing = true;
		persistSelection('banner');
	}

	function rejectNonEssential() {
		preferences = false;
		analytics = false;
		marketing = false;
		persistSelection('banner');
	}

	function dismissLauncher() {
		launcherDismissed = true;
		if (!browser) return;
		try {
			if (hasConsent('preferences')) {
				localStorage.setItem(PRIVACY_LAUNCHER_DISMISS_KEY, '1');
			}
		} catch {
			/* blocked storage */
		}
	}

	function openLauncherPreferences() {
		syncFromStoredConsent();
		privacyChoicesOpen.set(true);
	}

	function syncBannerOffset() {
		if (!browser) return;
		const offset = showBanner && bannerEl ? `${bannerEl.offsetHeight}px` : '0px';
		document.documentElement.style.setProperty('--kb-consent-banner-offset', offset);
	}

	$effect(() => {
		if (!browser) return;

		const visible = showBanner;
		const node = bannerEl;
		if (!visible || !node) {
			document.documentElement.style.setProperty('--kb-consent-banner-offset', '0px');
			return;
		}

		syncBannerOffset();
		const observer = new ResizeObserver(() => {
			syncBannerOffset();
		});
		observer.observe(node);
		window.addEventListener('resize', syncBannerOffset);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', syncBannerOffset);
			document.documentElement.style.setProperty('--kb-consent-banner-offset', '0px');
		};
	});

	onMount(() => {
		if (!browser) return;
		mounted = true;
		syncFromStoredConsent();

		const handleConsentUpdated = () => {
			syncFromStoredConsent();
		};

		window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);

		const unsubscribe = privacyChoicesOpen.subscribe((value) => {
			if (value) {
				syncFromStoredConsent();
			}
			if (open !== value) {
				open = value;
			}
		});

		return () => {
			window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
			unsubscribe();
			document.documentElement.style.setProperty('--kb-consent-banner-offset', '0px');
		};
	});
</script>

{#if showBanner}
	<div bind:this={bannerEl} class="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
		<Card.Root class="mx-auto max-w-4xl border-border/70 bg-background/98 shadow-2xl backdrop-blur">
			<Card.Content class="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
				<div class="max-w-2xl space-y-2">
					<p class="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
						Cookie and privacy notice
					</p>
					<h2 class="text-lg font-semibold">
						Choose how Knowledge Basket uses cookies and browser storage
					</h2>
					<p class="text-sm leading-6 text-muted-foreground">
						Essential cookies keep sign-in and security working. Preference, analytics, and
						marketing technologies stay off until you opt in, and you can reopen these choices any
						time.
					</p>
				</div>
				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						class={buttonVariants({ variant: 'outline' })}
						onclick={() => privacyChoicesOpen.set(true)}
					>
						Customize
					</button>
					<button
						type="button"
						class={buttonVariants({ variant: 'outline' })}
						onclick={rejectNonEssential}
					>
						Reject non-essential
					</button>
					<button type="button" class={buttonVariants({ variant: 'default' })} onclick={acceptAll}>
						Accept all
					</button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

{#if showLauncher}
	<div
		class="fixed right-4 z-30 hidden items-center gap-1 rounded-full border border-border/70 bg-background/94 p-1.5 shadow-lg backdrop-blur md:flex"
		style="bottom: calc(var(--kb-submit-banner-offset, 0px) + env(safe-area-inset-bottom, 0px) + 1rem);"
	>
		<button
			type="button"
			class="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
			onclick={openLauncherPreferences}
			aria-label="Open privacy choices"
		>
			<Shield class="h-4 w-4" />
			<span>Privacy choices</span>
		</button>
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
			onclick={dismissLauncher}
			aria-label="Dismiss privacy choices launcher"
		>
			<X class="h-4 w-4" />
		</button>
	</div>
{/if}

<Dialog.Root
	bind:open={
		() => open,
		(value) => {
			if (open === value) return;
			open = value;
			if (!value) closePrivacyChoices();
		}
	}
>
	<Dialog.Content class="max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Privacy choices</Dialog.Title>
			<Dialog.Description>
				Adjust how non-essential technologies work on this device. Essential cookies remain on so
				sign-in, abuse protection, and core app security continue to work.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="rounded-xl border border-border/70 bg-muted/30 p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="font-medium">Essential cookies</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Authentication, session security, CSRF protection, and other core site operations.
						</p>
					</div>
					<span
						class="rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background"
					>
						Required
					</span>
				</div>
			</div>

			{#each editableCategories as category}
				<div class="rounded-xl border border-border/70 p-4">
					<div class="flex items-start gap-3">
						<Checkbox
							id={`consent-${category}`}
							checked={category === 'preferences'
								? preferences
								: category === 'analytics'
									? analytics
									: marketing}
							onCheckedChange={(checked) => {
								if (category === 'preferences') preferences = checked === true;
								else if (category === 'analytics') analytics = checked === true;
								else marketing = checked === true;
							}}
						/>
						<div class="space-y-1">
							<label class="cursor-pointer font-medium" for={`consent-${category}`}>
								{categoryLabels[category]}
							</label>
							<p class="text-sm leading-6 text-muted-foreground">
								{categoryDescriptions[category]}
							</p>
						</div>
					</div>
				</div>
			{/each}

			{#if consent.globalPrivacyControl}
				<p class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
					Global Privacy Control was detected in this browser. Marketing choices remain off unless
					you explicitly change them.
				</p>
			{/if}
		</div>

		<Dialog.Footer class="mt-6">
			<button
				type="button"
				class={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
				onclick={closePrivacyChoices}
			>
				Cancel
			</button>
			<button
				type="button"
				class={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
				onclick={rejectNonEssential}
			>
				Reject non-essential
			</button>
			<button
				type="button"
				class={cn(buttonVariants({ variant: 'default' }), 'w-full sm:w-auto')}
				onclick={() => persistSelection('preferences')}
			>
				Save choices
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
