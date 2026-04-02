<script lang="ts">
	import type { RedPagesItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import MailIcon from '@lucide/svelte/icons/mail';

	let { data } = $props();
	let item = $derived(data.item as RedPagesItem | null);
	const origin = $derived(data.origin ?? '');

	function initials(title: string): string {
		return (
			title
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((w) => w[0])
				.join('')
				.toUpperCase() || '?'
		);
	}

	const canonicalUrl = $derived(
		item?.slug ? `${origin}/red-pages/${item.slug}` : `${origin}/red-pages`
	);
	const metaDescription = $derived(
		item
			? item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.tribalAffiliation ? `, ${item.tribalAffiliation}` : ''}${item.serviceType ? `. ${item.serviceType}` : ''}.`
			: ''
	);

	const addressLine = $derived(
		item ? [item.address, item.city, item.state, item.zip].filter(Boolean).join(', ') : ''
	);
	const mapsUrl = $derived(
		addressLine
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
			: item?.lat != null && item?.lng != null
				? `https://www.google.com/maps?q=${item.lat},${item.lng}`
				: ''
	);

	const serviceTypesDisplay = $derived(
		item?.serviceTypes?.length ? item.serviceTypes : item?.serviceType ? [item.serviceType] : []
	);

	const jsonLd = $derived.by(() => {
		if (!item) return null;
		const ld: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: item.title,
			description: metaDescription,
			url: item.website ?? canonicalUrl
		};
		if (item.phone) ld.telephone = item.phone;
		if (item.email) ld.email = item.email;
		if (addressLine) {
			ld.address = {
				'@type': 'PostalAddress',
				streetAddress: item.address,
				addressLocality: item.city,
				addressRegion: item.state,
				postalCode: item.zip
			};
		}
		return ld;
	});
	const jsonLdScript = $derived.by(() =>
		jsonLd
			? [
					'<script type="application/ld+json">',
					JSON.stringify(jsonLd).replaceAll('<', '\\u003c'),
					'</scr' + 'ipt>'
				].join('')
			: ''
	);
</script>

<svelte:head>
	<title
		>{item
			? `${item.title} | Red Pages | Knowledge Basket`
			: 'Listing not found | Knowledge Basket'}</title
	>
	{#if item}
		<meta name="description" content={metaDescription} />
		<link rel="canonical" href={canonicalUrl} />
		<meta property="og:title" content={item.title} />
		<meta property="og:description" content={metaDescription} />
		{#if item.imageUrl}<meta property="og:image" content={item.imageUrl} />{/if}
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:type" content="website" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={item.title} />
		<meta name="twitter:description" content={metaDescription} />
		{#if item.imageUrl}<meta name="twitter:image" content={item.imageUrl} />{/if}
		{#if jsonLd}{@html jsonLdScript}{/if}
	{/if}
</svelte:head>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This listing is no longer available.</p>
		<Button variant="outline" href="/red-pages" class="mt-4">← Back to Red Pages</Button>
	</div>
{:else}
	<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
		<Breadcrumb.Root class="mb-5">
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/red-pages">Red Pages</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{item.title}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<!-- Hero header -->
		<div class="kb-rp-hero">
			<div class="kb-rp-hero-identity">
				{#if item.logoUrl}
					<img src={item.logoUrl} alt="{item.title} logo" class="kb-rp-logo" />
				{:else}
					<div class="kb-rp-initials">{initials(item.title)}</div>
				{/if}
				<div class="kb-rp-hero-text">
					<div class="kb-rp-badges">
						{#if item.verified}
							<span class="kb-rp-badge kb-rp-badge--verified">Verified</span>
						{/if}
						{#each serviceTypesDisplay as st}
							<span class="kb-rp-badge">{st}</span>
						{/each}
					</div>
					<h1 class="kb-rp-title">{item.title}</h1>
					{#if item.tribalAffiliation}
						<p class="kb-rp-affiliation">{item.tribalAffiliation}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-rp-section">
						<h2 class="kb-rp-section-title">About</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.description}
						</div>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="flex flex-col gap-4">
				<!-- Contact actions -->
				{#if item.website || item.phone || item.email}
					<div class="flex flex-col gap-2">
						{#if item.website}
							<Button href={item.website} target="_blank" rel="noopener" class="w-full">
								<GlobeIcon class="mr-1.5 size-4" /> Visit website
							</Button>
						{/if}
						{#if item.phone}
							<Button variant="outline" href="tel:{item.phone}" class="w-full">
								<PhoneIcon class="mr-1.5 size-4" />
								{item.phone}
							</Button>
						{/if}
						{#if item.email}
							<Button variant="outline" href="mailto:{item.email}" class="w-full">
								<MailIcon class="mr-1.5 size-4" /> Email
							</Button>
						{/if}
					</div>
				{/if}

				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
					>
						Details
					</h3>
					<dl class="flex flex-col gap-3 text-sm">
						{#if item.tribalAffiliation}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Tribal affiliation
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.tribalAffiliation}</dd>
							</div>
						{/if}
						{#if serviceTypesDisplay.length}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Service type
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{serviceTypesDisplay.join(', ')}</dd>
							</div>
						{/if}
						{#if item.region}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Service area
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.region}</dd>
							</div>
						{/if}
						{#if addressLine}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Address
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">
									<span class="flex items-start gap-1.5">
										<MapPinIcon class="mt-0.5 size-3.5 shrink-0 text-[var(--muted-foreground)]" />
										<span>
											{addressLine}
											{#if mapsUrl}
												<a
													href={mapsUrl}
													target="_blank"
													rel="noopener"
													class="mt-0.5 block text-xs text-[var(--teal)]">Get directions</a
												>
											{/if}
										</span>
									</span>
								</dd>
							</div>
						{/if}
						{#if item.certifications?.length}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Certifications
								</dt>
								<dd class="mt-1 flex flex-wrap gap-1">
									{#each item.certifications as cert}
										<span
											class="inline-block rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]"
											>{cert}</span
										>
									{/each}
								</dd>
							</div>
						{/if}
						{#if item.ownerName}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Owner
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.ownerName}</dd>
							</div>
						{/if}
					</dl>
				</div>

				{#if item.socialLinks && Object.keys(item.socialLinks).length > 0}
					<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
						<h3
							class="mb-2 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
						>
							Social
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(item.socialLinks) as [platform, url]}
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

				<Button variant="outline" href="/red-pages" class="w-full">← Back to Red Pages</Button>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-rp-hero {
		border-radius: 12px;
		background: linear-gradient(135deg, var(--red), var(--color-elderberry-950, #3f0d16));
		padding: 1.5rem;
		color: white;
	}
	.kb-rp-hero-identity {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}
	.kb-rp-logo {
		width: 64px;
		height: 64px;
		object-fit: contain;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.1);
		flex-shrink: 0;
		padding: 4px;
	}
	.kb-rp-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		font-family: var(--font-sans);
		font-size: 1.5rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.kb-rp-hero-text {
		flex: 1;
		min-width: 0;
	}
	.kb-rp-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}
	.kb-rp-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.kb-rp-badge--verified {
		background: var(--color-flicker-400);
		color: rgba(0, 0, 0, 0.85);
	}
	.kb-rp-title {
		font-family: var(--font-serif);
		font-size: clamp(1.25rem, 3.5vw, 1.75rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 0.25rem 0;
		color: white;
	}
	.kb-rp-affiliation {
		font-size: 0.9rem;
		opacity: 0.85;
		font-style: italic;
		margin: 0;
	}
	.kb-rp-section {
		margin-bottom: 1.75rem;
	}
	.kb-rp-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.625rem 0;
		color: var(--foreground);
	}
</style>
