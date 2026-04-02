<script lang="ts">
	import EventForm from '$lib/components/organisms/admin/EventForm.svelte';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Events"
		title="Add event"
		description="Create a new event to publish on the public calendar."
	/>
	<EventForm
		mode="create"
		organizations={data.organizations}
		venues={data.venues}
		taxonomyTags={data.taxonomyTags ?? []}
		regionOptions={data.regionOptions ?? []}
		audienceOptions={data.audienceOptions ?? []}
		costOptions={data.costOptions ?? []}
	/>
</div>

