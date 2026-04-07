<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { trackAuthPageViewed, trackAuthSubmitted } from '$lib/analytics/events';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);

	// Helper to access typed field errors from the union ActionData
	const fieldErrors = $derived(
		form && 'errors' in form ? (form.errors as Record<string, string>) : undefined
	);

	onMount(() => {
		trackAuthPageViewed('register');
	});
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

		{#if data.googleError}
			<Alert.Root variant="destructive" class="mb-5">
				<TriangleAlert />
				<Alert.Title>Google sign-in failed</Alert.Title>
				<Alert.Description>{data.googleError}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if data.googleEnabled}
			<form
				method="post"
				action="?/signUpWithGoogle"
				class="auth-google-form"
				onsubmit={() => trackAuthSubmitted('register', 'google')}
			>
				<Button type="submit" variant="outline" class="auth-google-button">
					<span class="auth-google-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" focusable="false">
							<path
								fill="#4285F4"
								d="M21.64 12.2045c0-.6382-.0573-1.2518-.1636-1.8409H12v3.4818h5.4109c-.2327 1.2527-.9391 2.3136-2.0027 3.0227v2.5091h3.24c1.8963-1.7455 2.9918-4.3182 2.9918-7.1727Z"
							/>
							<path
								fill="#34A853"
								d="M12 22c2.7 0 4.9636-.8955 6.6182-2.4227l-3.24-2.5091c-.8955.6-2.0409.9545-3.3782.9545-2.5954 0-4.7909-1.7545-5.5727-4.1136H3.0782v2.5909C4.7236 19.7691 8.0727 22 12 22Z"
							/>
							<path
								fill="#FBBC05"
								d="M6.4273 13.9091A5.9966 5.9966 0 0 1 6.1182 12c0-.6636.1136-1.3091.3091-1.9091V7.5H3.0782A9.996 9.996 0 0 0 2 12c0 1.6091.3864 3.1318 1.0782 4.5l3.3491-2.5909Z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.9773c1.4682 0 2.7864.5045 3.8227 1.4954l2.8682-2.8682C16.9591 2.9954 14.6955 2 12 2 8.0727 2 4.7236 4.2309 3.0782 7.5l3.3491 2.5909C7.2091 7.7318 9.4045 5.9773 12 5.9773Z"
							/>
						</svg>
					</span>
					Continue with Google
				</Button>
			</form>

			<div class="auth-divider" role="presentation">
				<span>Or create an account with email</span>
			</div>
		{/if}

		<form
			method="post"
			action="?/signUp"
			use:enhance={() => {
				trackAuthSubmitted('register', 'password');
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

	.auth-google-form {
		margin-bottom: 18px;
	}

	:global(.auth-google-button) {
		width: 100% !important;
		display: inline-flex !important;
		align-items: center !important;
		justify-content: center !important;
		gap: 10px !important;
		font-family: var(--font-sans) !important;
		font-size: 12px !important;
		font-weight: 600 !important;
		letter-spacing: 0.03em !important;
		text-transform: uppercase !important;
	}

	.auth-google-mark {
		display: inline-flex;
		width: 16px;
		height: 16px;
	}

	.auth-google-mark svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.auth-divider {
		position: relative;
		margin: 0 0 18px;
		text-align: center;
	}

	.auth-divider::before {
		content: '';
		position: absolute;
		inset-inline: 0;
		top: 50%;
		border-top: 1px solid var(--color-granite-200);
	}

	.auth-divider span {
		position: relative;
		display: inline-block;
		padding: 0 10px;
		background: var(--background);
		font-family: var(--font-sans);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-obsidian-500);
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
