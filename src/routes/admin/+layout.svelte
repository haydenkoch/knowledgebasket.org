<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import logoFallback from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button/index.js';
	import AdminCommandPalette from '$lib/components/organisms/admin/AdminCommandPalette.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import {
		Activity,
		BookOpen,
		Briefcase,
		Building2,
		MapPin,
		Compass,
		LogOut,
		ChevronRight,
		Database,
		FileDown,
		Copy,
		List,
		ListOrdered,
		Tags,
		Palette,
		Plug,
		Search,
		Store,
		User,
		Inbox,
		Globe2,
		ShieldCheck,
		LayoutDashboard
	} from '@lucide/svelte';

	let { data, children } = $props();

	const overviewNav = [{ href: '/admin', label: 'Work Queue', icon: Compass }];

	const contentNav = [
		{ href: '/admin/events', label: 'Events', icon: List },
		{ href: '/admin/funding', label: 'Funding', icon: Globe2 },
		{ href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
		{ href: '/admin/red-pages', label: 'Red Pages', icon: Store },
		{ href: '/admin/toolbox', label: 'Toolbox', icon: BookOpen }
	];

	const sourcesNav = [
		{ href: '/admin/sources', label: 'All Sources', icon: Database },
		{ href: '/admin/sources/review', label: 'Import Review', icon: FileDown },
		{ href: '/admin/sources/health', label: 'Health Monitor', icon: Activity }
	];

	const directoryNav = [
		{ href: '/admin/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/admin/venues', label: 'Venues', icon: MapPin }
	];

	const operationsNav = [
		{ href: '/admin/events/import', label: 'Event Import', icon: FileDown },
		{ href: '/admin/events/duplicates', label: 'Duplicates', icon: Copy }
	];

	const settingsNav = [
		{ href: '/admin/settings/homepage', label: 'Homepage', icon: LayoutDashboard },
		{ href: '/admin/settings/taxonomies', label: 'Taxonomies', icon: Tags },
		{ href: '/admin/settings/branding', label: 'Branding', icon: Palette },
		{ href: '/admin/settings/integrations', label: 'Integrations', icon: Plug },
		{ href: '/admin/settings/search', label: 'Search', icon: Search }
	];

	const accountNav = [{ href: '/admin/account', label: 'Account', icon: User }];

	function isActive(href: string) {
		if (href === '/admin') return $page.url.pathname === '/admin';
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	const pathSegments = $derived(
		$page.url.pathname
			.replace(/^\/admin\/?/, '')
			.split('/')
			.filter(Boolean)
	);

	const breadcrumbLabel: Record<string, string> = {
		sources: 'Sources',
		review: 'Import Review',
		health: 'Health Monitor',
		runs: 'Runs',
		events: 'Events',
		organizations: 'Organizations',
		venues: 'Venues',
		inbox: 'Inbox',
		settings: 'Settings',
		taxonomies: 'Taxonomies',
		homepage: 'Homepage',
		sections: 'Sections',
		featured: 'Featured',
		preview: 'Preview',
		branding: 'Branding',
		integrations: 'Integrations',
		search: 'Search',
		account: 'Account',
		new: 'New',
		import: 'Import',
		duplicates: 'Duplicates',
		lists: 'Lists',
		funding: 'Funding',
		jobs: 'Jobs',
		'red-pages': 'Red Pages',
		toolbox: 'Toolbox'
	};

	function breadcrumbText(segment: string): string {
		if (breadcrumbLabel[segment]) return breadcrumbLabel[segment];
		if (/^[0-9a-f-]{8,}$/i.test(segment)) return 'Details';
		return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	const brandLogo = $derived(data.brandLogoUrl ?? logoFallback);
</script>

<svelte:head>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<a
	href="#admin-main"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:ring-2 focus:ring-ring focus:outline-none"
	>Skip to main content</a
>

<Sidebar.Provider class="min-h-screen bg-[var(--color-alpine-snow-50)]">
	<Sidebar.Root class="border-r border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/72">
		<Sidebar.Header class="min-h-16 justify-center border-b border-[color:var(--rule)] px-4 py-3">
			<a href="/admin" class="flex items-center gap-3 no-underline hover:no-underline">
				<img
					src={brandLogo}
					alt=""
					class="h-9 w-9 rounded-lg bg-[var(--color-lakebed-950)] object-contain p-1.5"
				/>
				<div class="min-w-0">
					<div class="font-display text-base leading-none font-bold text-[var(--dark)]">
						Knowledge Basket
					</div>
					<div class="mt-0.5 text-[10px] tracking-[0.12em] text-[var(--mid)] uppercase">Admin</div>
				</div>
			</a>
		</Sidebar.Header>

		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupLabel>Overview</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each overviewNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Content</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each contentNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Directory</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each directoryNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Sources</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each sourcesNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Operations</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each operationsNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each settingsNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each accountNav as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon class="mr-2 h-4 w-4" />
											{item.label}
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>

		<Sidebar.Footer class="border-t border-[color:var(--rule)] px-4 py-3">
			<div class="flex items-center gap-2">
				<ShieldCheck class="h-4 w-4 shrink-0 text-[var(--color-pinyon-700)]" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-[var(--dark)]">
						{data.user?.name ?? data.user?.email}
					</p>
					<p class="text-[11px] text-[var(--mid)]">
						{data.user?.role === 'admin'
							? 'Administrator'
							: data.user?.role === 'moderator'
								? 'Moderator'
								: data.user?.role === 'contributor'
									? 'Contributor'
									: (data.user?.role ?? 'Staff')}
					</p>
				</div>
				<form method="post" action="/auth/logout" use:enhance>
					<button
						type="submit"
						class="text-muted-foreground transition-colors hover:text-foreground"
						title="Sign out"
					>
						<LogOut class="h-4 w-4" />
					</button>
				</form>
			</div>
		</Sidebar.Footer>
	</Sidebar.Root>

	<main
		class="min-h-screen flex-1 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-lakebed-100)_36%,transparent),transparent_30%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--color-alpine-snow-100)_75%,white))]"
		id="admin-main"
	>
		<div
			class="sticky top-0 z-20 border-b border-[color:var(--rule)] bg-[color:color-mix(in_srgb,var(--background)_88%,white)]/95 backdrop-blur"
		>
			<div
				class="mx-auto flex min-h-16 max-w-[1480px] flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-6"
			>
				<Sidebar.Trigger />
				<ChevronRight class="h-3 w-3 text-muted-foreground" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item>
							<Breadcrumb.Link href="/admin" class="capitalize">Admin</Breadcrumb.Link>
						</Breadcrumb.Item>
						{#each pathSegments as segment, i}
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								{#if i === pathSegments.length - 1}
									<Breadcrumb.Page>{breadcrumbText(segment)}</Breadcrumb.Page>
								{:else}
									{@const pathSoFar = '/admin/' + pathSegments.slice(0, i + 1).join('/')}
									<Breadcrumb.Link href={pathSoFar}>{breadcrumbText(segment)}</Breadcrumb.Link>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
				<div class="ml-auto flex items-center gap-2">
					<AdminCommandPalette />
					<Button href="/admin" variant="secondary" size="sm">
						<Inbox class="mr-2 h-4 w-4" />
						Work queue
					</Button>
					<Button href="/" variant="outline" size="sm" target="_blank" rel="noreferrer">
						<Globe2 class="mr-2 h-4 w-4" />
						View site
					</Button>
				</div>
			</div>
		</div>

		<div class="admin-page-content mx-auto max-w-[1480px] px-4 pt-0 pb-6 sm:px-6">
			{@render children()}
		</div>
	</main>
	<Toaster />
</Sidebar.Provider>

<style>
	:global(
		.admin-page-content
			> :first-child:not([data-admin-page-header]):not(:has(> [data-admin-page-header])):not(
				[class*='pt-']
			):not([class*='py-'])
	) {
		padding-top: 1.5rem;
	}
</style>
