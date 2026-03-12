<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ListIcon from '@lucide/svelte/icons/list';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import CalendarIcon from '@lucide/svelte/icons/calendar-days';

	type EventView = 'cards' | 'list' | 'calendar';

	let { value = $bindable('list') }: { value?: EventView } = $props();
</script>

<Tabs.Root bind:value class="kb-view-selector">
	<Tabs.List class="kb-view-tabs-list">
		<Tabs.Trigger value="list" class="kb-view-tab" aria-label="List view" title="List view">
			<ListIcon class="kb-view-tab-icon" />
		</Tabs.Trigger>
		<Tabs.Trigger value="cards" class="kb-view-tab" aria-label="Card view" title="Card view">
			<LayoutGridIcon class="kb-view-tab-icon" />
		</Tabs.Trigger>
		<Tabs.Trigger value="calendar" class="kb-view-tab" aria-label="Calendar view" title="Calendar view">
			<CalendarIcon class="kb-view-tab-icon" />
		</Tabs.Trigger>
	</Tabs.List>
</Tabs.Root>
