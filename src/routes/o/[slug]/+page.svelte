<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import {
		trackContentViewed,
		trackExternalLinkClicked,
		trackOrganizationAction,
		trackOrganizationFollowChanged
	} from '$lib/insights/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import CoilDetailHero from '$lib/components/organisms/CoilDetailHero.svelte';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { resolveSeoSocialImage } from '$lib/seo/images';
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
		resolveSeoSocialImage({
			imageUrl: organization.logoUrl,
			origin,
			seed: organization.slug ?? organization.name,
			fallbackOgImage: buildOgImagePath({
				title: organization.name,
				eyebrow: 'Knowledge Basket · Organization',
				theme: 'organization',
				meta: organization.region ?? organization.orgType ?? 'Organization hub'
			})
		})
	);
	const breadcrumbItems = $derived([
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Organizations', pathname: '/o' },
		{ name: organization.name, pathname: `/o/${organization.slug}` }
	]);

	const locationLine = $derived(
		[organization.address, organization.city, organization.state, organization.zip]
			.filter(Boolean)
			.join(', ')
	);
	const shortLocation = $derived(
		[organization.city, organization.state].filter(Boolean).join(', ')
	);

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

	const hasPublishedContent = $derived(
		collections.events.length > 0 ||
			collections.funding.length > 0 ||
			collections.jobs.length > 0 ||
			collections.redpages.length > 0 ||
			collections.toolbox.length > 0
	);

	function initials(name: string): string {
		return (
			name
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((w) => w[0])
				.join('')
				.toUpperCase() || '?'
		);
	}

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

<CoilDetailHero
	title={organization.name}
	subtitle={organization.tribalAffiliation ?? organization.region ?? undefined}
	placeholderKey={organization.slug}
>
	{#snippet badges()}
		<span class="kb-coil-tag">Organization</span>
		{#if organization.verified}
			<span class="kb-coil-tag kb-coil-tag--accent">Verified</span>
		{/if}
		{#if organization.orgType}
			<span class="kb-coil-tag">{organization.orgType}</span>
		{/if}
		{#if organization.region}
			<span class="kb-coil-tag">{organization.region}</span>
		{/if}
	{/snippet}
	{#snippet extras()}
		{#if shortLocation}
			<span class="inline-flex items-center gap-1.5">
				<MapPinIcon class="size-[14px] shrink-0" />
				{shortLocation}
			</span>
		{/if}
	{/snippet}
	{#snippet logo()}
		{#if organization.logoUrl}
			<img src={organization.logoUrl} alt="{organization.name} logo" class="kb-org-logo" />
		{:else}
			<div class="kb-org-initials" aria-hidden="true">{initials(organization.name)}</div>
		{/if}
	{/snippet}
</CoilDetailHero>

<div class="kb-org-wrap">
	<CoilDetailActionRail accent="var(--teal)" hasLogoOverhang>
			{#snippet meta()}
				{#if shortLocation}
					<span class="inline-flex items-center gap-1.5">
						<MapPinIcon class="size-[13px] shrink-0" />
						<span class="truncate">{shortLocation}</span>
					</span>
				{/if}
			{/snippet}
			{#snippet actions()}
				{#if organization.phone}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									href={`tel:${organization.phone}`}
									variant="ghost"
									size="icon-sm"
									aria-label="Call {organization.phone}"
									onclick={() =>
										trackExternalLinkClicked({
											contentType: 'organization',
											slug: organization.slug,
											action: 'call',
											href: `tel:${organization.phone}`,
											signedIn: Boolean(data.user)
										})}
								>
									<PhoneIcon class="size-4" />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>Call</Tooltip.Content>
					</Tooltip.Root>
				{/if}
				{#if organization.email}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									href={`mailto:${organization.email}`}
									variant="ghost"
									size="icon-sm"
									aria-label="Email {organization.email}"
									onclick={() =>
										trackExternalLinkClicked({
											contentType: 'organization',
											slug: organization.slug,
											action: 'email',
											href: `mailto:${organization.email}`,
											signedIn: Boolean(data.user)
										})}
								>
									<MailIcon class="size-4" />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>Email</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			{/snippet}
			{#snippet primary()}
				{#if organization.website}
					<Button
						href={organization.website}
						target="_blank"
						rel="noopener"
						size="sm"
						onclick={() =>
							trackExternalLinkClicked({
								contentType: 'organization',
								slug: organization.slug,
								action: 'visit_site',
								href: organization.website,
								signedIn: Boolean(data.user)
							})}
					>
						<GlobeIcon class="size-[14px]" /> Visit site
					</Button>
				{/if}
			{/snippet}
	</CoilDetailActionRail>

	<div class="kb-org-grid">
		<div class="min-w-0">
			{#if organization.description}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">About</h2>
					<p class="text-sm leading-7 whitespace-pre-line text-[var(--muted-foreground)]">
						{organization.description}
					</p>
				</section>
			{/if}

			{#if !hasPublishedContent && collections.venues.length === 0}
				<section
					class="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center"
				>
					<h2 class="font-serif text-xl font-semibold text-[var(--foreground)]">
						No published content
					</h2>
					<p class="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
						This organization does not have any published events, funding, jobs, directory listings,
						or toolbox resources at this time.
					</p>
				</section>
			{/if}

			{#if collections.events.length > 0}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">Upcoming events</h2>
					<ul class="grid list-none gap-4 p-0 md:grid-cols-2">
						{#each collections.events as event, index (event.id)}
							<li><EventCard {event} {index} /></li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if collections.funding.length > 0}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">Funding opportunities</h2>
					<div class="grid gap-4 md:grid-cols-2">
						{#each collections.funding as item, index (item.id)}
							<FundingCard {item} {index} />
						{/each}
					</div>
				</section>
			{/if}

			{#if collections.jobs.length > 0}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">Open roles</h2>
					<div class="flex flex-col gap-3">
						{#each collections.jobs as job, index (job.id)}
							<JobListItem {job} {index} />
						{/each}
					</div>
				</section>
			{/if}

			{#if collections.redpages.length > 0}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">Red Pages listings</h2>
					<div class="flex flex-col gap-3">
						{#each collections.redpages as vendor, index (vendor.id)}
							<RedPagesListItem {vendor} {index} />
						{/each}
					</div>
				</section>
			{/if}

			{#if collections.toolbox.length > 0}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">Toolbox resources</h2>
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
								<h3 class="mt-3 font-serif text-lg font-semibold text-[var(--foreground)]">
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

			{#if collections.venues.length > 0}
				<section class="kb-org-section">
					<h2 class="kb-org-section-title">Linked venues</h2>
					<div class="grid gap-3 md:grid-cols-2">
						{#each collections.venues as venue}
							<a
								href={`/v/${venue.slug ?? venue.id}`}
								class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-inherit no-underline shadow-[var(--sh)] transition-transform hover:-translate-y-0.5"
							>
								<div class="font-serif text-lg font-semibold text-[var(--foreground)]">
									{venue.name}
								</div>
								{#if venue.description}
									<p class="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
										{venue.description}
									</p>
								{/if}
								{#if venue.address || venue.city || venue.state}
									<p class="mt-3 text-xs text-[var(--muted-foreground)]">
										{[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
									</p>
								{/if}
							</a>
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<aside class="flex flex-col gap-4">
			<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
				<h3
					class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
				>
					Organization access
				</h3>
				<div class="flex flex-col gap-2">
					{#if canManage}
						<Button href={`/orgs/${organization.slug}`} class="w-full">Manage organization</Button>
					{:else if isSignedIn}
						<form
							method="POST"
							action="?/toggleFollow"
							use:enhance={() => {
								const nextFollowing = !isFollowing;
								return async ({ result, update }) => {
									if (result.type === 'success') {
										trackOrganizationFollowChanged({
											slug: organization.slug,
											following:
												typeof result.data?.following === 'boolean'
													? result.data.following
													: nextFollowing,
											signedIn: true
										});
									}
									await update();
								};
							}}
						>
							<Button type="submit" variant={isFollowing ? 'outline' : 'default'} class="w-full">
								{isFollowing ? 'Following' : 'Follow organization'}
							</Button>
						</form>

						{#if viewerClaimStatus === 'pending'}
							<div class="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
								<p class="text-sm font-medium text-[var(--foreground)]">Claim pending</p>
								<p class="mt-1 text-xs text-[var(--muted-foreground)]">
									A staff reviewer will take a look soon.
								</p>
								<form method="POST" action="?/cancelClaim" class="mt-2">
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
							class="w-full"
							onclick={() => trackOrganizationAction('follow_requires_login', organization.slug)}
						>
							Sign in to follow
						</Button>
						<Button
							href={loginHref}
							variant="outline"
							class="w-full"
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
							Your role:
							<span class="font-semibold text-[var(--foreground)]">{viewerMembershipRole}</span>
						</p>
					{/if}
				</div>
			</div>

			{#if organization.lat != null && organization.lng != null}
				<LocationMap
					lat={organization.lat}
					lng={organization.lng}
					label={organization.name}
					address={locationLine || undefined}
					searchText={locationLine || organization.name}
					token={data.mapboxToken}
					accent="var(--teal)"
					eyebrow="Organization location"
					height={240}
				/>
			{/if}

			<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
				<h3
					class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
				>
					Details
				</h3>
				<dl class="flex flex-col gap-3 text-sm">
					{#if organization.orgType}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Type
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">{organization.orgType}</dd>
						</div>
					{/if}
					{#if organization.tribalAffiliation}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Tribal affiliation
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">{organization.tribalAffiliation}</dd>
						</div>
					{/if}
					{#if organization.region}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Region
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">{organization.region}</dd>
						</div>
					{/if}
					{#if locationLine}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Address
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">{locationLine}</dd>
						</div>
					{/if}
					{#if organization.email}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Email
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">
								<a href={`mailto:${organization.email}`} class="text-[var(--teal)]">
									{organization.email}
								</a>
							</dd>
						</div>
					{/if}
					{#if organization.phone}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Phone
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">
								<a href={`tel:${organization.phone}`} class="text-[var(--teal)]">
									{organization.phone}
								</a>
							</dd>
						</div>
					{/if}
				</dl>
			</div>

			{#if organization.socialLinks && Object.keys(organization.socialLinks).length > 0}
				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
					<h3
						class="mb-2 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
					>
						Social
					</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(organization.socialLinks) as [platform, url]}
							<a
								href={url}
								target="_blank"
								rel="noopener"
								class="text-xs font-medium text-[var(--teal)] capitalize">{platform}</a
							>
						{/each}
					</div>
				</div>
			{/if}

			<Button variant="outline" href="/o" class="w-full">
				<ArrowLeft class="inline h-4 w-4" /> Back to organizations
			</Button>
		</aside>
	</div>
</div>

<style>
	.kb-org-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem 3rem;
	}
	.kb-org-logo {
		display: block;
		width: 112px;
		height: 112px;
		object-fit: contain;
		border-radius: 50%;
		background: white;
		padding: 10px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
		border: 3px solid var(--background);
	}
	.kb-org-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 112px;
		height: 112px;
		border-radius: 50%;
		background: var(--color-lakebed-900, #0b2336);
		color: white;
		font-family: var(--font-serif);
		font-size: 2.25rem;
		font-weight: 700;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
		border: 3px solid var(--background);
	}
	.kb-org-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
	}
	@media (min-width: 1024px) {
		.kb-org-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: 2.5rem;
			align-items: start;
		}
	}
	.kb-org-section {
		margin-bottom: 2rem;
	}
	.kb-org-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--foreground);
	}
</style>
