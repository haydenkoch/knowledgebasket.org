<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CoilKey } from '$lib/data/kb';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	interface Props {
		coil: CoilKey;
		breadcrumbHref: string;
		breadcrumbLabel: string;
		pageTitle: string;
		pageDescription: string;
		noticeLabel?: string;
		noticeText: string;
		footerText?: string;
		footerContent?: Snippet;
		success?: { heading: string; message: string; backHref: string; backLabel: string } | null;
		children?: Snippet;
	}

	let {
		coil,
		breadcrumbHref,
		breadcrumbLabel,
		pageTitle,
		pageDescription,
		noticeLabel = 'Moderation',
		noticeText,
		footerText = '',
		footerContent,
		success = null,
		children
	}: Props = $props();

	const coilAccent: Record<CoilKey, string> = {
		events: 'var(--teal)',
		funding: 'var(--gold)',
		redpages: 'var(--red)',
		jobs: 'var(--forest)',
		toolbox: 'var(--slate)'
	};

	const coilBg: Record<CoilKey, string> = {
		events: 'var(--color-lakebed-100)',
		funding: 'var(--color-flicker-50)',
		redpages: 'var(--color-ember-50)',
		jobs: 'var(--color-pinyon-50)',
		toolbox: 'var(--color-granite-50)'
	};

	const accent = $derived(coilAccent[coil] ?? 'var(--teal)');
	const headerBg = $derived(coilBg[coil] ?? 'var(--color-lakebed-100)');
</script>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12" style="--kb-accent: {accent}">
	<Breadcrumb.Root class="mb-6">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href={breadcrumbHref}>{breadcrumbLabel}</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{pageTitle}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	{#if success}
		<div class="flex flex-col items-center gap-5 py-16 text-center">
			<CircleCheckIcon class="size-12" style="color: {accent}" />
			<div>
				<h2 class="mb-2 font-serif text-2xl font-semibold text-foreground">{success.heading}</h2>
				<p class="mx-auto max-w-sm text-sm text-muted-foreground">{success.message}</p>
			</div>
			<Button href={success.backHref} variant="outline"
				><ArrowLeft class="inline h-4 w-4" /> {success.backLabel}</Button
			>
		</div>
	{:else}
		<!-- Editorial header -->
		<div class="mb-8 rounded-xl px-6 py-8" style="background: {headerBg}">
			<p
				class="mb-2 font-sans text-[11px] font-bold tracking-[0.12em] uppercase opacity-80"
				style="color: {accent}"
			>
				{breadcrumbLabel}
			</p>
			<h1
				class="font-display mb-3 text-3xl leading-tight font-bold text-foreground sm:text-[2.25rem]"
			>
				{pageTitle}
			</h1>
			<p class="max-w-lg font-serif text-base leading-relaxed text-muted-foreground">
				{pageDescription}
			</p>
		</div>

		<!-- Moderation notice -->
		<div
			class="mb-8 rounded-lg border-l-4 px-4 py-3 text-sm"
			style="border-color: {accent}; background: {headerBg}"
		>
			<strong style="color: {accent}">{noticeLabel}:</strong>
			<span class="ml-1 text-muted-foreground">{noticeText}</span>
		</div>

		{@render children?.()}

		{#if footerContent}
			<div class="pt-6 pb-2 text-center text-xs text-muted-foreground">
				{@render footerContent()}
			</div>
		{:else if footerText}
			<p class="pt-6 pb-2 text-center text-xs text-muted-foreground">{footerText}</p>
		{/if}
	{/if}
</div>
