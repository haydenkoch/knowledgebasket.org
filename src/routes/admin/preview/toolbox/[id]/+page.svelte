<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { BookOpenText, ExternalLink, Tags } from '@lucide/svelte';
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
				<h1 class="text-3xl font-bold">{data.resource.title}</h1>
				<StatusBadge status={data.resource.status ?? 'draft'} />
			</div>
			<p class="mt-2 max-w-2xl text-sm text-[var(--mid)]">
				This route previews the saved resource draft without depending on the public published page.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/toolbox/${data.resource.id}`} variant="outline">Back to editor</Button>
			{#if data.resource.slug && data.resource.status === 'published'}
				<Button
					href={`/toolbox/${data.resource.slug}`}
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
				<Card.Title>Draft resource content</Card.Title>
				<Card.Description>Saved summary and hosted body content.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if data.resource.imageUrl}
					<img
						src={data.resource.imageUrl}
						alt=""
						class="max-h-[320px] w-full rounded-2xl border border-[color:var(--rule)] object-cover"
					/>
				{/if}
				{#if data.resource.description}
					<div class="prose prose-sm max-w-none [&_a]:text-[var(--teal)]">
						{@html data.resource.description}
					</div>
				{:else}
					<p class="text-sm text-[var(--mid)]">No description saved yet.</p>
				{/if}
				{#if data.resource.body}
					<div class="rounded-xl border border-[color:var(--rule)] p-4">
						<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
							Hosted body
						</p>
						<div class="prose prose-sm mt-3 max-w-none [&_a]:text-[var(--teal)]">
							{@html data.resource.body}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Draft metadata</Card.Title>
				<Card.Description>Key details editors normally verify before publishing.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4 text-sm">
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<BookOpenText class="h-4 w-4" />
						Type and source
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.resource.resourceType ?? 'No resource type saved'}
						<br />
						{data.resource.sourceName ?? 'No source saved'}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<Tags class="h-4 w-4" />
						Classification
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.resource.category ?? 'No category saved'}
						<br />
						Mode: {data.resource.contentMode ?? 'No mode saved'}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
						Destination
					</p>
					<div class="mt-2 space-y-2 text-[var(--mid)]">
						<p>
							{data.resource.externalUrl ?? data.resource.fileUrl ?? 'No destination URL saved'}
						</p>
						<p>{data.resource.author ?? 'No author saved'}</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
