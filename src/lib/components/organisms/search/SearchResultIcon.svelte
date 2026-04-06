<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Database from '@lucide/svelte/icons/database';
	import FileText from '@lucide/svelte/icons/file-text';
	import type { SearchResultIcon as SearchResultIconToken } from '$lib/server/search-contracts';

	let {
		icon,
		class: className = 'h-4 w-4'
	}: {
		icon: SearchResultIconToken;
		class?: string;
	} = $props();

	const iconMap = {
		calendar: CalendarDays,
		funding: HandCoins,
		business: Store,
		job: Briefcase,
		resource: Wrench,
		organization: Building2,
		venue: MapPin,
		source: Database,
		page: FileText
	} satisfies Record<SearchResultIconToken, typeof CalendarDays>;

	const Icon = $derived(iconMap[icon]);
</script>

<Icon class={className} />
