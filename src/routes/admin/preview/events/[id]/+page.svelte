<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { CalendarDays, ExternalLink, MapPin } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	function formatDate(value?: string | null) {
		if (!value) return null;
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
				Admin preview
			</p>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<h1 class="text-3xl font-bold">{data.event.title}</h1>
				<StatusBadge status={data.event.status ?? 'draft'} />
			</div>
			<p class="mt-2 max-w-2xl text-sm text-[var(--mid)]">
				This route previews the currently saved draft record without relying on the public published
				page.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/events/${data.event.id}`} variant="outline">Back to editor</Button>
			{#if data.event.slug && data.event.status === 'published'}
				<Button
					href={`/events/${data.event.slug}`}
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
				<Card.Title>Draft event content</Card.Title>
				<Card.Description
					>Saved title, description, links, and core presentation fields.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if data.event.imageUrl}
					<img
						src={data.event.imageUrl}
						alt=""
						class="max-h-[320px] w-full rounded-2xl border border-[color:var(--rule)] object-cover"
					/>
				{/if}
				{#if data.event.description}
					<div class="prose prose-sm max-w-none [&_a]:text-[var(--teal)]">
						{@html data.event.description}
					</div>
				{:else}
					<p class="text-sm text-[var(--mid)]">No description saved yet.</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Draft metadata</Card.Title>
				<Card.Description>Key details moderators should verify before publishing.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4 text-sm">
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<CalendarDays class="h-4 w-4" />
						Date and time
					</div>
					<p class="mt-2 text-[var(--mid)]">
						{formatDate(data.event.startDate) ?? 'No start date'}
						{#if data.event.endDate}
							<br />
							Ends {formatDate(data.event.endDate)}
						{/if}
					</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<div class="flex items-center gap-2 font-medium text-[var(--dark)]">
						<MapPin class="h-4 w-4" />
						Location
					</div>
					<p class="mt-2 text-[var(--mid)]">{data.event.location ?? 'No location saved'}</p>
				</div>
				<div class="rounded-xl border border-[color:var(--rule)] p-4">
					<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
						Links
					</p>
					<div class="mt-2 space-y-2">
						{#if data.event.eventUrl}
							<a
								href={data.event.eventUrl}
								target="_blank"
								rel="noreferrer"
								class="block text-[var(--teal)] hover:underline"
							>
								Event URL
							</a>
						{/if}
						{#if data.event.registrationUrl}
							<a
								href={data.event.registrationUrl}
								target="_blank"
								rel="noreferrer"
								class="block text-[var(--teal)] hover:underline"
							>
								Registration URL
							</a>
						{/if}
						{#if !data.event.eventUrl && !data.event.registrationUrl}
							<p class="text-[var(--mid)]">No outbound links saved yet.</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
