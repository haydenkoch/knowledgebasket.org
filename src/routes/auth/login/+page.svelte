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
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign In — Knowledge Basket</title>
</svelte:head>

<Card.Root class="auth-card">
	<Card.Header class="auth-card__header">
		<Card.Title class="auth-card__title">Sign in</Card.Title>
		<Card.Description class="auth-card__description">
			Welcome back to the community
		</Card.Description>
	</Card.Header>

	<Card.Content class="auth-card__content">
		{#if data.message === 'password-reset'}
			<Alert.Root class="mb-5">
				<CircleCheck />
				<Alert.Title>Password updated</Alert.Title>
				<Alert.Description>Your password has been reset. Sign in below.</Alert.Description>
			</Alert.Root>
		{:else if data.message === 'verified'}
			<Alert.Root class="mb-5">
				<CircleCheck />
				<Alert.Title>Email verified</Alert.Title>
				<Alert.Description>Your account is active. You can now sign in.</Alert.Description>
			</Alert.Root>
		{/if}

		{#if form?.message}
			<Alert.Root variant="destructive" class="mb-5">
				<TriangleAlert />
				<Alert.Title>Sign in failed</Alert.Title>
				<Alert.Description>{form.message}</Alert.Description>
			</Alert.Root>
		{/if}

		<form
			method="post"
			action="?/signIn"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
			class="auth-form"
		>
			{#if data.redirect}
				<input type="hidden" name="redirect" value={data.redirect} />
			{/if}

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
					class="auth-input"
				/>
			</div>

			<div class="auth-field">
				<div class="auth-field__row">
					<Label for="password">Password</Label>
					<a href="/auth/forgot-password" class="auth-link auth-link--small">Forgot password?</a>
				</div>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					disabled={submitting}
					class="auth-input"
				/>
			</div>

			<Button type="submit" disabled={submitting} class="auth-submit">
				{#if submitting}
					<Loader2 size={14} class="mr-1.5 animate-spin" />
					Signing in…
				{:else}
					Sign in
				{/if}
			</Button>
		</form>
	</Card.Content>

	<Card.Footer class="auth-card__footer">
		<p class="auth-footer-text">
			Don't have an account?
			<a href="/auth/register" class="auth-link">Create one</a>
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
		gap: 16px;
	}

	.auth-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.auth-field__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	:global(.auth-input) {
		height: 40px !important;
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

	.auth-link--small {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-obsidian-500);
	}

	.auth-link--small:hover {
		color: var(--color-lakebed-700);
	}
</style>
