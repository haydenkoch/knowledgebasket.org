<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Mail from '@lucide/svelte/icons/mail';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let resending = $state(false);
</script>

<svelte:head>
	<title>Verify Your Email — Knowledge Basket</title>
</svelte:head>

<Card.Root class="auth-card">
	<Card.Header class="auth-card__header">
		<div class="auth-icon-wrap">
			<Mail size={40} stroke-width={1.5} class="text-[var(--color-lakebed-600)]" />
		</div>
		<Card.Title class="auth-card__title">Check your email</Card.Title>
		<Card.Description class="auth-card__description">
			{#if data.email}
				We sent a verification link to <strong>{data.email}</strong>
			{:else}
				We sent you a verification link
			{/if}
		</Card.Description>
	</Card.Header>

	<Card.Content class="auth-card__content">
		{#if form?.resent}
			<Alert.Root class="mb-5">
				<CircleCheck />
				<Alert.Title>Email resent</Alert.Title>
				<Alert.Description>Check your inbox for the new verification link.</Alert.Description>
			</Alert.Root>
		{/if}

		{#if form?.message}
			<Alert.Root variant="destructive" class="mb-5">
				<TriangleAlert />
				<Alert.Title>Error</Alert.Title>
				<Alert.Description>{form.message}</Alert.Description>
			</Alert.Root>
		{/if}

		<p class="auth-verify-body">
			Click the link in the email to verify your account and get started. If you don't see it, check
			your spam folder.
		</p>

		<form
			method="post"
			action="?/resend"
			use:enhance={() => {
				resending = true;
				return async ({ update }) => {
					resending = false;
					await update();
				};
			}}
		>
			{#if data.email}
				<input type="hidden" name="email" value={data.email} />
			{/if}
			<Button
				variant="outline"
				type="submit"
				disabled={resending || !!form?.resent}
				class="auth-resend"
			>
				{#if resending}
					<Loader2 size={14} class="mr-1.5 animate-spin" />
					Resending…
				{:else}
					Resend verification email
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

	.auth-verify-body {
		font-family: var(--font-serif);
		font-size: 14px;
		color: var(--color-obsidian-700);
		line-height: 1.6;
		margin: 0 0 16px;
	}

	:global(.auth-resend) {
		width: 100% !important;
		font-family: var(--font-sans) !important;
		font-size: 12px !important;
		letter-spacing: 0.04em !important;
		text-transform: uppercase !important;
	}

	:global(.auth-card__footer) {
		border-top: 1px solid var(--color-granite-100) !important;
		padding-top: 16px !important;
		justify-content: center !important;
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
