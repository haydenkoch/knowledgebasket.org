<script lang="ts">
	import { page } from '$app/stores';
	import logoFallback from '$lib/assets/favicon.svg';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import BriefcaseBusiness from '@lucide/svelte/icons/briefcase-business';
	import LibraryBig from '@lucide/svelte/icons/library-big';
	import Info from '@lucide/svelte/icons/info';
	import Shield from '@lucide/svelte/icons/shield';
	import FileText from '@lucide/svelte/icons/file-text';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Cookie from '@lucide/svelte/icons/cookie';
	import LogOut from '@lucide/svelte/icons/log-out';
	import LogIn from '@lucide/svelte/icons/log-in';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { legalNavLinks } from '$lib/legal/config';
	import { openPrivacyChoices } from '$lib/privacy/consent';

	type NavLink = {
		href: string;
		label: string;
		description: string;
		icon: typeof CalendarDays;
	};

	let {
		logoUrl,
		user
	}: {
		logoUrl?: string | null;
		user?: { name?: string | null; email: string; role?: string | null } | null;
	} = $props();

	const navLinks: NavLink[] = [
		{
			href: '/events',
			label: 'Events',
			description: 'Gatherings, summits, and opportunities to show up in person.',
			icon: CalendarDays
		},
		{
			href: '/funding',
			label: 'Funding',
			description: 'Grants, awards, and rolling opportunities worth tracking.',
			icon: HandCoins
		},
		{
			href: '/red-pages',
			label: 'Red Pages',
			description: 'Native-owned vendors, services, and trusted collaborators.',
			icon: Store
		},
		{
			href: '/jobs',
			label: 'Jobs',
			description: 'Career openings across Tribal and Indigenous-serving orgs.',
			icon: BriefcaseBusiness
		},
		{
			href: '/toolbox',
			label: 'Toolbox',
			description: 'Reports, guides, and practical resources for the work.',
			icon: LibraryBig
		}
	];

	const secondaryLinks: Array<{ href: string; label: string; icon: typeof Info }> = [];
	const legalIcons: Record<string, typeof Info> = {
		About: Info,
		Privacy: Shield,
		Terms: FileText,
		Cookies: Cookie,
		'Privacy Requests': ClipboardList
	};
	const pathname = $derived($page.url.pathname);
	const displayName = $derived(user?.name || user?.email?.split('@')[0] || 'Account');
	const isStaff = $derived(user?.role === 'moderator' || user?.role === 'admin');

	function isActive(href: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<Sidebar.Root side="left" collapsible="offcanvas" class="kb-public-nav-sidebar">
	<Sidebar.Header class="border-b border-sidebar-border px-3 py-4">
		<a href="/" class="kb-public-nav-sidebar__brand" aria-label="Knowledge Basket — Home">
			<img src={logoUrl ?? logoFallback} alt="" class="kb-public-nav-sidebar__logo" />
			<span class="kb-public-nav-sidebar__name">
				Knowledge Basket
				<span class="kb-public-nav-sidebar__org">Indigenous Futures Society</span>
			</span>
		</a>
	</Sidebar.Header>

	<Sidebar.Content class="px-2 py-3">
		<Sidebar.Group>
			<Sidebar.GroupLabel>Explore the coils</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navLinks as link}
						{@const Icon = link.icon}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={isActive(link.href)} size="lg">
								{#snippet child({ props })}
									<a href={link.href} {...props}>
										<Icon />
										<span>{link.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
							<div class="kb-public-nav-sidebar__description">{link.description}</div>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Separator />

		{#if secondaryLinks.length > 0 || isStaff}
			<Sidebar.Group>
				<Sidebar.GroupLabel>More</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each secondaryLinks as link}
							{@const Icon = link.icon}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(link.href)}>
									{#snippet child({ props })}
										<a href={link.href} {...props}>
											<Icon />
											<span>{link.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
						{#if isStaff}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive('/admin')}>
									{#snippet child({ props })}
										<a href="/admin" {...props}>
											<Shield />
											<span>Admin panel</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/if}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Separator />
		{/if}

		<Sidebar.Group>
			<Sidebar.GroupLabel>Legal</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each legalNavLinks as link}
						{@const Icon = legalIcons[link.label] ?? Info}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={isActive(link.href)}>
								{#snippet child({ props })}
									<a href={link.href} {...props}>
										<Icon />
										<span>{link.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props })}
								<button type="button" {...props} onclick={openPrivacyChoices}>
									<Shield />
									<span>Privacy choices</span>
								</button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="border-t border-sidebar-border px-3 py-4">
		{#if user}
			<div class="kb-public-nav-sidebar__account">
				<div class="kb-public-nav-sidebar__account-label">Signed in as</div>
				<div class="kb-public-nav-sidebar__account-name">{displayName}</div>
			</div>
			<a
				href="/account"
				class="kb-public-nav-sidebar__action kb-public-nav-sidebar__action--secondary"
			>
				Account dashboard
			</a>
			<form method="post" action="/auth/logout" class="w-full">
				<button
					type="submit"
					class="kb-public-nav-sidebar__action kb-public-nav-sidebar__action--danger"
				>
					<LogOut class="h-4 w-4" />
					Sign out
				</button>
			</form>
		{:else}
			<div class="flex flex-col gap-2">
				<a href="/auth/login" class="kb-public-nav-sidebar__action">
					<LogIn class="h-4 w-4" />
					Sign in
				</a>
				<a
					href="/auth/register"
					class="kb-public-nav-sidebar__action kb-public-nav-sidebar__action--secondary"
				>
					<UserPlus class="h-4 w-4" />
					Create account
				</a>
			</div>
		{/if}
	</Sidebar.Footer>
</Sidebar.Root>

<style>
	:global(.kb-public-nav-sidebar) {
		display: block;
	}
	.kb-public-nav-sidebar__brand {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		color: inherit;
		text-decoration: none;
	}
	.kb-public-nav-sidebar__logo {
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 9999px;
		object-fit: cover;
		border: 2px solid color-mix(in srgb, var(--sidebar-primary) 16%, transparent);
	}
	.kb-public-nav-sidebar__name {
		display: flex;
		flex-direction: column;
		font-family: var(--font-sans);
		font-size: 0.88rem;
		font-weight: 700;
		line-height: 1.15;
		color: var(--sidebar-foreground);
	}
	.kb-public-nav-sidebar__org {
		font-size: 0.72rem;
		font-weight: 500;
		color: color-mix(in srgb, var(--sidebar-foreground) 62%, transparent);
	}
	.kb-public-nav-sidebar__description {
		padding: 0.15rem 0.7rem 0.8rem 2.3rem;
		font-size: 0.78rem;
		line-height: 1.4;
		color: color-mix(in srgb, var(--sidebar-foreground) 62%, transparent);
	}
	.kb-public-nav-sidebar__account {
		margin-bottom: 0.8rem;
	}
	.kb-public-nav-sidebar__account-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--sidebar-foreground) 62%, transparent);
	}
	.kb-public-nav-sidebar__account-name {
		margin-top: 0.25rem;
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--sidebar-foreground);
	}
	.kb-public-nav-sidebar__action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		width: 100%;
		min-height: 2.5rem;
		border-radius: 0.8rem;
		background: var(--sidebar-primary);
		color: var(--sidebar-primary-foreground);
		font-size: 0.86rem;
		font-weight: 700;
		text-decoration: none;
		border: none;
	}
	.kb-public-nav-sidebar__action:hover {
		text-decoration: none;
	}
	.kb-public-nav-sidebar__action--secondary {
		background: var(--sidebar-accent);
		color: var(--sidebar-accent-foreground);
	}
	.kb-public-nav-sidebar__action--danger {
		background: color-mix(in srgb, var(--sidebar-accent) 70%, transparent);
		color: var(--sidebar-foreground);
	}
	@media (min-width: 768px) {
		:global(.kb-public-nav-sidebar) {
			display: none;
		}
	}
</style>
