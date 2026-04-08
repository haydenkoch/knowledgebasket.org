<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { CheckCircle, XCircle } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Integrations | KB Admin</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
	<h1 class="text-2xl font-bold">Integrations</h1>
	<p class="text-muted-foreground">
		Check whether key services are connected and ready to support staff workflows on the site.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Mapbox</Card.Title>
			<Card.Description>
				Supports maps and location lookup in event and venue workflows.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-2">
				{#if data.mapboxConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">This connection is not set up yet</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Meilisearch</Card.Title>
			<Card.Description>
				Powers cross-site content search and the internal search operations page.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-2">
				{#if data.meilisearchConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">This connection is not set up yet</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>PostHog</Card.Title>
			<Card.Description>
				Explicit product analytics and masked session replay, only after visitors opt into analytics
				cookies.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center gap-2">
				{#if data.posthogConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">This connection is not set up yet</span>
				{/if}
			</div>

			<div class="text-sm text-muted-foreground">
				<p>
					Host:
					<span class="font-medium text-foreground">{data.posthogHost}</span>
				</p>
				{#if data.posthogConfigured}
					<p>Using `PUBLIC_POSTHOG_KEY` and `PUBLIC_POSTHOG_HOST` from the runtime environment.</p>
				{:else}
					<p>Add `PUBLIC_POSTHOG_KEY` in production to enable analytics and replay.</p>
				{/if}
			</div>

			<div class="rounded-xl border border-border/70 bg-background/70 p-4 text-sm">
				<p class="font-medium text-foreground">What this integration sends</p>
				<ul class="mt-2 space-y-1 text-muted-foreground">
					{#each data.posthogGuards as line}
						<li>{line}</li>
					{/each}
				</ul>
				<p class="mt-3 text-muted-foreground">
					Identified person properties:
					<span class="font-medium text-foreground">
						{data.posthogIdentifiedPersonProperties.join(', ')}
					</span>
				</p>
				<p class="mt-2 text-muted-foreground">
					Marketing-ready signals:
					<span class="font-medium text-foreground">{data.posthogMarketingSignals.join(', ')}</span>
				</p>
				<p class="mt-2 text-muted-foreground">
					Implementation docs live in <span class="font-medium text-foreground"
						>`docs/ANALYTICS_AND_MARKETING.md`</span
					>.
				</p>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium text-foreground">Event catalog</p>
				<div class="grid gap-3">
					{#each data.posthogEventCatalog as entry}
						<div class="rounded-xl border border-border/70 bg-background/60 p-3">
							<p class="text-sm font-medium text-foreground">{entry.name}</p>
							<p class="mt-1 text-sm text-muted-foreground">{entry.description}</p>
							<p class="mt-2 text-xs text-muted-foreground">
								Properties:
								<span class="font-medium text-foreground">{entry.properties.join(', ')}</span>
							</p>
							{#if entry.notes}
								<p class="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Email delivery</Card.Title>
			<Card.Description>
				SMTP-backed delivery for transactional mail now has reusable marketing-template scaffolding
				for follow, interest, and newsletter sends.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			<div class="flex items-center gap-2">
				{#if data.smtpConfigured}
					<CheckCircle class="h-5 w-5 text-[var(--color-pinyon-600)]" />
					<span class="font-medium text-[var(--color-pinyon-800)]">Connected</span>
				{:else}
					<XCircle class="h-5 w-5 text-[var(--color-ember-600)]" />
					<span class="font-medium text-[var(--mid)]">This connection is not set up yet</span>
				{/if}
			</div>

			<div class="text-sm text-muted-foreground">
				<p>
					From:
					<span class="font-medium text-foreground">{data.smtpFrom ?? 'Not configured'}</span>
				</p>
				<p>
					Transport security:
					<span class="font-medium text-foreground">{data.smtpTransportSecurity}</span>
				</p>
				<p>
					Template helpers live in
					<span class="font-medium text-foreground">`src/lib/server/marketing-email.ts`</span>.
				</p>
				<p>
					Usage notes live in
					<span class="font-medium text-foreground">`docs/ANALYTICS_AND_MARKETING.md`</span>.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
