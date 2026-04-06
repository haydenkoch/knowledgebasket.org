<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import ToolboxForm from '$lib/components/organisms/admin/ToolboxForm.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 items-center gap-3">
			<h1 class="truncate text-2xl font-bold">{data.resource.title}</h1>
			<StatusBadge status={data.resource.status ?? 'unknown'} />
		</div>
		<div class="flex flex-wrap gap-2">
			{#if data.resource.status === 'pending'}
				<form
					method="POST"
					action="?/approve"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') toast.success('Resource approved');
							update();
						}}
				>
					<Button type="submit" class="bg-green-600 hover:bg-green-700">Approve</Button>
				</form>
				<AlertDialog.Root>
					<AlertDialog.Trigger>
						<Button type="button" variant="destructive">Reject</Button>
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>Reject resource</AlertDialog.Title>
							<AlertDialog.Description>
								Optionally add a reason to store with the rejection.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<form
							method="POST"
							action="?/reject"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') toast.success('Resource rejected');
									update();
								}}
							class="space-y-3"
						>
							<label for="reject-reason" class="text-sm font-medium">Reason (optional)</label>
							<textarea
								id="reject-reason"
								name="reason"
								rows="2"
								class="w-full rounded border px-3 py-2 text-sm"
								placeholder="e.g. Broken link or not aligned with the toolbox scope"
							></textarea>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<AlertDialog.Action type="submit">Reject</AlertDialog.Action>
							</AlertDialog.Footer>
						</form>
					</AlertDialog.Content>
				</AlertDialog.Root>
			{/if}
			<AlertDialog.Root>
				<AlertDialog.Trigger>
					<Button type="button" variant="destructive">Delete</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Delete resource</AlertDialog.Title>
						<AlertDialog.Description>
							This will permanently delete this resource. This action cannot be undone.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<form
							method="POST"
							action="?/delete"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') toast.success('Resource deleted');
									update();
								}}
						>
							<AlertDialog.Action
								type="submit"
								class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
							>
								Delete
							</AlertDialog.Action>
						</form>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</div>
	</div>

	<ToolboxForm
		resource={data.resource}
		organizations={data.organizations}
		action="?/update"
		previewHref={`/admin/preview/toolbox/${data.resource.id}`}
		liveHref={data.resource.slug && data.resource.status === 'published'
			? `/toolbox/${data.resource.slug}`
			: null}
		submissionContext={data.submissionContext}
	/>
</div>
