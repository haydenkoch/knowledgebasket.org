<script lang="ts">
	import { browser } from '$app/environment';
	import {
		trackContentViewed,
		trackExternalLinkClicked,
		trackOrganizationAction
	} from '$lib/analytics/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import MailIcon from '@lucide/svelte/icons/mail';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data, form } = $props();
	const organization = $derived(data.organization);
	const collections = $derived(data.collections);
	const viewerMembershipRole = $derived(data.viewerMembershipRole as string | null);
	const viewerClaimStatus = $derived(data.viewerClaimStatus as string | null);
	const isFollowing = $derived(Boolean(data.isFollowing));
	const canManage = $derived(Boolean(data.canManageOrganization));
	const isSignedIn = $derived(Boolean(data.user));
	const origin = $derived((data.seoOrigin ?? '') as string);
	const loginHref = $derived(
		`/auth/login?redirect=${encodeURIComponent(`/o/${organization.slug}`)}`
	);
	const canonicalUrl = $derived(`${origin}/o/${organization.slug}`);
	const metaDescription = $derived(
		organization.description ??
			`Published Knowledge Basket content connected to ${organization.name}.`
	);
	const organizationLogoUrl = $derived(
		resolveAbsoluteUrl(organization.logoUrl, {
			origin
		})
	);
	const socialImage = $derived(
		buildOgImagePath({
			title: organization.name,
			eyebrow: 'Knowledge Basket · Organization',
			theme: 'organization',
			meta: organization.region ?? organization.orgType ?? 'Organization hub'
		})
	);
	const breadcrumbItems = $derived([
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: organization.name, pathname: `/o/${organization.slug}` }
	]);
	const organizationJsonLd = $derived.by(() => {
		const schema: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: organization.name,
			description: metaDescription,
			url: canonicalUrl
		};
		if (organization.website) schema.sameAs = [organization.website];
		if (organizationLogoUrl) schema.logo = organizationLogoUrl;
		if (organization.email) schema.email = organization.email;
		if (organization.phone) schema.telephone = organization.phone;
		if (locationLine) {
			schema.address = {
				'@type': 'PostalAddress',
				streetAddress: organization.address,
				addressLocality: organization.city,
				addressRegion: organization.state,
				postalCode: organization.zip
			};
		}
		return schema;
	});

	const stats = $derived([
		{ label: 'Events', value: collections.events.length },
		{ label: 'Funding', value: collections.funding.length },
		{ label: 'Jobs', value: collections.jobs.length },
		{ label: 'Red Pages', value: collections.redpages.length },
		{ label: 'Toolbox', value: collections.toolbox.length },
		{ label: 'Venues', value: collections.venues.length }
	]);

	const locationLine = $derived(
		[organization.address, organization.city, organization.state, organization.zip]
			.filter(Boolean)
			.join(', ')
	);

	const hasPublishedContent = $derived(
		collections.events.length > 0 ||
			collections.funding.length > 0 ||
			collections.jobs.length > 0 ||
			collections.redpages.length > 0 ||
			collections.toolbox.length > 0
	);
	let lastTrackedSlug = $state('');

	$effect(() => {
		const slug = organization.slug?.trim();
		if (!browser || !slug || lastTrackedSlug === slug) return;
		lastTrackedSlug = slug;
		trackContentViewed({
			contentType: 'organization',
			slug,
			signedIn: Boolean(data.user)
		});
	});
</script>

<SeoHead
	{origin}
	pathname={`/o/${organization.slug}`}
	title={`${organization.name} | Organization | Knowledge Basket`}
	description={metaDescription}
	ogImage={socialImage}
	ogImageAlt={`${organization.name} organization social preview`}
	jsonLd={[organizationJsonLd]}
	{breadcrumbItems}
/>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
	<Breadcrumb.Root class="mb-5">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/">Knowledge Basket</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{organization.name}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<header
		class="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--sh)]"
	>
		<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0 space-y-4">
				<div class="flex items-start gap-4">
					{#if organization.logoUrl}
						<img
							src={organization.logoUrl}
							alt=""
							class="h-18 w-18 shrink-0 rounded-2xl border border-[var(--border)] bg-white object-contain p-2"
						/>
					{/if}
					<div class="min-w-0">
						<div class="mb-2 flex flex-wrap items-center gap-2">
							{#if organization.verified}
								<span
									class="rounded-full bg-[color-mix(in_srgb,var(--green,#16a34a)_16%,white)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--green,#166534)] uppercase"
								>
									Verified
								</span>
							{/if}
							{#if organization.orgType}
								<span
									class="rounded-full bg-[var(--muted)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
								>
									{organization.orgType}
								</span>
							{/if}
							{#if organization.region}
								<span
									class="rounded-full bg-[var(--muted)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
								>
									{organization.region}
								</span>
							{/if}
						</div>
						<h1
							class="font-serif text-3xl leading-tight font-bold text-[var(--foreground)] sm:text-4xl"
						>
							{organization.name}
						</h1>
						{#if organization.description}
							<p class="mt-3 max-w-3xl text-base leading-7 text-[var(--muted-foreground)]">
								{organization.description}
							</p>
						{/if}
					</div>
				</div>

				<div class="flex flex-wrap gap-3 text-sm text-[var(--foreground)]">
					{#if locationLine}
						<div class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5">
							<MapPinIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>{locationLine}</span>
						</div>
					{/if}
					{#if organization.website}
						<a
							href={organization.website}
							target="_blank"
							rel="noopener"
							class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5 text-inherit no-underline transition-colors hover:bg-[var(--accent)]"
							onclick={() =>
								trackExternalLinkClicked({
									contentType: 'organization',
									slug: organization.slug,
									action: 'visit_site',
									href: organization.website,
									signedIn: Boolean(data.user)
								})}
						>
							<GlobeIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>Website</span>
						</a>
					{/if}
					{#if organization.email}
						<a
							href={`mailto:${organization.email}`}
							class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5 text-inherit no-underline transition-colors hover:bg-[var(--accent)]"
							onclick={() =>
								trackExternalLinkClicked({
									contentType: 'organization',
									slug: organization.slug,
									action: 'email',
									href: `mailto:${organization.email}`,
									signedIn: Boolean(data.user)
								})}
						>
							<MailIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>{organization.email}</span>
						</a>
					{/if}
					{#if organization.phone}
						<a
							href={`tel:${organization.phone}`}
							class="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5 text-inherit no-underline transition-colors hover:bg-[var(--accent)]"
							onclick={() =>
								trackExternalLinkClicked({
									contentType: 'organization',
									slug: organization.slug,
									action: 'call',
									href: `tel:${organization.phone}`,
									signedIn: Boolean(data.user)
								})}
						>
							<PhoneIcon class="size-4 text-[var(--muted-foreground)]" />
							<span>{organization.phone}</span>
						</a>
					{/if}
				</div>
			</div>

			<div class="grid min-w-[240px] grid-cols-2 gap-3 lg:w-[280px]">
				<div
					class="col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"
				>
					<p
						class="text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
					>
						Organization access
					</p>
					<div class="mt-3 flex flex-col gap-2">
						{#if canManage}
							<Button href={`/orgs/${organization.slug}`}>Manage organization</Button>
						{:else if isSignedIn}
							<form
								method="POST"
								action="?/toggleFollow"
								onsubmit={() => trackOrganizationAction('toggle_follow', organization.slug)}
							>
								<Button type="submit" variant={isFollowing ? 'outline' : 'default'} class="w-full">
									{isFollowing ? 'Following organization' : 'Follow organization'}
								</Button>
							</form>

							{#if viewerClaimStatus === 'pending'}
								<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
									<p class="text-sm font-medium text-[var(--foreground)]">Claim pending</p>
									<p class="mt-1 text-sm text-[var(--muted-foreground)]">
										We’ve recorded your claim request and a staff reviewer will take a look.
									</p>
									<form method="POST" action="?/cancelClaim" class="mt-3">
										<Button type="submit" variant="ghost" size="sm">Cancel request</Button>
									</form>
								</div>
							{:else}
								<form
									method="POST"
									action="?/createClaim"
									class="space-y-2"
									onsubmit={() => trackOrganizationAction('create_claim', organization.slug)}
								>
									<Textarea
										name="evidence"
										rows={3}
										placeholder="Share a quick note about your role or connection to this organization."
									/>
									<Button type="submit" variant="outline" class="w-full">
										Claim this organization
									</Button>
								</form>
							{/if}
						{:else}
							<Button
								href={loginHref}
								onclick={() => trackOrganizationAction('follow_requires_login', organization.slug)}
							>
								Sign in to follow
							</Button>
							<Button
								href={loginHref}
								variant="outline"
								onclick={() => trackOrganizationAction('claim_requires_login', organization.slug)}
							>
								Claim this organization
							</Button>
						{/if}
						{#if form?.error}
							<p class="text-sm text-destructive">{form.error}</p>
						{/if}
						{#if viewerMembershipRole}
							<p class="text-xs text-[var(--muted-foreground)]">
								Your role: <span class="font-semibold text-[var(--foreground)]"
									>{viewerMembershipRole}</span
								>
							</p>
						{/if}
					</div>
				</div>
				{#each stats as stat}
					<div class="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
						<div class="font-serif text-2xl font-bold text-[var(--foreground)]">{stat.value}</div>
						<div
							class="text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
						>
							{stat.label}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</header>

	{#if collections.venues.length > 0}
		<section class="mt-8 space-y-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p
						class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase"
					>
						Places
					</p>
					<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">Linked venues</h2>
				</div>
			</div>
			<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{#each collections.venues as venue}
					<a
						href={`/v/${venue.slug ?? venue.id}`}
						class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-inherit no-underline shadow-[var(--sh)] transition-transform hover:-translate-y-0.5"
					>
						<div class="font-serif text-xl font-semibold text-[var(--foreground)]">
							{venue.name}
						</div>
						{#if venue.description}
							<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
								{venue.description}
							</p>
						{/if}
						{#if venue.address || venue.city || venue.state}
							<p class="mt-3 text-sm text-[var(--muted-foreground)]">
								{[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
							</p>
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if !hasPublishedContent}
		<section
			class="mt-8 rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center"
		>
			<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">
				No published content
			</h2>
			<p class="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
				This organization does not have any published events, funding, jobs, directory listings, or
				toolbox resources at this time.
			</p>
		</section>
	{/if}

	{#if collections.events.length > 0}
		<section class="mt-8 space-y-4">
			<div>
				<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
					Events
				</p>
				<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">Upcoming events</h2>
			</div>
			<ul class="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
				{#each collections.events as event, index (event.id)}
					<li><EventCard {event} {index} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if collections.funding.length > 0}
		<section class="mt-8 space-y-4">
			<div>
				<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
					Funding
				</p>
				<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">
					Related funding opportunities
				</h2>
			</div>
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each collections.funding as item, index (item.id)}
					<FundingCard {item} {index} />
				{/each}
			</div>
		</section>
	{/if}

	{#if collections.jobs.length > 0}
		<section class="mt-8 space-y-4">
			<div>
				<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
					Jobs
				</p>
				<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">Open roles</h2>
			</div>
			<div class="flex flex-col gap-3">
				{#each collections.jobs as job, index (job.id)}
					<JobListItem {job} {index} />
				{/each}
			</div>
		</section>
	{/if}

	{#if collections.redpages.length > 0}
		<section class="mt-8 space-y-4">
			<div>
				<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
					Red Pages
				</p>
				<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">
					Directory listings
				</h2>
			</div>
			<div class="flex flex-col gap-3">
				{#each collections.redpages as vendor, index (vendor.id)}
					<RedPagesListItem {vendor} {index} />
				{/each}
			</div>
		</section>
	{/if}

	{#if collections.toolbox.length > 0}
		<section class="mt-8 space-y-4">
			<div>
				<p class="text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
					Toolbox
				</p>
				<h2 class="font-serif text-2xl font-semibold text-[var(--foreground)]">Linked resources</h2>
			</div>
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
		</section>
	{/if}

	<div class="mt-10">
		<Button variant="outline" href="/"
			><ArrowLeft class="inline h-4 w-4" /> Back to Knowledge Basket</Button
		>
	</div>
</div>
