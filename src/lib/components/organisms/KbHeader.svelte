<script lang="ts">
	import { page } from '$app/stores';
	import logoFallback from '$lib/assets/favicon.svg';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import MenuIcon from '@lucide/svelte/icons/menu';

	let { logoUrl }: { logoUrl?: string | null } = $props();

	const navLinks = [
		{ href: '/events', label: 'Events' },
		{ href: '/funding', label: 'Funding' },
		{ href: '/red-pages', label: 'Red Pages' },
		{ href: '/jobs', label: 'Jobs' },
		{ href: '/toolbox', label: 'Toolbox' }
	];

	const secondaryLinks = [{ href: '/about', label: 'About' }];

	const pathname = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}

	let mobileOpen = $state(false);

	// Close mobile menu on navigation
	$effect(() => {
		// Reading pathname registers the dependency
		void pathname;
		mobileOpen = false;
	});
</script>

<header class="kb-header">
	<div class="kb-header__inner">
		<!-- Brand -->
		<a href="/" class="kb-header__brand" aria-label="Knowledge Basket — Home">
			<img src={logoUrl ?? logoFallback} alt="" class="kb-header__logo" />
			<span class="kb-header__name">
				Knowledge Basket
				<span class="kb-header__org">Indigenous Futures Society</span>
			</span>
		</a>

		<!-- Desktop nav -->
		<nav class="kb-header__desktop-nav" aria-label="Main navigation">
			<ul class="kb-header__link-list" role="list">
				{#each navLinks as link}
					<li>
						<a
							href={link.href}
							class="kb-header__link"
							class:kb-header__link--active={isActive(link.href)}
							aria-current={isActive(link.href) ? 'page' : undefined}
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- Desktop secondary links -->
		<div class="kb-header__secondary">
			{#each secondaryLinks as link}
				<a
					href={link.href}
					class="kb-header__secondary-link"
					class:kb-header__secondary-link--active={isActive(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</div>

		<!-- Mobile menu button -->
		<button
			class="kb-header__menu-btn"
			onclick={() => (mobileOpen = true)}
			aria-label="Open navigation menu"
			aria-expanded={mobileOpen}
			aria-controls="mobile-nav"
		>
			<MenuIcon size={22} strokeWidth={2} />
		</button>
	</div>

	<!-- Mobile Sheet -->
	<Sheet.Root bind:open={mobileOpen}>
		<Sheet.Content side="left" class="kb-mobile-nav">
			<Sheet.Header class="kb-mobile-nav__header">
				<Sheet.Title class="sr-only">Navigation</Sheet.Title>
				<a
					href="/"
					class="kb-mobile-nav__brand"
					aria-label="Knowledge Basket — Home"
				>
					<img src={logoUrl ?? logoFallback} alt="" class="kb-mobile-nav__logo" />
					<span class="kb-mobile-nav__name">
						Knowledge Basket
						<span class="kb-mobile-nav__org">Indigenous Futures Society</span>
					</span>
				</a>
			</Sheet.Header>

			<nav id="mobile-nav" aria-label="Main navigation">
				<ul class="kb-mobile-nav__list" role="list">
					{#each navLinks as link}
						<li>
							<a
								href={link.href}
								class="kb-mobile-nav__link"
								class:kb-mobile-nav__link--active={isActive(link.href)}
								aria-current={isActive(link.href) ? 'page' : undefined}
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>

				<div class="kb-mobile-nav__divider" role="separator"></div>

				<ul class="kb-mobile-nav__list" role="list">
					{#each secondaryLinks as link}
						<li>
							<a
								href={link.href}
								class="kb-mobile-nav__link kb-mobile-nav__link--secondary"
								class:kb-mobile-nav__link--active={isActive(link.href)}
								aria-current={isActive(link.href) ? 'page' : undefined}
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</Sheet.Content>
	</Sheet.Root>
</header>

<style>
	/* ── Outer shell ─────────────────────────────────────────────────────── */
	.kb-header {
		position: sticky;
		top: 0;
		z-index: 50;
		isolation: isolate;
		background: var(--color-lakebed-950);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	}

	/* ── Inner container ─────────────────────────────────────────────────── */
	.kb-header__inner {
		display: flex;
		align-items: center;
		height: 60px;
		padding: 0 16px;
		gap: 8px;
	}

	@media (min-width: 768px) {
		.kb-header__inner {
			height: 56px;
			padding: 0 24px;
			gap: 24px;
		}
	}

	/* ── Brand ───────────────────────────────────────────────────────────── */
	.kb-header__brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		flex-shrink: 0;
		padding: 4px 0;
		border-radius: 6px;
		touch-action: manipulation;
	}
	.kb-header__brand:hover {
		text-decoration: none;
	}
	.kb-header__brand:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: 4px;
	}

	.kb-header__logo {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
	}

	.kb-header__name {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #ffffff;
		line-height: 1.25;
	}

	.kb-header__org {
		display: block;
		font-size: 10.5px;
		font-weight: 400;
		letter-spacing: 0.01em;
		text-transform: none;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 1px;
	}

	/* ── Desktop navigation ──────────────────────────────────────────────── */
	.kb-header__desktop-nav {
		display: none;
		flex: 1;
		min-width: 0;
	}

	@media (min-width: 768px) {
		.kb-header__desktop-nav {
			display: flex;
			align-items: center;
		}
	}

	.kb-header__link-list {
		display: flex;
		align-items: center;
		gap: 2px;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.kb-header__link {
		position: relative;
		display: flex;
		align-items: center;
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		padding: 8px 14px;
		min-height: 44px;
		color: rgba(255, 255, 255, 0.65);
		text-decoration: none;
		white-space: nowrap;
		border-radius: 6px;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
		touch-action: manipulation;
	}

	.kb-header__link:hover {
		color: #ffffff;
		background-color: rgba(255, 255, 255, 0.08);
		text-decoration: none;
	}

	.kb-header__link:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: -2px;
		color: #ffffff;
	}

	.kb-header__link--active {
		color: #ffffff;
	}

	.kb-header__link--active::after {
		content: '';
		position: absolute;
		bottom: 4px;
		left: 14px;
		right: 14px;
		height: 2px;
		background: var(--color-flicker-400);
		border-radius: 1px;
	}

	/* ── Secondary links (About) ─────────────────────────────────────────── */
	.kb-header__secondary {
		display: none;
		align-items: center;
		gap: 16px;
		margin-left: auto;
		flex-shrink: 0;
	}

	@media (min-width: 768px) {
		.kb-header__secondary {
			display: flex;
		}
	}

	.kb-header__secondary-link {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
		text-decoration: none;
		padding: 8px 4px;
		min-height: 44px;
		display: flex;
		align-items: center;
		border-radius: 4px;
		transition: color 0.15s ease;
		touch-action: manipulation;
	}

	.kb-header__secondary-link:hover {
		color: #ffffff;
		text-decoration: none;
	}

	.kb-header__secondary-link:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: 2px;
		color: #ffffff;
	}

	.kb-header__secondary-link--active {
		color: #ffffff;
	}

	/* ── Mobile menu button ──────────────────────────────────────────────── */
	.kb-header__menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-left: auto;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	.kb-header__menu-btn:hover {
		color: #ffffff;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.kb-header__menu-btn:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: -2px;
		color: #ffffff;
	}

	@media (min-width: 768px) {
		.kb-header__menu-btn {
			display: none;
		}
	}

	/* ── Mobile nav (inside Sheet) ───────────────────────────────────────── */
	:global(.kb-mobile-nav) {
		background: var(--color-lakebed-950) !important;
		border-color: rgba(255, 255, 255, 0.1) !important;
	}

	:global(.kb-mobile-nav [data-slot="sheet-close"]) {
		color: rgba(255, 255, 255, 0.6);
	}

	:global(.kb-mobile-nav [data-slot="sheet-close"]:hover) {
		color: #ffffff;
	}

	:global(.kb-mobile-nav__header) {
		padding-bottom: 0 !important;
	}

	.kb-mobile-nav__brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		padding: 4px 0;
		touch-action: manipulation;
	}
	.kb-mobile-nav__brand:hover {
		text-decoration: none;
	}
	.kb-mobile-nav__brand:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: 4px;
		border-radius: 6px;
	}

	.kb-mobile-nav__logo {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid rgba(255, 255, 255, 0.15);
	}

	.kb-mobile-nav__name {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #ffffff;
		line-height: 1.25;
	}

	.kb-mobile-nav__org {
		display: block;
		font-size: 10.5px;
		font-weight: 400;
		letter-spacing: 0.01em;
		text-transform: none;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 1px;
	}

	.kb-mobile-nav__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.kb-mobile-nav__link {
		display: flex;
		align-items: center;
		font-family: var(--font-sans);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		padding: 12px 16px;
		min-height: 48px;
		border-radius: 8px;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
		touch-action: manipulation;
	}

	.kb-mobile-nav__link:hover {
		color: #ffffff;
		background-color: rgba(255, 255, 255, 0.08);
		text-decoration: none;
	}

	.kb-mobile-nav__link:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: -2px;
		color: #ffffff;
	}

	.kb-mobile-nav__link--active {
		color: #ffffff;
		background-color: rgba(255, 255, 255, 0.1);
		border-left: 3px solid var(--color-flicker-400);
		padding-left: 13px;
	}

	.kb-mobile-nav__link--secondary {
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
		min-height: 44px;
		padding: 10px 16px;
	}

	.kb-mobile-nav__link--secondary:hover {
		color: rgba(255, 255, 255, 0.9);
	}

	.kb-mobile-nav__divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 8px 16px;
	}
</style>
