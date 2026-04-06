<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import logoFallback from '$lib/assets/favicon.svg';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';
	import Shield from '@lucide/svelte/icons/shield';
	import UserIcon from '@lucide/svelte/icons/user';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

	let {
		logoUrl,
		user
	}: {
		logoUrl?: string | null;
		user?: {
			name?: string | null;
			email: string;
			role?: string | null;
			image?: string | null;
		} | null;
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
		if (browser) sidebar.setOpenMobile(false);
	});

	const displayName = $derived(user?.name || user?.email?.split('@')[0] || 'Account');
	const initial = $derived(displayName.charAt(0).toUpperCase());
	const isStaff = $derived(user?.role === 'moderator' || user?.role === 'admin');

	let logoutFormEl = $state<HTMLFormElement | null>(null);
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
				<form
					bind:this={logoutFormEl}
					method="post"
					action="/auth/logout"
					class="kb-header__logout-form"
				></form>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="kb-header__account-trigger" aria-label="Account menu">
						<span class="kb-header__account-avatar" aria-hidden="true">
							{#if user.image}
								<img src={user.image} alt="" class="kb-header__account-avatar-img" />
							{:else}
								{initial}
							{/if}
						</span>
						<span class="kb-header__account-name" title={displayName}>{displayName}</span>
						<ChevronDown class="kb-header__account-chevron" aria-hidden="true" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" sideOffset={8} class="w-56">
						<DropdownMenu.Label class="font-normal">
							<div class="flex flex-col gap-1">
								<span class="text-sm leading-none font-semibold">{displayName}</span>
								{#if user.email}
									<span class="truncate text-xs leading-none text-muted-foreground">
										{user.email}
									</span>
								{/if}
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a href="/account" {...props}>
										<UserIcon />
										<span>Account</span>
									</a>
								{/snippet}
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a href="/account/settings" {...props}>
										<Settings />
										<span>Settings</span>
									</a>
								{/snippet}
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a href="/account/privacy" {...props}>
										<LockKeyhole />
										<span>Privacy</span>
									</a>
								{/snippet}
							</DropdownMenu.Item>
							{#if isStaff}
								<DropdownMenu.Item>
									{#snippet child({ props })}
										<a href="/admin" {...props}>
											<Shield />
											<span>Admin</span>
										</a>
									{/snippet}
								</DropdownMenu.Item>
							{/if}
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive" onSelect={() => logoutFormEl?.requestSubmit()}>
							<LogOut />
							<span>Sign out</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
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

	.kb-header__logout-form {
		display: none;
	}

	:global(.kb-header__account-trigger) {
		display: inline-flex !important;
		align-items: center !important;
		gap: 8px !important;
		padding: 5px 10px 5px 5px !important;
		min-height: 36px !important;
		border: 1px solid rgba(255, 255, 255, 0.2) !important;
		border-radius: 999px !important;
		background: transparent !important;
		color: rgba(255, 255, 255, 0.85) !important;
		cursor: pointer !important;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background-color 0.15s ease !important;
	}

	:global(.kb-header__account-trigger:hover) {
		color: #ffffff !important;
		border-color: rgba(255, 255, 255, 0.4) !important;
		background-color: rgba(255, 255, 255, 0.06) !important;
	}

	:global(.kb-header__account-trigger:focus-visible) {
		outline: 2px solid var(--color-flicker-400) !important;
		outline-offset: 2px !important;
		color: #ffffff !important;
	}

	:global(.kb-header__account-trigger[data-state='open']) {
		color: #ffffff !important;
		border-color: rgba(255, 255, 255, 0.4) !important;
		background-color: rgba(255, 255, 255, 0.08) !important;
	}

	:global(.kb-header__account-avatar) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--color-flicker-500, rgba(255, 255, 255, 0.15));
		color: #ffffff;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		flex-shrink: 0;
		overflow: hidden;
	}

	:global(.kb-header__account-avatar-img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	:global(.kb-header__account-name) {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	:global(.kb-header__account-chevron) {
		width: 14px !important;
		height: 14px !important;
		opacity: 0.7;
		flex-shrink: 0;
		transition: transform 0.15s ease;
	}

	:global(.kb-header__account-trigger[data-state='open'] .kb-header__account-chevron) {
		transform: rotate(180deg);
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
