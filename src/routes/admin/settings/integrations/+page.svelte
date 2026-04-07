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
				Product analytics and session replay, only after visitors opt into analytics cookies.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
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
		</Card.Content>
	</Card.Root>
</div>
