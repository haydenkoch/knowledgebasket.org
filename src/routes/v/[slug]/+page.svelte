<script lang="ts">
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import Building2Icon from '@lucide/svelte/icons/building-2';

	let { data } = $props();
	const venue = $derived(data.venue);
	const organization = $derived(data.organization);
	const collections = $derived(data.collections);

	const addressLine = $derived(
		[venue.address, venue.city, venue.state, venue.zip].filter(Boolean).join(', ')
	);
	const mapUrl = $derived(
		addressLine
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
			: venue.lat != null && venue.lng != null
				? `https://www.google.com/maps?q=${venue.lat},${venue.lng}`
				: ''
	);
	const linkedOrgContentCount = $derived(
		collections.funding.length +
			collections.jobs.length +
			collections.redpages.length +
			collections.toolbox.length
	);
</script>

<svelte:head>
	<title>{venue.name} | Venue | Knowledge Basket</title>
	<meta
		name="description"
		content={venue.description ?? `Published Knowledge Basket content connected to ${venue.name}.`}
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
	<Breadcrumb.Root class="mb-5">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/">Knowledge Basket</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{venue.name}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<header
		class="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--sh)]"
	>
		<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div class="space-y-4">
				<div class="flex flex-wrap items-center gap-2">
					{#if venue.venueType}
						<span
							class="rounded-full bg-[var(--muted)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
						>
							{venue.venueType}
						</span>
					{/if}
					{#if organization}
						<span
							class="rounded-full bg-[color-mix(in_srgb,var(--teal)_12%,white)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--teal)] uppercase"
						>
							Linked organization
						</span>
					{/if}
				</div>
				<h1
					class="font-serif text-3xl leading-tight font-bold text-[var(--foreground)] sm:text-4xl"
				>
					{venue.name}
				</h1>
				{#if venue.description}
					<p class="max-w-3xl text-base leading-7 text-[var(--muted-foreground)]">
						{venue.description}
					</p>
				{/if}
				<div class="flex flex-wrap gap-3 text-sm text-[var(--foreground)]">
					{#if addressLine}
						<div class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5">
							<MapPinIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>{addressLine}</span>
						</div>
					{/if}
					{#if mapUrl}
						<a
							href={mapUrl}
							target="_blank"
							rel="noopener"
							class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5 text-inherit no-underline transition-colors hover:bg-[var(--accent)]"
						>
							<MapPinIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>Directions</span>
						</a>
					{/if}
					{#if venue.website}
						<a
							href={venue.website}
							target="_blank"
							rel="noopener"
							class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5 text-inherit no-underline transition-colors hover:bg-[var(--accent)]"
						>
							<GlobeIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>Website</span>
						</a>
					{/if}
				</div>
			</div>

			<div class="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-5">
				<div class="grid grid-cols-2 gap-3">
					<div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
						<div class="font-serif text-2xl font-bold text-[var(--foreground)]">
							{collections.events.length}
						</div>
						<div
							class="text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
						>
							Events here
						</div>
					</div>
					<div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
						<div class="font-serif text-2xl font-bold text-[var(--foreground)]">
							{linkedOrgContentCount}
						</div>
						<div
							class="text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
						>
							Linked content
						</div>
					</div>
				</div>

				{#if organization}
					<div class="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
						<div class="flex items-start gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--muted)]"
							>
								<Building2Icon class="size-5 text-[var(--muted-foreground)]" />
							</div>
							<div class="min-w-0">
								<p
									class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase"
								>
									Managed by
								</p>
								<h2 class="mt-1 font-serif text-xl font-semibold text-[var(--foreground)]">
									{organization.name}
								</h2>
								{#if organization.description}
									<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
										{organization.description}
									</p>
								{/if}
								<Button variant="outline" href={`/o/${organization.slug}`} class="mt-4">
									View organization hub
								</Button>
							</div>
						</div>
					</div>
				{:else}
					<p class="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
						This venue is not yet linked to an organization profile, so only venue-specific event
						content is shown here.
					</p>
				{/if}
			</div>
		</div>
	</header>

	<section class="mt-8 space-y-4">
		<div>
			<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
				Events
			</p>
			<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">
				Upcoming events at this venue
			</h2>
		</div>
		{#if collections.events.length > 0}
			<ul class="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
				{#each collections.events as event, index (event.id)}
					<li><EventCard {event} {index} /></li>
				{/each}
			</ul>
		{:else}
			<div
				class="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center"
			>
				<p class="font-serif text-2xl font-semibold text-[var(--foreground)]">
					No upcoming events are linked to this venue
				</p>
				<p class="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
					Check back soon or explore the linked organization profile for additional activity.
				</p>
			</div>
		{/if}
	</section>

	{#if organization && linkedOrgContentCount > 0}
		<section class="mt-8 space-y-6">
			<div>
				<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
					Linked organization
				</p>
				<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">
					More from {organization.name}
				</h2>
			</div>

			{#if collections.funding.length > 0}
				<div class="space-y-4">
					<h3 class="font-serif text-xl font-semibold text-[var(--foreground)]">Funding</h3>
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each collections.funding as item, index (item.id)}
							<FundingCard {item} {index} />
						{/each}
					</div>
				</div>
			{/if}

			{#if collections.jobs.length > 0}
				<div class="space-y-4">
					<h3 class="font-serif text-xl font-semibold text-[var(--foreground)]">Jobs</h3>
					<div class="flex flex-col gap-3">
						{#each collections.jobs as job, index (job.id)}
							<JobListItem {job} {index} />
						{/each}
					</div>
				</div>
			{/if}

			{#if collections.redpages.length > 0}
				<div class="space-y-4">
					<h3 class="font-serif text-xl font-semibold text-[var(--foreground)]">Red Pages</h3>
					<div class="flex flex-col gap-3">
						{#each collections.redpages as vendor, index (vendor.id)}
							<RedPagesListItem {vendor} {index} />
						{/each}
					</div>
				</div>
			{/if}

			{#if collections.toolbox.length > 0}
				<div class="space-y-4">
					<h3 class="font-serif text-xl font-semibold text-[var(--foreground)]">Toolbox</h3>
					<div class="grid gap-3 md:grid-cols-2">
						{#each collections.toolbox as resource (resource.id)}
							<a
								href={`/toolbox/${resource.slug ?? resource.id}`}
								class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-inherit no-underline shadow-[var(--sh)] transition-transform hover:-translate-y-0.5"
							>
								<div class="flex flex-wrap gap-2">
									{#if resource.mediaType}
										<span
											class="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
										>
											{resource.mediaType}
										</span>
									{/if}
									{#if resource.category}
										<span
											class="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
										>
											{resource.category}
										</span>
									{/if}
								</div>
								<h3 class="mt-3 font-serif text-xl font-semibold text-[var(--foreground)]">
									{resource.title}
								</h3>
								{#if resource.description}
									<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
										{resource.description}
									</p>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<div class="mt-10">
		<Button variant="outline" href="/">← Back to Knowledge Basket</Button>
	</div>
</div>
