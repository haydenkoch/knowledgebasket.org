<script lang="ts">
	import JobForm from '$lib/components/organisms/admin/JobForm.svelte';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Jobs"
		title="Add job"
		description="Create a new job listing to publish on the public site."
	/>
	<JobForm
		mode="create"
		action="?/default"
		submitLabel="Create job"
		organizations={data.organizations}
	/>
</div>
