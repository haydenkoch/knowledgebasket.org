<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
</script>

<svelte:head>
	<title>Access Denied — Knowledge Basket</title>
</svelte:head>

<Card.Root class="auth-card">
	<Card.Header class="auth-card__header">
		<div class="auth-icon-wrap">
			<LockKeyhole size={40} stroke-width={1.5} class="text-[var(--color-ember-600)]" />
		</div>
		<Card.Title class="auth-card__title">Access denied</Card.Title>
		<Card.Description class="auth-card__description">
			You don't have permission to access this area
		</Card.Description>
	</Card.Header>

	<Card.Content class="auth-card__content">
		<p class="auth-body">
			This section is restricted to staff and administrators. If you believe this is an error,
			please contact us.
		</p>
		<div class="auth-actions">
			<Button href="/" class="auth-submit">Go to homepage</Button>
			<Button href="/auth/login" variant="outline" class="auth-secondary">
				Sign in with a different account
			</Button>
		</div>
	</Card.Content>
</Card.Root>

<style>
	:global(.auth-card) {
		border-color: var(--color-granite-200);
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.06),
			0 4px 16px rgba(0, 0, 0, 0.06);
	}

	:global(.auth-card__header) {
		padding-bottom: 8px;
		text-align: center;
	}

	.auth-icon-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: 12px;
	}

	:global(.auth-card__title) {
		font-family: var(--font-sans) !important;
		font-size: 22px !important;
		font-weight: 700 !important;
		letter-spacing: 0.02em !important;
		color: var(--color-lakebed-950) !important;
		text-transform: uppercase !important;
	}

	:global(.auth-card__description) {
		font-family: var(--font-serif) !important;
		font-size: 14px !important;
		color: var(--color-obsidian-600) !important;
	}

	:global(.auth-card__content) {
		padding-top: 8px !important;
	}

	.auth-body {
		font-family: var(--font-serif);
		font-size: 14px;
		color: var(--color-obsidian-700);
		line-height: 1.6;
		margin: 0 0 20px;
		text-align: center;
	}

	.auth-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	:global(.auth-submit) {
		width: 100% !important;
		background: var(--color-lakebed-950) !important;
		color: var(--color-alpine-snow-50) !important;
		font-family: var(--font-sans) !important;
		font-weight: 600 !important;
		letter-spacing: 0.04em !important;
		text-transform: uppercase !important;
		font-size: 12px !important;
	}

	:global(.auth-submit:hover) {
		background: var(--color-lakebed-800) !important;
	}

	:global(.auth-secondary) {
		width: 100% !important;
		font-family: var(--font-sans) !important;
		font-size: 12px !important;
		letter-spacing: 0.04em !important;
		text-transform: uppercase !important;
	}
</style>
