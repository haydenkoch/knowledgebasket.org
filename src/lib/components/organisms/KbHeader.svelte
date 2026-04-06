<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import logoFallback from '$lib/assets/favicon.svg';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserIcon from '@lucide/svelte/icons/user';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

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
	const sidebar = useSidebar();

	function isActive(href: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}

	$effect(() => {
		void pathname;
		sidebar.setOpenMobile(false);
	});

	const displayName = $derived(user?.name || user?.email?.split('@')[0] || 'Account');
	const isStaff = $derived(user?.role === 'moderator' || user?.role === 'admin');
</script>

<header class="kb-header">
	<div class="kb-header__inner">
		<Sidebar.Trigger class="kb-header__menu-btn" />

		<a href="/" class="kb-header__brand" aria-label="Knowledge Basket — Home">
			<img src={logoUrl ?? logoFallback} alt="" class="kb-header__logo" />
			<span class="kb-header__name">
				Knowledge Basket
				<span class="kb-header__org">Indigenous Futures Society</span>
			</span>
		</a>

		<nav class="kb-header__desktop-nav" aria-label="Main navigation">
			<NavigationMenu.Root class="w-full">
				<NavigationMenu.List class="kb-header__link-list">
					{#each navLinks as link}
						<NavigationMenu.Item>
							<NavigationMenu.Link
								href={link.href}
								class="kb-header__link"
								active={isActive(link.href)}
								aria-current={isActive(link.href) ? 'page' : undefined}
							>
								{link.label}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
					{/each}
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</nav>

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
	</div>
</header>

<style>
	.kb-header {
		position: sticky;
		top: 0;
		z-index: 50;
		isolation: isolate;
		background: var(--color-lakebed-950);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	}

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

	:global(.kb-header__link-list) {
		display: flex !important;
		align-items: center !important;
		gap: 2px !important;
		list-style: none !important;
		margin: 0 !important;
		padding: 0 !important;
		border: none !important;
		background: transparent !important;
		backdrop-filter: none !important;
	}

	:global(.kb-header__link) {
		position: relative;
		display: flex !important;
		align-items: center !important;
		font-family: var(--font-sans) !important;
		font-size: 13px !important;
		font-weight: 600 !important;
		letter-spacing: 0.02em !important;
		padding: 8px 14px !important;
		min-height: 44px !important;
		color: rgba(255, 255, 255, 0.65) !important;
		text-decoration: none !important;
		white-space: nowrap !important;
		border-radius: 6px !important;
		background: transparent !important;
		box-shadow: none !important;
		transition:
			color 0.15s ease,
			background-color 0.15s ease !important;
		touch-action: manipulation;
	}

	:global(.kb-header__link:hover) {
		color: #ffffff !important;
		background-color: rgba(255, 255, 255, 0.08) !important;
		text-decoration: none !important;
	}

	:global(.kb-header__link:focus-visible) {
		outline: 2px solid var(--color-flicker-400) !important;
		outline-offset: -2px !important;
		color: #ffffff !important;
	}

	:global(.kb-header__link[data-active='true']) {
		color: #ffffff !important;
	}

	:global(.kb-header__link[data-active='true']::after) {
		content: '';
		position: absolute;
		bottom: 4px;
		left: 14px;
		right: 14px;
		height: 2px;
		background: var(--color-flicker-400);
		border-radius: 1px;
	}

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

	:global(.kb-header__menu-btn) {
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
		width: 44px !important;
		height: 44px !important;
		padding: 0 !important;
		background: transparent !important;
		border: none !important;
		border-radius: 8px !important;
		color: rgba(255, 255, 255, 0.8) !important;
		transition:
			color 0.15s ease,
			background-color 0.15s ease !important;
	}

	:global(.kb-header__menu-btn:hover) {
		color: #ffffff !important;
		background-color: rgba(255, 255, 255, 0.1) !important;
	}

	:global(.kb-header__menu-btn:focus-visible) {
		outline: 2px solid var(--color-flicker-400) !important;
		outline-offset: -2px !important;
		color: #ffffff !important;
	}

	@media (min-width: 768px) {
		:global(.kb-header__menu-btn) {
			display: none !important;
		}
	}
</style>
