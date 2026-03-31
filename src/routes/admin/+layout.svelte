<script lang="ts">
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { Building2, MapPin, LayoutDashboard, LogOut, ChevronRight, FileDown, Copy, List, ListOrdered, Settings, Tags, Palette, Plug, Search, User } from '@lucide/svelte';

	let { data, children } = $props();

	const topNav = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }
	];

	const eventsNav = [
		{ href: '/admin/events', label: 'Manage Events', icon: List },
		{ href: '/admin/events/lists', label: 'Event Lists', icon: ListOrdered },
		{ href: '/admin/events/import', label: 'Import iCal', icon: FileDown },
		{ href: '/admin/events/duplicates', label: 'Find Duplicates', icon: Copy }
	];

	const dataNav = [
		{ href: '/admin/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/admin/venues', label: 'Venues', icon: MapPin }
	];

	const settingsNav = [
		{ href: '/admin/settings/taxonomies', label: 'Taxonomies', icon: Tags },
		{ href: '/admin/settings/branding', label: 'Branding', icon: Palette },
		{ href: '/admin/settings/integrations', label: 'Integrations', icon: Plug },
		{ href: '/admin/settings/search', label: 'Search', icon: Search }
	];

	const accountNav = [
		{ href: '/admin/account', label: 'Account', icon: User }
	];

	function isActive(href: string) {
		if (href === '/admin') return $page.url.pathname === '/admin';
		return $page.url.pathname === href || ($page.url.pathname.startsWith(href + '/'));
	}

	const pathSegments = $derived(
		$page.url.pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
	);
</script>

<a
		href="#admin-main"
		class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
	>Skip to main content</a
	>
<Sidebar.Provider class="bg-muted/30">
	<Sidebar.Root>
		<Sidebar.Header class="border-b px-4 py-3">
			<a href="/admin" class="text-lg font-bold tracking-tight">KB Admin</a>
		</Sidebar.Header>
		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each topNav as item}
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
				<Sidebar.GroupLabel>Events</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each eventsNav as item}
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
				<Sidebar.GroupLabel>Data</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each dataNav as item}
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
		<Sidebar.Footer class="border-t px-4 py-3">
			<div class="flex items-center justify-between text-sm">
				<span class="truncate font-medium">{data.user?.name ?? data.user?.email}</span>
				<a href="/" class="text-muted-foreground hover:text-foreground" title="Back to site"><LogOut class="h-4 w-4" /></a>
			</div>
		</Sidebar.Footer>
	</Sidebar.Root>

	<main class="flex-1 overflow-auto" id="admin-main">
		<div class="flex flex-wrap items-center gap-2 border-b bg-background px-6 py-3 text-sm">
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
								<Breadcrumb.Page class="capitalize">{segment.replace(/-/g, ' ')}</Breadcrumb.Page>
							{:else}
								{@const pathSoFar = '/admin/' + pathSegments.slice(0, i + 1).join('/')}
								<Breadcrumb.Link href={pathSoFar} class="capitalize">{segment.replace(/-/g, ' ')}</Breadcrumb.Link>
							{/if}
						</Breadcrumb.Item>
					{/each}
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
		<div class="p-6">
			{@render children()}
		</div>
	</main>
	<Toaster />
</Sidebar.Provider>
