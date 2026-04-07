<script lang="ts">
	import { page } from '$app/stores';

	let { data, children } = $props();
	const organization = $derived(data.organization);

	const links = $derived([
		{ href: `/orgs/${organization.slug}`, label: 'Overview' },
		{ href: `/orgs/${organization.slug}/settings`, label: 'Settings' },
		{ href: `/orgs/${organization.slug}/team`, label: 'Team' },
		{ href: `/orgs/${organization.slug}/events`, label: 'Events' },
		{ href: `/orgs/${organization.slug}/jobs`, label: 'Jobs' },
		{ href: `/orgs/${organization.slug}/resources`, label: 'Resources' }
	]);

	function isActive(href: string) {
		if (href === `/orgs/${organization.slug}`) return $page.url.pathname === href;
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
	<div class="space-y-3">
		<p class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
			Organization workspace
		</p>
		<h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">{organization.name}</h1>
		<p class="text-lg leading-8 text-muted-foreground">
			Role: {data.membership.role}. Submit and manage organization-linked content without needing
			site-wide admin access.
		</p>
	</div>

	<nav class="flex flex-wrap gap-2">
		{#each links as link}
			<a
				href={link.href}
				class={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
					isActive(link.href)
						? 'bg-foreground text-background'
						: 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
				}`}
			>
				{link.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</section>
