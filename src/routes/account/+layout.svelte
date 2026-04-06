<script lang="ts">
	import { page } from '$app/stores';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Settings from '@lucide/svelte/icons/settings';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Heart from '@lucide/svelte/icons/heart';
	import Bell from '@lucide/svelte/icons/bell';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

	let { data, children } = $props();

	type NavItem = {
		href: string;
		label: string;
		icon: typeof LayoutDashboard;
		desc: string;
	};

	const navGroups: { label: string; items: NavItem[] }[] = [
		{
			label: 'Profile',
			items: [
				{
					href: '/account',
					label: 'Dashboard',
					icon: LayoutDashboard,
					desc: 'Profile, quick stats, and jumping-off points for the rest of your account.'
				},
				{
					href: '/account/settings',
					label: 'Settings',
					icon: Settings,
					desc: 'Change your email, password, and active sessions.'
				}
			]
		},
		{
			label: 'Activity',
			items: [
				{
					href: '/account/saved',
					label: 'Saved',
					icon: Bookmark,
					desc: 'Bookmarked listings across events, jobs, funding, and more.'
				},
				{
					href: '/account/following',
					label: 'Following',
					icon: Heart,
					desc: 'Organizations you receive updates from.'
				},
				{
					href: '/account/notifications',
					label: 'Notifications',
					icon: Bell,
					desc: 'Delivery preferences and recent alerts.'
				}
			]
		},
		{
			label: 'Workspace',
			items: [
				{
					href: '/account/organizations',
					label: 'Organizations',
					icon: Building2,
					desc: 'Memberships and claim requests tied to your account.'
				},
				{
					href: '/account/calendar',
					label: 'Calendar feed',
					icon: CalendarDays,
					desc: 'Personal iCal subscription for events you care about.'
				}
			]
		},
		{
			label: 'Data',
			items: [
				{
					href: '/account/privacy',
					label: 'Privacy & data',
					icon: ShieldCheck,
					desc: 'Export, correction, and deletion controls for your data.'
				}
			]
		}
	];

	const flatLinks = $derived(navGroups.flatMap((g) => g.items));

	function isActive(href: string): boolean {
		const p = $page.url.pathname;
		if (href === '/account') return p === '/account';
		return p === href || p.startsWith(href + '/');
	}

	const currentLink = $derived(flatLinks.find((l) => isActive(l.href)) ?? flatLinks[0]);

	const userImage = $derived((data.user as { image?: string | null })?.image ?? null);
	const name = $derived(data.user?.name || data.user?.email?.split('@')[0] || 'Account');
	const email = $derived(data.user?.email ?? '');
	const initial = $derived(name.charAt(0).toUpperCase());
	const role = $derived(((data.user as { role?: string })?.role ?? 'contributor') as string);
	const isStaff = $derived(role === 'admin' || role === 'moderator');
</script>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
	<div class="flex flex-wrap items-center gap-5 sm:gap-6">
		<Avatar.Root class="size-16 border border-border/70">
			{#if userImage}
				<Avatar.Image src={userImage} alt={name} class="object-cover" />
			{/if}
			<Avatar.Fallback class="bg-muted text-xl font-semibold">
				{initial}
			</Avatar.Fallback>
		</Avatar.Root>
		<div class="min-w-0 flex-1 space-y-2">
			<p class="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
				Account
			</p>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
			<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
				<span class="truncate">{email}</span>
				<span aria-hidden="true">·</span>
				<Badge
					variant={isStaff ? 'default' : 'secondary'}
					class="text-[10px] tracking-wider uppercase"
				>
					{role}
				</Badge>
				{#if isStaff}
					<a href="/admin" class="ml-1 text-sm font-medium text-foreground hover:underline">
						Admin console
					</a>
				{/if}
			</div>
		</div>
	</div>

	<nav class="lg:hidden" aria-label="Account navigation">
		<div class="flex w-full gap-2 overflow-x-auto pb-1">
			{#each flatLinks as link}
				<a
					href={link.href}
					class={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
						isActive(link.href)
							? 'border-foreground bg-foreground text-background'
							: 'border-border/70 bg-card text-muted-foreground hover:border-border hover:text-foreground'
					}`}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					<link.icon class="size-4" />
					{link.label}
				</a>
			{/each}
		</div>
	</nav>

	<div class="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
		<aside class="hidden lg:sticky lg:top-20 lg:block lg:self-start" aria-label="Account sections">
			<nav class="flex flex-col gap-6">
				{#each navGroups as group}
					<div>
						<p
							class="px-3 pb-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
						>
							{group.label}
						</p>
						<ul class="flex flex-col gap-0.5">
							{#each group.items as link}
								<li>
									<a
										href={link.href}
										class={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
											isActive(link.href)
												? 'bg-muted text-foreground'
												: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
										}`}
										aria-current={isActive(link.href) ? 'page' : undefined}
									>
										<link.icon class="size-4 shrink-0 opacity-80" />
										<span>{link.label}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>
		</aside>

		<section class="min-w-0 space-y-8" aria-labelledby="account-section-heading">
			<header class="space-y-2">
				<p class="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
					{currentLink.label}
				</p>
				<h2 id="account-section-heading" class="text-3xl font-semibold tracking-tight sm:text-4xl">
					{currentLink.label}
				</h2>
				<p class="max-w-2xl text-base leading-7 text-muted-foreground">{currentLink.desc}</p>
			</header>
			{@render children()}
		</section>
	</div>
</section>
