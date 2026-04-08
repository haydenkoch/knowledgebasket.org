<script lang="ts">
	import { browser } from '$app/environment';
	import { trackContentViewed, trackExternalLinkClicked } from '$lib/insights/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import type { ToolboxItem } from '$lib/data/kb';
	import { resolveSeoSocialImage } from '$lib/seo/images';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import {
		formatToolboxLabel,
		getToolboxHostLabel,
		getToolboxPreviewEyebrow,
		getToolboxPrimaryActionLabel,
		getToolboxProvider,
		getToolboxSecondaryMeta
	} from '$lib/toolbox/presentation';
	import { stripHtml } from '$lib/utils/format';
	import { formatDisplayDate } from '$lib/utils/display';
	import { Button } from '$lib/components/ui/button/index.js';
	import ToolboxPdfViewer from '$lib/components/toolbox/ToolboxPdfViewer.svelte';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import CoilDetailHero from '$lib/components/organisms/CoilDetailHero.svelte';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data } = $props();
	let item = $derived(data.item as ToolboxItem | null);
	const galleryImages = $derived(
		item
			? item.imageUrl
				? [item.imageUrl, ...(item.imageUrls ?? [])]
				: (item.imageUrls ?? [])
			: []
	);
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const resolvedGalleryImages = $derived(
		galleryImages
			.map((url) => resolveAbsoluteUrl(url, { origin }) ?? url)
			.filter((value): value is string => Boolean(value))
	);
	let selectedGalleryIndex = $state(0);
	const coverImageUrl = $derived(
		resolveAbsoluteUrl(item?.imageUrl, {
			origin
		})
	);
	const socialImage = $derived(
		item
			? resolveSeoSocialImage({
					imageUrl: item.imageUrl ?? item.imageUrls?.[0] ?? null,
					origin,
					seed: item.slug ?? item.title,
					fallbackOgImage: buildOgImagePath({
						title: item.title,
						eyebrow: 'Knowledge Basket · Toolbox',
						theme: 'toolbox',
						meta: item.sourceName ?? item.category ?? 'Toolkits and practical resources'
					})
				})
			: buildOgImagePath({
					title: 'Toolbox',
					eyebrow: 'Knowledge Basket · Toolbox',
					theme: 'toolbox',
					meta: 'Toolkits and practical resources'
				})
	);
	const breadcrumbItems = $derived(
		item
			? [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Toolbox', pathname: '/toolbox' },
					{ name: item.title, pathname: item.slug ? `/toolbox/${item.slug}` : '/toolbox' }
				]
			: [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Toolbox', pathname: '/toolbox' }
				]
	);

	const jsonLd = $derived.by(() => {
		if (!item) return null;
		const ld: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'CreativeWork',
			name: item.title,
			description: metaDescription,
			url: canonicalUrl
		};
		if (item.author) ld.author = { '@type': 'Person', name: item.author };
		if (item.sourceName) ld.publisher = { '@type': 'Organization', name: item.sourceName };
		if (item.publishDate) ld.datePublished = item.publishDate;
		if (coverImageUrl) ld.image = coverImageUrl;
		if (primaryUrl) ld.sameAs = primaryUrl;
		return ld;
	});
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const fileUrl = $derived(item?.fileUrl ?? null);
	const externalUrl = $derived(item?.externalUrl ?? null);
	const loginHref = $derived(
		item?.slug
			? `/auth/login?redirect=${encodeURIComponent(`/toolbox/${item.slug}`)}`
			: '/auth/login?redirect=%2Ftoolbox'
	);

	const canonicalUrl = $derived(
		item?.slug ? `${origin}/toolbox/${item.slug}` : `${origin}/toolbox`
	);
	const metaDescription = $derived(
		item
			? item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.sourceName ? ` from ${item.sourceName}` : ''}${item.category ? `. ${item.category}` : ''}.`
			: ''
	);

	const isFile = $derived(item?.contentMode === 'file');
	const isHosted = $derived(item?.contentMode === 'hosted');
	const previewUrl = $derived.by(() => {
		if (
			item?.slug &&
			((fileUrl && /\.pdf(?:$|[?#])/i.test(fileUrl)) ||
				(externalUrl && /\.pdf(?:$|[?#])/i.test(externalUrl)))
		) {
			return `/toolbox/${item.slug}/preview`;
		}
		return null;
	});
	const hasPdfPreview = $derived(Boolean(previewUrl));

	const primaryUrl = $derived(isFile ? (fileUrl ?? externalUrl) : externalUrl);
	const sourceHost = $derived(getToolboxHostLabel(externalUrl));
	const provider = $derived(getToolboxProvider(externalUrl));
	const displayMediaType = $derived(formatToolboxLabel(item?.mediaType));
	const displayResourceType = $derived(formatToolboxLabel(item?.resourceType));
	const displayCategory = $derived(formatToolboxLabel(item?.category));
	const previewEyebrow = $derived(item ? getToolboxPreviewEyebrow(item) : 'Resource');
	const previewSecondaryMeta = $derived(item ? getToolboxSecondaryMeta(item) : null);
	const primaryActionLabel = $derived(
		item ? getToolboxPrimaryActionLabel(item, { hasPdfPreview }) : 'Open resource'
	);
	const previewActionLabel = $derived.by(() => {
		if (provider === 'pbs') return 'Watch on PBS';
		if (provider === 'apple-podcasts') return 'Listen on Apple Podcasts';
		if (provider === 'arcgis') return 'Open StoryMap';
		return primaryActionLabel;
	});
	const previewSummary = $derived(
		item ? stripHtml(String(item.description ?? item.body ?? '')).slice(0, 220) : ''
	);
	const previewFactRows = $derived(
		[
			previewSecondaryMeta ? { label: 'Format', value: previewSecondaryMeta } : null,
			item?.sourceName && item.sourceName !== sourceHost
				? { label: 'Source', value: item.sourceName }
				: null,
			item?.author ? { label: 'By', value: item.author } : null
		].filter((row): row is { label: string; value: string } => row !== null)
	);
	const mediaTypeLower = $derived((item?.mediaType ?? '').toLowerCase());
	const isVideoLike = $derived(
		provider === 'pbs' ||
			mediaTypeLower.includes('video') ||
			mediaTypeLower.includes('film') ||
			mediaTypeLower.includes('documentary')
	);
	const isPodcastLike = $derived(
		provider === 'apple-podcasts' ||
			mediaTypeLower.includes('podcast') ||
			mediaTypeLower.includes('audio')
	);
	const isStoryMapLike = $derived(
		provider === 'arcgis' || mediaTypeLower.includes('storymap') || mediaTypeLower.includes('map')
	);
	const providerLabel = $derived.by(() => {
		if (provider === 'pbs') return 'PBS';
		if (provider === 'apple-podcasts') return 'Apple Podcasts';
		if (provider === 'arcgis') return 'Esri StoryMap';
		return sourceHost ?? null;
	});
	const activeHeroImage = $derived(
		resolvedGalleryImages[selectedGalleryIndex] ?? resolvedGalleryImages[0] ?? coverImageUrl
	);
	const publishDateLabel = $derived(
		item?.publishDate ? formatDisplayDate(item.publishDate, undefined, '') : ''
	);
	let lastTrackedSlug = $state('');

	$effect(() => {
		const slug = item?.slug?.trim();
		if (!browser || !slug || lastTrackedSlug === slug) return;
		lastTrackedSlug = slug;
		trackContentViewed({
			contentType: 'toolbox',
			slug,
			signedIn: Boolean(data.user)
		});
	});
</script>

<SeoHead
	{origin}
	pathname={item?.slug ? `/toolbox/${item.slug}` : '/toolbox'}
	title={item
		? `${item.title} | Toolbox | Knowledge Basket`
		: 'Resource not found | Knowledge Basket'}
	description={item ? metaDescription : 'This resource is no longer available.'}
	robotsMode={item ? 'index' : 'noindex-nofollow'}
	ogImage={socialImage}
	ogImageAlt={`${item?.title ?? 'Toolbox'} social preview`}
	jsonLd={jsonLd ? [jsonLd] : []}
	{breadcrumbItems}
/>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This resource is no longer available.</p>
		<Button variant="outline" href="/toolbox" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Toolbox</Button
		>
	</div>
{:else}
	<CoilDetailHero
		title={item.title}
		subtitle={item.sourceName ?? undefined}
		bannerImages={resolvedGalleryImages}
		selectedBannerIndex={selectedGalleryIndex}
		onSelectBanner={(i) => (selectedGalleryIndex = i)}
		galleryLabel="Resource gallery"
		placeholderKey={item.slug}
	>
		{#snippet badges()}
			{#if item.mediaType}
				<span class="kb-coil-tag">{displayMediaType}</span>
			{/if}
			{#if displayResourceType && displayResourceType !== displayMediaType}
				<span class="kb-coil-tag">{displayResourceType}</span>
			{/if}
			{#if displayCategory}
				<span class="kb-coil-tag">{displayCategory}</span>
			{/if}
		{/snippet}
	</CoilDetailHero>

	<div class="kb-tb-wrap">
		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			contentType="toolbox"
			contentSlug={item.slug}
			saveLabel="resource"
			accent="var(--color-lakebed-700, #1a3a66)"
		>
			{#snippet meta()}
				{#if item.author}
					<span class="kb-tb-meta-author">By {item.author}</span>
				{/if}
				{#if publishDateLabel}
					{#if item.author}<span class="kb-tb-meta-dot" aria-hidden="true">·</span>{/if}
					<span class="kb-tb-meta-date">{publishDateLabel}</span>
				{/if}
			{/snippet}
			{#snippet primary()}
				{#if hasPdfPreview && (primaryUrl ?? previewUrl)}
					<Button
						href={primaryUrl ?? previewUrl!}
						target="_blank"
						rel="noopener"
						size="sm"
						onclick={() =>
							trackExternalLinkClicked({
								contentType: 'toolbox',
								slug: item.slug,
								action: 'open_pdf',
								href: primaryUrl ?? previewUrl,
								signedIn: Boolean(data.user)
							})}
					>
						{primaryActionLabel}
						<ExternalLinkIcon class="size-[14px]" />
					</Button>
				{:else if primaryUrl}
					{#if isFile}
						<Button
							href={primaryUrl}
							download
							size="sm"
							onclick={() =>
								trackExternalLinkClicked({
									contentType: 'toolbox',
									slug: item.slug,
									action: 'download',
									href: primaryUrl,
									signedIn: Boolean(data.user)
								})}
						>
							<DownloadIcon class="size-[14px]" />
							{primaryActionLabel}
						</Button>
					{:else}
						<Button
							href={primaryUrl}
							target="_blank"
							rel="noopener"
							size="sm"
							onclick={() =>
								trackExternalLinkClicked({
									contentType: 'toolbox',
									slug: item.slug,
									action: 'open_resource',
									href: primaryUrl,
									signedIn: Boolean(data.user)
								})}
						>
							{primaryActionLabel}
							<ExternalLinkIcon class="size-[14px]" />
						</Button>
					{/if}
				{/if}
			{/snippet}
		</CoilDetailActionRail>

		<div class="kb-tb-grid">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-toolbox-section">
						<h2 class="kb-toolbox-section-title">About this resource</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.description}
						</div>
					</section>
				{/if}

				{#if isHosted && item.body}
					<section class="kb-toolbox-section">
						<div
							class="prose prose-sm text-[var(--foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.body}
						</div>
					</section>
				{/if}

				{#if hasPdfPreview && previewUrl}
					<section class="kb-toolbox-section" aria-label="Document preview">
						<ToolboxPdfViewer src={previewUrl} title={item.title} />
					</section>
				{/if}

				{#if !hasPdfPreview && primaryUrl}
					<section class="kb-toolbox-section">
						<h2 class="kb-toolbox-section-title">Preview</h2>
						<article
							class="kb-tb-preview"
							class:is-video={isVideoLike}
							class:is-podcast={isPodcastLike}
							class:is-storymap={isStoryMapLike}
							class:has-image={Boolean(activeHeroImage)}
						>
							<a
								href={primaryUrl}
								target={isFile ? undefined : '_blank'}
								rel="noopener"
								class="kb-tb-preview__media"
								aria-label={previewActionLabel}
							>
								{#if activeHeroImage}
									<img src={activeHeroImage} alt="" class="kb-tb-preview__image" loading="lazy" />
									<span class="kb-tb-preview__tint" aria-hidden="true"></span>
								{:else}
									<span class="kb-tb-preview__fallback" aria-hidden="true">
										<FileTextIcon class="size-9" />
									</span>
								{/if}

								{#if isVideoLike}
									<span class="kb-tb-preview__play" aria-hidden="true">
										<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path d="M8 5v14l11-7z" />
										</svg>
									</span>
								{/if}

								{#if providerLabel}
									<span class="kb-tb-preview__provider">{providerLabel}</span>
								{/if}

								<span class="kb-tb-preview__corner" aria-hidden="true"></span>
							</a>

							<div class="kb-tb-preview__body">
								<p class="kb-tb-preview__eyebrow">
									<span>{previewEyebrow}</span>
									{#if sourceHost && sourceHost.toLowerCase() !== (providerLabel ?? '').toLowerCase()}
										<span class="kb-tb-preview__sep" aria-hidden="true">•</span>
										<span>{sourceHost}</span>
									{/if}
								</p>

								<h3 class="kb-tb-preview__title">{item.title}</h3>

								{#if previewSummary}
									<p class="kb-tb-preview__summary">{previewSummary}</p>
								{/if}

								{#if previewFactRows.length > 0}
									<dl class="kb-tb-preview__facts">
										{#each previewFactRows as row (row.label)}
											<div>
												<dt>{row.label}</dt>
												<dd>{row.value}</dd>
											</div>
										{/each}
									</dl>
								{/if}

								<div class="kb-tb-preview__cta">
									{#if isFile}
										<Button href={primaryUrl} download size="sm">
											<DownloadIcon class="mr-1.5 size-4" />
											{previewActionLabel}
										</Button>
									{:else}
										<Button href={primaryUrl} target="_blank" rel="noopener" size="sm">
											<ExternalLinkIcon class="mr-1.5 size-4" />
											{previewActionLabel}
										</Button>
									{/if}
								</div>
							</div>
						</article>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="flex flex-col gap-4">
				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-3 border-b border-[var(--rule)] pb-3 font-sans text-xs font-bold tracking-[0.1em] text-[var(--muted-foreground)] uppercase"
					>
						Details
					</h3>
					<dl class="flex flex-col gap-3 text-sm">
						{#if item.sourceName}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Source
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.sourceName}</dd>
							</div>
						{/if}
						{#if item.author}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Author
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.author}</dd>
							</div>
						{/if}
						{#if publishDateLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Published
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{publishDateLabel}</dd>
							</div>
						{/if}
						{#if item.mediaType}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Media type
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{displayMediaType}</dd>
							</div>
						{/if}
						{#if displayCategory}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Category
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{displayCategory}</dd>
							</div>
						{/if}
						{#if sourceHost}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Provider
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{sourceHost}</dd>
							</div>
						{/if}
						{#if externalUrl}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Source link
								</dt>
								<dd class="mt-0.5 break-all text-[var(--foreground)]">
									<a href={externalUrl} target="_blank" rel="noopener" class="kb-tb-source-link">
										{sourceHost ?? externalUrl}
									</a>
								</dd>
							</div>
						{/if}
					</dl>
				</div>

				<Button variant="outline" href="/toolbox" class="w-full"
					><ArrowLeft class="inline h-4 w-4" /> Back to Toolbox</Button
				>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-tb-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem 3rem;
	}
	.kb-tb-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
		align-items: start;
	}
	@media (min-width: 1024px) {
		.kb-tb-grid {
			grid-template-columns: minmax(0, 1fr) 320px;
			gap: 2.5rem;
		}
	}
	.kb-tb-meta-author,
	.kb-tb-meta-date {
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
	}
	.kb-tb-meta-dot {
		opacity: 0.4;
	}
	.kb-toolbox-section {
		margin-bottom: 1.75rem;
	}
	.kb-toolbox-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.625rem 0;
		color: var(--foreground);
	}
	/* ── Preview plate ─────────────────────────────────────────────── */
	.kb-tb-preview {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0;
		overflow: hidden;
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--card, #ffffff);
		box-shadow: var(--sh);
		transition:
			box-shadow 180ms ease,
			border-color 180ms ease;
	}
	.kb-tb-preview:hover {
		box-shadow: var(--shh);
		border-color: color-mix(in srgb, var(--color-lakebed-700, #1a3a66) 28%, var(--rule));
	}
	@media (min-width: 720px) {
		.kb-tb-preview {
			grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
		}
		.kb-tb-preview.is-podcast {
			grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
		}
	}

	.kb-tb-preview__media {
		position: relative;
		display: block;
		overflow: hidden;
		aspect-ratio: 16 / 10;
		background: var(--color-lakebed-950, #0b1f33);
		text-decoration: none;
		isolation: isolate;
		border-bottom: 1px solid var(--rule);
	}
	.kb-tb-preview.is-podcast .kb-tb-preview__media {
		aspect-ratio: 1;
	}
	.kb-tb-preview.is-storymap .kb-tb-preview__media {
		aspect-ratio: 4 / 3;
	}
	@media (min-width: 720px) {
		.kb-tb-preview__media {
			aspect-ratio: auto;
			height: 100%;
			min-height: 220px;
			border-right: 1px solid var(--rule);
			border-bottom: none;
		}
	}

	.kb-tb-preview__image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scale(1);
		transition: transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.kb-tb-preview:hover .kb-tb-preview__image {
		transform: scale(1.035);
	}

	.kb-tb-preview__tint {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(165deg, rgba(11, 31, 51, 0) 45%, rgba(8, 22, 38, 0.55) 100%),
			linear-gradient(0deg, rgba(11, 31, 51, 0.12), rgba(11, 31, 51, 0.12));
		pointer-events: none;
	}

	.kb-tb-preview__fallback {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: rgba(255, 255, 255, 0.82);
		background:
			radial-gradient(circle at 28% 22%, rgba(78, 170, 180, 0.32), transparent 55%),
			radial-gradient(circle at 78% 80%, rgba(26, 58, 102, 0.5), transparent 60%),
			linear-gradient(135deg, #0b1f33, #12384a);
	}

	/* Storymap topo-line motif (fallback only) */
	.kb-tb-preview.is-storymap:not(.has-image) .kb-tb-preview__media::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			repeating-radial-gradient(
				circle at 28% 68%,
				rgba(255, 255, 255, 0.11) 0 1px,
				transparent 1px 16px
			),
			repeating-radial-gradient(
				circle at 72% 34%,
				rgba(255, 255, 255, 0.08) 0 1px,
				transparent 1px 22px
			);
		pointer-events: none;
		mix-blend-mode: screen;
	}

	/* Podcast waveform ledge */
	.kb-tb-preview.is-podcast .kb-tb-preview__media::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 34%;
		background-image: repeating-linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.28) 0 2px,
			transparent 2px 7px
		);
		-webkit-mask-image: linear-gradient(to top, black 0%, rgba(0, 0, 0, 0.6) 40%, transparent 100%);
		mask-image: linear-gradient(to top, black 0%, rgba(0, 0, 0, 0.6) 40%, transparent 100%);
		pointer-events: none;
	}

	.kb-tb-preview__play {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #fff;
		pointer-events: none;
	}
	.kb-tb-preview__play::before {
		content: '';
		position: absolute;
		width: 60px;
		height: 60px;
		border-radius: 999px;
		background: rgba(11, 31, 51, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
		transition:
			transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
			background 220ms ease;
	}
	.kb-tb-preview__play svg {
		position: relative;
		width: 22px;
		height: 22px;
		transform: translateX(1.5px);
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
	}
	.kb-tb-preview:hover .kb-tb-preview__play::before {
		transform: scale(1.08);
		background: rgba(11, 31, 51, 0.88);
	}

	.kb-tb-preview__provider {
		position: absolute;
		top: 10px;
		left: 10px;
		padding: 4px 8px 3px;
		font-family: var(--font-sans);
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-lakebed-950, #0b1f33);
		background: rgba(255, 255, 255, 0.94);
		border-radius: 2px;
		box-shadow: 0 1px 0 rgba(11, 31, 51, 0.1);
	}

	/* Corner marker — small editorial detail */
	.kb-tb-preview__corner {
		position: absolute;
		right: 10px;
		bottom: 10px;
		width: 14px;
		height: 14px;
		border-right: 1.5px solid rgba(255, 255, 255, 0.6);
		border-bottom: 1.5px solid rgba(255, 255, 255, 0.6);
		pointer-events: none;
	}

	/* ── Body ──────────────────────────────────────────────────────── */
	.kb-tb-preview__body {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 1.1rem 1.25rem 1.2rem;
	}
	@media (min-width: 720px) {
		.kb-tb-preview__body {
			padding: 1.35rem 1.45rem 1.35rem;
		}
	}

	.kb-tb-preview__eyebrow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.55rem;
		font-family: var(--font-sans);
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-lakebed-700, #1a3a66);
	}
	.kb-tb-preview__sep {
		color: var(--muted-foreground);
		opacity: 0.55;
		font-weight: 400;
	}

	.kb-tb-preview__title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: clamp(1.2rem, 2.3vw, 1.45rem);
		line-height: 1.2;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.005em;
	}

	.kb-tb-preview__summary {
		margin: 0.6rem 0 0;
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.kb-tb-preview__facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 1.35rem;
		margin: 0.95rem 0 0;
		padding-top: 0.85rem;
		border-top: 1px dashed color-mix(in srgb, var(--rule) 90%, transparent);
	}
	.kb-tb-preview__facts > div {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 0.2rem 0;
		min-width: 0;
	}
	.kb-tb-preview__facts dt {
		font-family: var(--font-sans);
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}
	.kb-tb-preview__facts dd {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.35;
		color: var(--foreground);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kb-tb-preview__cta {
		margin-top: auto;
		padding-top: 1.1rem;
	}
	.kb-tb-source-link {
		color: var(--teal);
		text-decoration: none;
	}
	.kb-tb-source-link:hover {
		text-decoration: underline;
	}
</style>
