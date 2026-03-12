<script lang="ts">
	import { page } from '$app/stores';
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import { Globe2, CalendarClock, HandCoins, BookOpen, BriefcaseBusiness, Wrench } from '@lucide/svelte';

	const navItems: { path: string; label: string; icon: typeof Globe2 }[] = [
		{ path: '/', label: 'Home', icon: Globe2 },
		{ path: '/events', label: coilLabels.events, icon: CalendarClock },
		{ path: '/funding', label: coilLabels.funding, icon: HandCoins },
		{ path: '/red-pages', label: coilLabels.redpages, icon: BookOpen },
		{ path: '/jobs', label: coilLabels.jobs, icon: BriefcaseBusiness },
		{ path: '/toolbox', label: coilLabels.toolbox, icon: Wrench }
	];

	let pathname = $derived($page.url.pathname);
	function isActive(path: string): boolean {
		if (path === '/') return pathname === '/';
		return pathname === path || pathname.startsWith(path + '/');
	}
</script>

<header class="kb-site-header">
	<a href="/" class="kb-logo">
		<img src="/images/logo.png" alt="" class="kb-logo-img" width="48" height="48" />
		<span class="kb-logo-text">
			Indigenous Futures Society
			<span>Igniting Indigenous Guardianship in the Sierra Nevada</span>
		</span>
	</a>
	<nav class="kb-site-nav" aria-label="Main">
		<a href="https://indigenousfuturessociety.org/">Our Roots</a>
		<a href="https://indigenousfuturessociety.org/our-people/">Our People</a>
		<a href="https://indigenousfuturessociety.org/our-work/">Our Work</a>
		<a href="https://indigenousfuturessociety.org/our-stories/">Our Stories</a>
		<a href="https://indigenousfuturessociety.org/get-involved/">Get Involved</a>
		<a href="https://indigenousfuturessociety.org/#donate" class="kb-donate-btn">Donate Now</a>
	</nav>
</header>
<nav class="kb-nav" aria-label="Knowledge Basket">
	<span class="kb-lbl">Knowledge Basket</span>
	{#each navItems as { path, label, icon: Icon }}
		<a
			href={path}
			class="kb-tab {isActive(path) ? 'active' : ''}"
		>
			<Icon class="size-4 shrink-0" aria-hidden="true" />
			{label}
		</a>
	{/each}
</nav>
