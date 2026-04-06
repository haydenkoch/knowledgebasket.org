<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { BadgeDollarSign, Clock3, ExternalLink } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const openDateLabel = $derived(
		data.funding.openDate ? formatDisplayValue(data.funding.openDate, { key: 'openDate' }) : null
	);
	const deadlineLabel = $derived(
		data.funding.deadline ? formatDisplayValue(data.funding.deadline, { key: 'deadline' }) : null
	);
</script>

<div class="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
				Admin preview
			</p>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<h1 class="text-3xl font-bold">{data.funding.title}</h1>
				<StatusBadge status={data.funding.status ?? 'draft'} />
			</div>
			<p class="mt-2 max-w-2xl text-sm text-[var(--mid)]">
				This route previews the currently saved funding draft without depending on the public
				published page.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/funding/${data.funding.id}`} variant="outline">Back to editor</Button>
			{#if data.funding.slug && data.funding.status === 'published'}
				<Button
					href={`/funding/${data.funding.slug}`}
					target="_blank"
					rel="noreferrer"
					variant="secondary"
				>
					<ExternalLink class="mr-2 h-4 w-4" />
					View public page
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
		<Card.Root>
			<Card.Header>
				<Card.Title>Draft funding content</Card.Title>
				<Card.Description
					>Saved narrative and call-to-action details for this opportunity.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if data.funding.imageUrl}
					<img
						src={data.funding.imageUrl}
						alt=""
						class="max-h-[320px] w-full rounded-2xl border border-[color:var(--rule)] object-cover"
					/>
				{/if}
				{#if data.funding.description}
					<div class="prose prose-sm max-w-none [&_a]:text-[var(--teal)]">
						{@html data.funding.description}
					</div>
				{:else}
					<p class="text-sm text-[var(--mid)]">No description saved yet.</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Draft metadata</Card.Title>
				<Card.Description
					>Key funding details moderators usually verify before publishing.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4 text-sm">
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<BadgeDollarSign class="h-4 w-4" />
						Amount
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.funding.amountDescription ?? 'No amount description saved'}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<Clock3 class="h-4 w-4" />
						Cycle
					</div>
					<p class="mt-2 text-[var(--mid)]">
						Open: {openDateLabel ?? 'Not set'}
						<br />
						Deadline: {deadlineLabel ?? 'Not set'}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
						Links
					</p>
					<div class="mt-2 space-y-2">
						{#if data.funding.applyUrl}
							<a
								href={data.funding.applyUrl}
								target="_blank"
								rel="noreferrer"
								class="block text-[var(--teal)] hover:underline"
							>
								Application URL
							</a>
						{/if}
						{#if data.funding.contactEmail}
							<a
								href={`mailto:${data.funding.contactEmail}`}
								class="block text-[var(--teal)] hover:underline"
							>
								{data.funding.contactEmail}
							</a>
						{/if}
						{#if !data.funding.applyUrl && !data.funding.contactEmail}
							<p class="text-[var(--mid)]">No external contact details saved yet.</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
