<script lang="ts">
	import { CalendarDays, LayoutGrid, List } from '@lucide/svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';

	type EventView = 'cards' | 'list' | 'calendar';

	interface Props {
		eventView?: EventView;
		class?: string;
	}

	let { eventView = $bindable('list'), class: className = '' }: Props = $props();
</script>

<Tabs bind:value={eventView} class={`w-full ${className}`.trim()}>
	<TabsList class="w-full">
		<TabsTrigger value="list">
			<List class="h-4 w-4" />
			List
		</TabsTrigger>
		<TabsTrigger value="cards">
			<LayoutGrid class="h-4 w-4" />
			Cards
		</TabsTrigger>
		<TabsTrigger value="calendar">
			<CalendarDays class="h-4 w-4" />
			Calendar
		</TabsTrigger>
	</TabsList>
</Tabs>
