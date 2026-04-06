<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);

	// Narrow the form type for fields not present on all fail() union members
	const formToken = $derived(
		form && 'token' in form ? (form as { token: string }).token : undefined
	);
	const formExpired = $derived(
		form && 'expired' in form ? (form as { expired: boolean }).expired : false
	);
	const token = $derived(formToken ?? data.token);
</script>

<svelte:head>
	<title>Set New Password — Knowledge Basket</title>
</svelte:head>

<Card.Root class="auth-card">
	<Card.Header class="auth-card__header">
		<Card.Title class="auth-card__title">Set a new password</Card.Title>
		<Card.Description class="auth-card__description">
			Choose a strong password for your account
		</Card.Description>
	</Card.Header>

	<Card.Content class="auth-card__content">
		{#if form?.message}
			<Alert.Root variant="destructive" class="mb-5">
				<TriangleAlert />
				<Alert.Title>{formExpired ? 'Link expired' : 'Error'}</Alert.Title>
				<Alert.Description>
					{form.message}
					{#if formExpired}
						<br />
						<a href="/auth/forgot-password" class="auth-inline-link">Request a new reset link</a>
					{/if}
				</Alert.Description>
			</Alert.Root>
		{/if}

		<form
			method="post"
			action="?/resetPassword"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
			class="auth-form"
		>
			<input type="hidden" name="token" value={token} />

			<div class="auth-field">
				<Label for="newPassword">New password</Label>
				<Input
					id="newPassword"
					name="newPassword"
					type="password"
					autocomplete="new-password"
					required
					minlength={8}
					disabled={submitting}
					aria-describedby="password-hint"
				/>
				<p id="password-hint" class="auth-field-hint">At least 8 characters</p>
			</div>

			<div class="auth-field">
				<Label for="confirmPassword">Confirm new password</Label>
				<Input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					autocomplete="new-password"
					required
					disabled={submitting}
				/>
			</div>

			<Button type="submit" disabled={submitting} class="auth-submit">
				{#if submitting}
					<Loader2 size={14} class="mr-1.5 animate-spin" />
					Saving…
				{:else}
					Set new password
				{/if}
			</Button>
		</form>
	</Card.Content>

	<Card.Footer class="auth-card__footer">
		<a href="/auth/login" class="auth-link"><ArrowLeft class="inline h-4 w-4" /> Back to sign in</a>
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

	.auth-field-hint {
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--color-obsidian-500);
		margin: 0;
	}

	.auth-inline-link {
		color: inherit;
		font-weight: 600;
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
