<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { formatDisplayDateTime } from '$lib/utils/display';
	import EventForm from '$lib/components/organisms/admin/EventForm.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 items-center gap-3">
			<h1 class="truncate text-2xl font-bold">{data.event.title}</h1>
			<StatusBadge status={data.event.status ?? 'unknown'} />
		</div>
		<div class="flex flex-wrap gap-2">
			<form
				method="POST"
				action="?/clone"
				use:enhance={() =>
					({ result, update }) => {
						if (result.type === 'success') toast.success('Event cloned');
						else if (result.type === 'failure')
							toast.error((result.data as { error?: string })?.error ?? 'Clone failed');
						update();
					}}
			>
				<Button type="submit" variant="outline">Clone event</Button>
			</form>
			{#if data.event.status === 'pending'}
				<form
					method="POST"
					action="?/approve"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') toast.success('Event approved');
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
							<AlertDialog.Title>Reject event</AlertDialog.Title>
							<AlertDialog.Description
								>Optionally add a reason to store with the rejection.</AlertDialog.Description
							>
						</AlertDialog.Header>
						<form
							method="POST"
							action="?/reject"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') toast.success('Event rejected');
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
								placeholder="e.g. Incomplete information"
							></textarea>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<AlertDialog.Action type="submit">Reject</AlertDialog.Action>
							</AlertDialog.Footer>
						</form>
					</AlertDialog.Content>
				</AlertDialog.Root>
			{/if}
			{#if data.event.status === 'published'}
				<form
					method="POST"
					action="?/cancel"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') toast.success('Event cancelled');
							update();
						}}
				>
					<Button
						type="submit"
						variant="secondary"
						class="border-amber-500 text-amber-700 hover:bg-amber-50">Cancel event</Button
					>
				</form>
			{/if}
			<AlertDialog.Root>
				<AlertDialog.Trigger>
					<Button type="button" variant="destructive">Delete</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Delete event</AlertDialog.Title>
						<AlertDialog.Description>
							This will permanently delete this event. This action cannot be undone.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<form
							method="POST"
							action="?/delete"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') toast.success('Event deleted');
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

	{#if data.children.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Child events ({data.children.length})</Card.Title>
				<Card.Description>Events in this series</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-1 text-sm">
					{#each data.children as child}
						<li class="flex items-center gap-2">
							<a href="/admin/events/{child.id}" class="font-medium text-primary hover:underline"
								>{child.title}</a
							>
							<span class="text-muted-foreground">
								— {formatDisplayDateTime(child.startDate, undefined, 'No date')}
							</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<EventForm
		event={data.event}
		organizations={data.organizations}
		venues={data.venues}
		action="?/update"
		taxonomyTags={data.taxonomyTags ?? []}
		regionOptions={data.regionOptions ?? []}
		audienceOptions={data.audienceOptions ?? []}
		costOptions={data.costOptions ?? []}
		previewHref={`/admin/preview/events/${data.event.id}`}
		liveHref={data.event.slug && data.event.status === 'published'
			? `/events/${data.event.slug}`
			: null}
		submissionContext={{
			createdAt: data.event.createdAt ?? null,
			submitterName: data.event.submitterName ?? null,
			submitterEmail: data.event.submitterEmail ?? null,
			contactName: data.event.contactName ?? null,
			contactEmail: data.event.contactEmail ?? null,
			contactPhone: data.event.contactPhone ?? null
		}}
	/>
</div>
