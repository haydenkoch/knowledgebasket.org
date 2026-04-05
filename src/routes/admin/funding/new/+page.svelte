<script lang="ts">
	import FundingForm from '$lib/components/organisms/admin/FundingForm.svelte';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Funding"
		title="Add funding"
		description="Create a new funding listing to publish on the public site."
	/>
	<FundingForm
		mode="create"
		action="?/default"
		submitLabel="Create funding"
		organizations={data.organizations}
	/>
</div>
