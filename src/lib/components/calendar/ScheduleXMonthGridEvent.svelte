<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';

	interface Props {
		calendarEvent?: { id?: string | number; title?: string; cost?: string };
		hasStartDate?: boolean;
	}
	let { calendarEvent, hasStartDate = true }: Props = $props();
	const id = $derived(String(calendarEvent?.id ?? ''));
	const title = $derived(calendarEvent?.title ?? '');
	const cost = $derived((calendarEvent?.cost ?? '').trim().toLowerCase());
	const isFree = $derived(cost === 'free');
	const costLabel = $derived(calendarEvent?.cost ?? '');
</script>

<a
	href="/events/{id}"
	class="kb-sx-event kb-sx-event--month {isFree ? 'kb-sx-event--free' : 'kb-sx-event--paid'}"
	onclick={(e) => e.stopPropagation()}
>
	<span class="kb-sx-event__title">{title}</span>
	{#if costLabel}
		<Badge variant="secondary" class="kb-sx-event__badge kb-badge-cost">{costLabel}</Badge>
	{/if}
</a>
