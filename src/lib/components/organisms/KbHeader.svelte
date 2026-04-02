<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import logoFallback from '$lib/assets/favicon.svg';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserIcon from '@lucide/svelte/icons/user';

	let {
		logoUrl,
		user
	}: {
		logoUrl?: string | null;
		user?: { name?: string | null; email: string; role?: string | null } | null;
	} = $props();

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

	const displayName = $derived(user?.name || user?.email?.split('@')[0] || 'Account');
	const isStaff = $derived(user?.role === 'moderator' || user?.role === 'admin');
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

		<!-- Desktop secondary links + auth -->
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

			{#if user}
				<Popover.Root>
					<Popover.Trigger class="kb-header__user-btn" aria-label="Account menu">
						<UserIcon class="kb-header__user-icon" />
						<span class="kb-header__user-name">{displayName}</span>
						<ChevronDown class="kb-header__user-chevron" />
					</Popover.Trigger>
					<Popover.Content class="kb-user-menu" align="end" sideOffset={8}>
						<div class="kb-user-menu__header">
							<span class="kb-user-menu__name">{displayName}</span>
							{#if isStaff}
								<span class="kb-user-menu__role">{user.role}</span>
							{/if}
						</div>
						<div class="kb-user-menu__divider" role="separator"></div>
						{#if isStaff}
							<a href="/admin" class="kb-user-menu__item">Admin panel</a>
						{/if}
						<form method="post" action="/auth/logout" use:enhance>
							<button type="submit" class="kb-user-menu__item kb-user-menu__item--signout">
								<LogOut class="kb-user-menu__item-icon" />
								Sign out
							</button>
						</form>
					</Popover.Content>
				</Popover.Root>
			{:else}
				<a href="/auth/login" class="kb-header__secondary-link kb-header__signin"> Sign in </a>
			{/if}
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
				<a href="/" class="kb-mobile-nav__brand" aria-label="Knowledge Basket — Home">
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

				<div class="kb-mobile-nav__divider" role="separator"></div>

				<ul class="kb-mobile-nav__list" role="list">
					{#if user}
						<li class="kb-mobile-nav__user-info">
							<span class="kb-mobile-nav__user-name">{displayName}</span>
							{#if isStaff}
								<span class="kb-mobile-nav__role">{user.role}</span>
							{/if}
						</li>
						{#if isStaff}
							<li>
								<a href="/admin" class="kb-mobile-nav__link kb-mobile-nav__link--secondary">
									Admin panel
								</a>
							</li>
						{/if}
						<li>
							<form method="post" action="/auth/logout" use:enhance>
								<button
									type="submit"
									class="kb-mobile-nav__link kb-mobile-nav__link--secondary kb-mobile-nav__signout"
								>
									<LogOut class="kb-mobile-nav__signout-icon" />
									Sign out
								</button>
							</form>
						</li>
					{:else}
						<li>
							<a href="/auth/login" class="kb-mobile-nav__link kb-mobile-nav__link--secondary">
								Sign in
							</a>
						</li>
						<li>
							<a href="/auth/register" class="kb-mobile-nav__link kb-mobile-nav__link--secondary">
								Create account
							</a>
						</li>
					{/if}
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

	/* ── Secondary links (About + auth) ─────────────────────────────────── */
	.kb-header__secondary {
		display: none;
		align-items: center;
		gap: 8px;
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

	.kb-header__signin {
		padding: 6px 12px !important;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
		color: rgba(255, 255, 255, 0.75) !important;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	.kb-header__signin:hover {
		color: #ffffff !important;
		border-color: rgba(255, 255, 255, 0.4);
		background-color: rgba(255, 255, 255, 0.06);
		text-decoration: none;
	}

	/* ── User menu button ────────────────────────────────────────────────── */
	:global(.kb-header__user-btn) {
		display: flex !important;
		align-items: center !important;
		gap: 6px !important;
		font-family: var(--font-sans) !important;
		font-size: 12px !important;
		font-weight: 600 !important;
		letter-spacing: 0.04em !important;
		text-transform: uppercase !important;
		color: rgba(255, 255, 255, 0.75) !important;
		background: transparent !important;
		border: 1px solid rgba(255, 255, 255, 0.2) !important;
		border-radius: 5px !important;
		padding: 6px 10px !important;
		min-height: 36px !important;
		cursor: pointer !important;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background-color 0.15s ease !important;
	}

	:global(.kb-header__user-btn:hover) {
		color: #ffffff !important;
		border-color: rgba(255, 255, 255, 0.4) !important;
		background-color: rgba(255, 255, 255, 0.06) !important;
	}

	:global(.kb-header__user-btn:focus-visible) {
		outline: 2px solid var(--color-flicker-400) !important;
		outline-offset: 2px !important;
	}

	:global(.kb-header__user-icon) {
		width: 14px !important;
		height: 14px !important;
		flex-shrink: 0 !important;
	}

	.kb-header__user-name {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.kb-header__user-chevron) {
		width: 12px !important;
		height: 12px !important;
		flex-shrink: 0 !important;
		opacity: 0.6 !important;
	}

	/* ── User dropdown menu ──────────────────────────────────────────────── */
	:global(.kb-user-menu) {
		min-width: 180px !important;
		padding: 6px !important;
		background: #fff !important;
		border: 1px solid var(--color-granite-200) !important;
		border-radius: 8px !important;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
	}

	.kb-user-menu__header {
		padding: 8px 10px 6px;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.kb-user-menu__name {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-obsidian-800);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.kb-user-menu__role {
		font-family: var(--font-sans);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-lakebed-700);
		background: var(--color-lakebed-50);
		border: 1px solid var(--color-lakebed-200);
		border-radius: 3px;
		padding: 1px 5px;
		flex-shrink: 0;
	}

	.kb-user-menu__divider {
		height: 1px;
		background: var(--color-granite-100);
		margin: 4px 0;
	}

	:global(.kb-user-menu__item) {
		display: flex !important;
		align-items: center !important;
		gap: 8px !important;
		width: 100% !important;
		padding: 7px 10px !important;
		font-family: var(--font-sans) !important;
		font-size: 12px !important;
		font-weight: 600 !important;
		letter-spacing: 0.04em !important;
		text-transform: uppercase !important;
		color: var(--color-obsidian-700) !important;
		text-decoration: none !important;
		border-radius: 5px !important;
		background: transparent !important;
		border: none !important;
		cursor: pointer !important;
		transition: background-color 0.1s ease !important;
		text-align: left !important;
	}

	:global(.kb-user-menu__item:hover) {
		background: var(--color-granite-50) !important;
		color: var(--color-obsidian-900) !important;
		text-decoration: none !important;
	}

	:global(.kb-user-menu__item--signout) {
		color: var(--color-ember-700) !important;
	}

	:global(.kb-user-menu__item--signout:hover) {
		background: var(--color-ember-50) !important;
		color: var(--color-ember-800) !important;
	}

	:global(.kb-user-menu__item-icon) {
		width: 13px !important;
		height: 13px !important;
		flex-shrink: 0 !important;
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

	:global(.kb-mobile-nav [data-slot='sheet-close']) {
		color: rgba(255, 255, 255, 0.6);
	}

	:global(.kb-mobile-nav [data-slot='sheet-close']:hover) {
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
		width: 100%;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
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

	.kb-mobile-nav__user-info {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
	}

	.kb-mobile-nav__user-name {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.8);
	}

	.kb-mobile-nav__role {
		font-family: var(--font-sans);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-flicker-300);
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		padding: 1px 5px;
	}

	.kb-mobile-nav__signout {
		color: rgba(255, 100, 100, 0.7) !important;
	}

	.kb-mobile-nav__signout:hover {
		color: rgba(255, 130, 130, 0.9) !important;
		background-color: rgba(255, 100, 100, 0.08) !important;
	}

	:global(.kb-mobile-nav__signout-icon) {
		width: 14px !important;
		height: 14px !important;
		margin-right: 6px !important;
	}
</style>
