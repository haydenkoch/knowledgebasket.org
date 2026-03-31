<script lang="ts">
	import EventForm from '$lib/components/organisms/admin/EventForm.svelte';

	let { data } = $props();
</script>

<div>
	<h1 class="mb-6 text-2xl font-bold">New Event</h1>
	<EventForm
	organizations={data.organizations}
	venues={data.venues}
	taxonomyTags={data.taxonomyTags ?? []}
	regionOptions={data.regionOptions ?? []}
	audienceOptions={data.audienceOptions ?? []}
	costOptions={data.costOptions ?? []}
/>
</div>
