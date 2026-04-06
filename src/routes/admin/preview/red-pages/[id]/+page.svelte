<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { BadgeCheck, ExternalLink, MapPin } from '@lucide/svelte';
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
				<h1 class="text-3xl font-bold">{data.business.name ?? data.business.title}</h1>
				<StatusBadge status={data.business.status ?? 'draft'} />
			</div>
			<p class="mt-2 max-w-2xl text-sm text-[var(--mid)]">
				This route previews the saved directory listing without depending on the public published
				page.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/red-pages/${data.business.id}`} variant="outline">Back to editor</Button
			>
			{#if data.business.slug && data.business.status === 'published'}
				<Button
					href={`/red-pages/${data.business.slug}`}
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
				<Card.Title>Draft listing content</Card.Title>
				<Card.Description>Saved narrative and public-facing identity details.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if data.business.imageUrl}
					<img
						src={data.business.imageUrl}
						alt=""
						class="max-h-[320px] w-full rounded-2xl border border-[color:var(--rule)] object-cover"
					/>
				{/if}
				{#if data.business.description}
					<div class="prose prose-sm max-w-none [&_a]:text-[var(--teal)]">
						{@html data.business.description}
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
					>Key business details moderators usually verify before publishing.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4 text-sm">
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<BadgeCheck class="h-4 w-4" />
						Identity
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.business.tribalAffiliation ?? 'No tribal affiliation saved'}
						<br />
						{data.business.serviceType ?? 'No service type saved'}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<MapPin class="h-4 w-4" />
						Service area
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{data.business.region ?? data.business.serviceArea ?? 'No service area saved'}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
						Contact
					</p>
					<div class="mt-2 space-y-2 text-[var(--mid)]">
						<p>{data.business.website ?? 'No website saved'}</p>
						<p>{data.business.email ?? 'No email saved'}</p>
						<p>{data.business.phone ?? 'No phone saved'}</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
