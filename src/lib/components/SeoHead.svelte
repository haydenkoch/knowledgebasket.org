<script lang="ts">
	import {
		buildSeoMetadata,
		type BreadcrumbItem,
		type JsonLdValue,
		type RobotsMode
	} from '$lib/seo/metadata';

	let {
		origin,
		pathname,
		title,
		description = null,
		robotsMode = 'index',
		ogType = 'website',
		ogImage = null,
		ogImageAlt = null,
		twitterCard = 'summary_large_image',
		jsonLd = [],
		breadcrumbItems = []
	}: {
		origin: string;
		pathname: string;
		title: string;
		description?: string | null;
		robotsMode?: RobotsMode;
		ogType?: string;
		ogImage?: string | null;
		ogImageAlt?: string | null;
		twitterCard?: string;
		jsonLd?: JsonLdValue[];
		breadcrumbItems?: BreadcrumbItem[];
	} = $props();

	const metadata = $derived(
		buildSeoMetadata({
			origin,
			pathname,
			title,
			description,
			robotsMode,
			ogType,
			ogImage,
			ogImageAlt,
			twitterCard,
			jsonLd,
			breadcrumbItems
		})
	);
</script>

<svelte:head>
	<title>{metadata.title}</title>
	{#if metadata.description}
		<meta name="description" content={metadata.description} />
	{/if}
	<link rel="canonical" href={metadata.canonicalUrl} />
	<meta name="robots" content={metadata.robots} />
	<meta property="og:site_name" content={metadata.siteName} />
	<meta property="og:locale" content={metadata.locale} />
	<meta property="og:type" content={metadata.ogType} />
	<meta property="og:title" content={metadata.ogTitle} />
	{#if metadata.ogDescription}
		<meta property="og:description" content={metadata.ogDescription} />
	{/if}
	<meta property="og:url" content={metadata.ogUrl} />
	{#if metadata.ogImage}
		<meta property="og:image" content={metadata.ogImage} />
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		{#if metadata.ogImageAlt}
			<meta property="og:image:alt" content={metadata.ogImageAlt} />
		{/if}
	{/if}
	<meta name="twitter:card" content={metadata.twitterCard} />
	<meta name="twitter:title" content={metadata.twitterTitle} />
	{#if metadata.twitterDescription}
		<meta name="twitter:description" content={metadata.twitterDescription} />
	{/if}
	{#if metadata.twitterImage}
		<meta name="twitter:image" content={metadata.twitterImage} />
		{#if metadata.twitterImageAlt}
			<meta name="twitter:image:alt" content={metadata.twitterImageAlt} />
		{/if}
	{/if}
	{#each metadata.jsonLdScripts as script, index (`jsonld-${index}`)}
		{@html script}
	{/each}
</svelte:head>
