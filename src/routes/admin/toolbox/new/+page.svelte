<script lang="ts">
	import ToolboxForm from '$lib/components/organisms/admin/ToolboxForm.svelte';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<AdminPageHeader
		eyebrow="Toolbox"
		title="Add resource"
		description="Create a new resource, guide, hosted page, or external link for the public toolbox."
	/>
	<ToolboxForm
		mode="create"
		action="?/default"
		submitLabel="Create resource"
		organizations={data.organizations}
	/>
</div>
