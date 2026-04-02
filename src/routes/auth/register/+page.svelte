<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);

	// Helper to access typed field errors from the union ActionData
	const fieldErrors = $derived(
		form && 'errors' in form ? (form.errors as Record<string, string>) : undefined
	);
</script>

<svelte:head>
	<title>Create Account — Knowledge Basket</title>
</svelte:head>

<Card.Root class="auth-card">
	<Card.Header class="auth-card__header">
		<Card.Title class="auth-card__title">Create your account</Card.Title>
		<Card.Description class="auth-card__description">
			Join the Knowledge Basket community
		</Card.Description>
	</Card.Header>

	<Card.Content class="auth-card__content">
		{#if form?.message}
			<Alert.Root variant="destructive" class="mb-5">
				<TriangleAlert />
				<Alert.Title>Registration failed</Alert.Title>
				<Alert.Description>{form.message}</Alert.Description>
			</Alert.Root>
		{/if}

		<form
			method="post"
			action="?/signUp"
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
				<Label for="name">Full name</Label>
				<Input
					id="name"
					name="name"
					type="text"
					autocomplete="name"
					value={form?.fields?.name ?? ''}
					required
					disabled={submitting}
					aria-describedby={fieldErrors?.name ? 'name-error' : undefined}
				/>
				{#if fieldErrors?.name}
					<p id="name-error" class="auth-field-error">{fieldErrors.name}</p>
				{/if}
			</div>

			<div class="auth-field">
				<Label for="email">Email address</Label>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					value={form?.fields?.email ?? ''}
					required
					disabled={submitting}
					aria-describedby={fieldErrors?.email ? 'email-error' : undefined}
				/>
				{#if fieldErrors?.email}
					<p id="email-error" class="auth-field-error">{fieldErrors.email}</p>
				{/if}
			</div>

			<div class="auth-field">
				<Label for="password">Password</Label>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					required
					minlength={8}
					disabled={submitting}
					aria-describedby={fieldErrors?.password ? 'password-error' : 'password-hint'}
				/>
				{#if fieldErrors?.password}
					<p id="password-error" class="auth-field-error">{fieldErrors.password}</p>
				{:else}
					<p id="password-hint" class="auth-field-hint">At least 8 characters</p>
				{/if}
			</div>

			<div class="auth-field">
				<Label for="confirmPassword">Confirm password</Label>
				<Input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					autocomplete="new-password"
					required
					disabled={submitting}
					aria-describedby={fieldErrors?.confirmPassword ? 'confirm-error' : undefined}
				/>
				{#if fieldErrors?.confirmPassword}
					<p id="confirm-error" class="auth-field-error">{fieldErrors.confirmPassword}</p>
				{/if}
			</div>

			<Button type="submit" disabled={submitting} class="auth-submit">
				{#if submitting}
					<Loader2 size={14} class="mr-1.5 animate-spin" />
					Creating account…
				{:else}
					Create account
				{/if}
			</Button>
		</form>
	</Card.Content>

	<Card.Footer class="auth-card__footer">
		<p class="auth-footer-text">
			Already have an account?
			<a href="/auth/login" class="auth-link">Sign in</a>
		</p>
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
		gap: 14px;
	}

	.auth-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.auth-field-error {
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--color-ember-700);
		margin: 0;
	}

	.auth-field-hint {
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--color-obsidian-500);
		margin: 0;
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

	.auth-footer-text {
		font-family: var(--font-serif);
		font-size: 13px;
		color: var(--color-obsidian-600);
		margin: 0;
	}

	.auth-link {
		color: var(--color-lakebed-700);
		text-decoration: none;
		font-weight: 500;
	}

	.auth-link:hover {
		text-decoration: underline;
	}
</style>
