<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { BriefcaseBusiness, ExternalLink, MapPin } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<div class="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
				Admin preview
			</p>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<h1 class="text-3xl font-bold">{data.job.title}</h1>
				<StatusBadge status={data.job.status ?? 'draft'} />
			</div>
			<p class="mt-2 max-w-2xl text-sm text-[var(--mid)]">
				This route previews the saved draft job without depending on the public published page.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/jobs/${data.job.id}`} variant="outline">Back to editor</Button>
			{#if data.job.slug && data.job.status === 'published'}
				<Button
					href={`/jobs/${data.job.slug}`}
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
				<Card.Title>Draft job content</Card.Title>
				<Card.Description
					>Saved description, qualifications, and application instructions.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if data.job.imageUrl}
					<img
						src={data.job.imageUrl}
						alt=""
						class="max-h-[320px] w-full rounded-2xl border border-[color:var(--rule)] object-cover"
					/>
				{/if}
				{#if data.job.description}
					<div class="prose prose-sm max-w-none [&_a]:text-[var(--teal)]">
						{@html data.job.description}
					</div>
				{:else}
					<p class="text-sm text-[var(--mid)]">No description saved yet.</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Draft metadata</Card.Title>
				<Card.Description>Key details editors usually verify before publishing.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4 text-sm">
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<BriefcaseBusiness class="h-4 w-4" />
						Role and employer
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.job.employerName ?? 'No employer saved'}
						<br />
						{formatDisplayValue(data.job.jobType, { key: 'jobType' })} ·
						{formatDisplayValue(data.job.workArrangement, { key: 'workArrangement' })}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<MapPin class="h-4 w-4" />
						Location and deadline
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.job.location ?? 'No location saved'}
						<br />
						Deadline: {formatDisplayValue(data.job.applicationDeadline, {
							key: 'applicationDeadline'
						})}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
						Links
					</p>
					<div class="mt-2 space-y-2">
						{#if data.job.applyUrl}
							<a
								href={data.job.applyUrl}
								target="_blank"
								rel="noreferrer"
								class="block text-[var(--teal)] hover:underline"
							>
								Application URL
							</a>
						{/if}
						{#if !data.job.applyUrl}
							<p class="text-[var(--mid)]">No application link saved yet.</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
