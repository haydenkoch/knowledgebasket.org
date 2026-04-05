<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import FundingForm from '$lib/components/organisms/admin/FundingForm.svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { ExternalLink } from '@lucide/svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 items-center gap-3">
			<h1 class="truncate text-2xl font-bold">{data.funding.title}</h1>
			<StatusBadge status={data.funding.status ?? 'unknown'} />
			{#if data.funding.slug && data.funding.status === 'published'}
				<Button
					href={`/funding/${data.funding.slug}`}
					variant="outline"
					size="sm"
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLink class="mr-1.5 h-3.5 w-3.5" />
					View on site
				</Button>
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#if data.funding.status === 'pending'}
				<form
					method="POST"
					action="?/approve"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') toast.success('Funding approved');
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
							<AlertDialog.Title>Reject funding</AlertDialog.Title>
							<AlertDialog.Description>
								Optionally add a reason to store with the rejection.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<form
							method="POST"
							action="?/reject"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') toast.success('Funding rejected');
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
								placeholder="e.g. Missing eligibility details"
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
						<AlertDialog.Title>Delete funding</AlertDialog.Title>
						<AlertDialog.Description>
							This will permanently delete this listing. This action cannot be undone.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<form
							method="POST"
							action="?/delete"
							use:enhance={() =>
								({ result, update }) => {
									if (result.type === 'success') toast.success('Funding deleted');
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

	<Card.Root>
		<Card.Header>
			<Card.Title>Listing details</Card.Title>
			<Card.Description>
				Edit copy, funding metadata, contact fields, and moderation state.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-1 text-sm">
			<p>
				Source: <span class="font-medium">{data.funding.source ?? 'unknown'}</span>
			</p>
			{#if data.funding.publishedAt}
				<p>Published on {new Date(data.funding.publishedAt).toLocaleString()}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Separator />

	<FundingForm funding={data.funding} organizations={data.organizations} action="?/update" />
</div>
