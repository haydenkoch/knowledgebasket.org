<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Reset Password — Knowledge Basket</title>
</svelte:head>

<Card.Root class="auth-card">
	<Card.Header class="auth-card__header">
		<Card.Title class="auth-card__title">Reset your password</Card.Title>
		<Card.Description class="auth-card__description">
			Enter your email and we'll send you a reset link
		</Card.Description>
	</Card.Header>

	<Card.Content class="auth-card__content">
		{#if form?.sent}
			<Alert.Root class="auth-success-alert">
				<CircleCheck />
				<Alert.Title>Check your inbox</Alert.Title>
				<Alert.Description>
					If an account exists for <strong>{form.email}</strong>, we've sent a password reset link.
					Check your spam folder if you don't see it.
				</Alert.Description>
			</Alert.Root>
		{:else}
			{#if form?.error}
				<Alert.Root variant="destructive" class="mb-5">
					<TriangleAlert />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{form.error}</Alert.Description>
				</Alert.Root>
			{/if}

			<form
				method="post"
				action="?/requestReset"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						submitting = false;
						await update();
					};
				}}
				class="auth-form"
			>
				<div class="auth-field">
					<Label for="email">Email address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						value={form?.email ?? ''}
						required
						disabled={submitting}
					/>
				</div>

				<Button type="submit" disabled={submitting} class="auth-submit">
					{#if submitting}
						<Loader2 size={14} class="mr-1.5 animate-spin" />
						Sending…
					{:else}
						Send reset link
					{/if}
				</Button>
			</form>
		{/if}
	</Card.Content>

	<Card.Footer class="auth-card__footer">
		<a href="/auth/login" class="auth-link">← Back to sign in</a>
	</Card.Footer>
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
		font-style: italic !important;
	}

	:global(.auth-card__content) {
		padding-top: 8px !important;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.auth-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	:global(.auth-success-alert) {
		margin: 0 !important;
	}

	:global(.auth-submit) {
		width: 100% !important;
		margin-top: 4px !important;
		background: var(--color-lakebed-950) !important;
		color: var(--color-alpine-snow-50) !important;
		font-family: var(--font-sans) !important;
		font-weight: 600 !important;
		letter-spacing: 0.04em !important;
		text-transform: uppercase !important;
		font-size: 12px !important;
	}

	:global(.auth-submit:hover:not(:disabled)) {
		background: var(--color-lakebed-800) !important;
	}

	:global(.auth-card__footer) {
		border-top: 1px solid var(--color-granite-100) !important;
		padding-top: 16px !important;
	}

	.auth-link {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-obsidian-500);
		text-decoration: none;
	}

	.auth-link:hover {
		color: var(--color-lakebed-700);
	}
</style>
