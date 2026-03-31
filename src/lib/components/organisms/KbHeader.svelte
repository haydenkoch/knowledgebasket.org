<script lang="ts">
	import { page } from '$app/stores';
	import logoFallback from '$lib/assets/favicon.svg';

	let { logoUrl }: { logoUrl?: string | null } = $props();

	const coilLinks = [
		{ href: '/events', label: 'Events', key: 'events' },
		{ href: '/funding', label: 'Funding', key: 'funding' },
		{ href: '/red-pages', label: 'Red Pages', key: 'red-pages' },
		{ href: '/jobs', label: 'Jobs', key: 'jobs' },
		{ href: '/toolbox', label: 'Toolbox', key: 'toolbox' }
	];

	const pathname = $derived($page.url.pathname);
	const activeCoil = $derived(coilLinks.find((c) => pathname.startsWith(c.href))?.key ?? '');
</script>

<header class="bg-[var(--navy)] px-10 flex items-center justify-between h-[72px] sticky top-0 z-[600] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
	<a href="/" class="flex items-center gap-[14px] no-underline cursor-pointer">
		<img src={logoUrl ?? logoFallback} alt="Knowledge Basket" class="w-12 h-12 rounded-full object-cover" />
		<span class="font-sans text-white text-[13px] font-bold tracking-[0.04em] uppercase leading-[1.3]">
			Knowledge Basket
			<span class="block font-light text-[11px] opacity-80 normal-case tracking-normal">Indigenous Futures Society</span>
		</span>
	</a>
	<nav aria-label="Site navigation">
		<a
			href="/about"
			class="hidden sm:inline font-sans text-white/75 no-underline text-[13px] font-semibold tracking-[0.04em] uppercase ml-7 transition-colors duration-150 hover:text-white focus-visible:text-white"
		>About</a>
	</nav>
</header>

<nav
	class="bg-[var(--teal-dk)] flex items-stretch px-10 sticky top-[72px] z-[500] border-b border-white/[0.12]"
	aria-label="Coil navigation"
>
	<span class="hidden sm:flex font-sans text-white/50 text-[11px] font-bold tracking-[0.1em] uppercase pr-6 mr-2 border-r border-white/[0.15] items-center">Coils</span>
	{#each coilLinks as link}
		<a
			href={link.href}
			class="font-sans text-[13px] font-semibold py-4 px-[22px] cursor-pointer border-b-[3px] transition-all duration-150 whitespace-nowrap select-none inline-flex items-center gap-2 no-underline {activeCoil === link.key
				? 'text-white border-white'
				: 'text-white/65 border-transparent hover:text-white hover:bg-white/[0.06]'}"
		>
			{link.label}
		</a>
	{/each}
</nav>
