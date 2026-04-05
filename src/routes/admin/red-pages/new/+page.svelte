<script lang="ts">
	import RedPagesForm from '$lib/components/organisms/admin/RedPagesForm.svelte';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Red Pages"
		title="Add listing"
		description="Create a new Native business directory listing to publish on the public site."
	/>
	<RedPagesForm
		mode="create"
		action="?/default"
		submitLabel="Create listing"
		organizations={data.organizations}
	/>
</div>
