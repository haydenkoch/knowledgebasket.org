<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import Mail from '@lucide/svelte/icons/mail';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import LogOut from '@lucide/svelte/icons/log-out';

	let { data, form } = $props();
	let revokeOther = $state(false);
</script>

<svelte:head>
	<title>Account settings · Knowledge Basket</title>
</svelte:head>

<div class="space-y-6">
	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<div class="flex items-start gap-3">
				<div class="rounded-md border border-border/70 bg-muted p-2 text-muted-foreground">
					<Mail class="size-4" />
				</div>
				<div class="space-y-1.5">
					<Card.Title>Email address</Card.Title>
					<Card.Description>
						Used for signing in and for all account notifications. Changes require confirmation from
						your current address.
					</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
				<span class="text-muted-foreground">Current:</span>
				<span class="font-medium">{data.email}</span>
				<Badge
					variant={data.emailVerified ? 'default' : 'secondary'}
					class="text-[10px] tracking-wider uppercase"
				>
					{data.emailVerified ? 'verified' : 'unverified'}
				</Badge>
			</div>

			<form method="POST" action="?/changeEmail" class="space-y-4">
				<Field.Field>
					<Field.Label for="new-email">New email</Field.Label>
					<Field.Content>
						<Input
							id="new-email"
							name="newEmail"
							type="email"
							required
							placeholder="you@example.com"
						/>
					</Field.Content>
					<Field.Description>
						We'll email your current address with a confirmation link. The change takes effect once
						you click it.
					</Field.Description>
				</Field.Field>
				{#if form?.emailError}
					<p class="text-sm text-destructive">{form.emailError}</p>
				{:else if form?.emailSuccess}
					<p class="text-sm text-emerald-700 dark:text-emerald-400">{form.emailSuccess}</p>
				{/if}
				<Button type="submit">Send confirmation</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.googleEnabled || data.googleConnected || data.googleSuccess || data.googleError}
		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header>
				<div class="flex items-start gap-3">
					<div class="rounded-md border border-border/70 bg-muted p-2 text-muted-foreground">
						<svg viewBox="0 0 24 24" class="size-4" aria-hidden="true">
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
					</div>
					<div class="space-y-1.5">
						<Card.Title>Google sign-in</Card.Title>
						<Card.Description>
							Connect Google as another way to sign in to this same Knowledge Basket account.
						</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-wrap items-center gap-2 text-sm">
					<span class="text-muted-foreground">Status:</span>
					<Badge
						variant={data.googleConnected ? 'default' : 'secondary'}
						class="text-[10px] tracking-wider uppercase"
					>
						{data.googleConnected ? 'connected' : 'not linked'}
					</Badge>
				</div>

				{#if form?.googleError || data.googleError}
					<Alert variant="destructive">
						<AlertTitle>Couldn't link Google</AlertTitle>
						<AlertDescription>{form?.googleError ?? data.googleError}</AlertDescription>
					</Alert>
				{:else if form?.googleSuccess || data.googleSuccess}
					<Alert>
						<AlertTitle>Google connected</AlertTitle>
						<AlertDescription>{form?.googleSuccess ?? data.googleSuccess}</AlertDescription>
					</Alert>
				{/if}

				{#if data.googleConnected}
					<p class="text-sm text-muted-foreground">
						You can now use Google to sign in to this account without changing your existing email
						or password login.
					</p>
				{:else if data.googleEnabled}
					<form method="POST" action="?/linkGoogle">
						<Button type="submit" variant="outline">Link Google</Button>
					</form>
				{:else}
					<p class="text-sm text-muted-foreground">
						Google sign-in is not configured for this environment.
					</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<div class="flex items-start gap-3">
				<div class="rounded-md border border-border/70 bg-muted p-2 text-muted-foreground">
					<KeyRound class="size-4" />
				</div>
				<div class="space-y-1.5">
					<Card.Title>Password</Card.Title>
					<Card.Description>
						Use at least 8 characters. A mix of letters, numbers, and symbols is recommended.
					</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/changePassword" class="space-y-4">
				<Field.Field>
					<Field.Label for="current-password">Current password</Field.Label>
					<Field.Content>
						<Input
							id="current-password"
							name="currentPassword"
							type="password"
							required
							autocomplete="current-password"
						/>
					</Field.Content>
				</Field.Field>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="new-password">New password</Field.Label>
						<Field.Content>
							<Input
								id="new-password"
								name="newPassword"
								type="password"
								required
								minlength={8}
								autocomplete="new-password"
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="confirm-password">Confirm new password</Field.Label>
						<Field.Content>
							<Input
								id="confirm-password"
								name="confirmPassword"
								type="password"
								required
								minlength={8}
								autocomplete="new-password"
							/>
						</Field.Content>
					</Field.Field>
				</div>

				<label
					class="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background p-4"
					for="revoke-other-sessions"
				>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium">Sign out of other sessions</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							Ends your active sessions on other devices. This one stays signed in.
						</p>
					</div>
					<Switch
						id="revoke-other-sessions"
						name="revokeOtherSessions"
						value="on"
						bind:checked={revokeOther}
					/>
				</label>

				{#if form?.passwordError}
					<p class="text-sm text-destructive">{form.passwordError}</p>
				{:else if form?.passwordSuccess}
					<p class="text-sm text-emerald-700 dark:text-emerald-400">{form.passwordSuccess}</p>
				{/if}

				<Button type="submit">Update password</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<div class="flex items-start gap-3">
				<div class="rounded-md border border-border/70 bg-muted p-2 text-muted-foreground">
					<LogOut class="size-4" />
				</div>
				<div class="space-y-1.5">
					<Card.Title>Active sessions</Card.Title>
					<Card.Description>
						Sign out of every other device where you're currently logged in.
					</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if form?.sessionsError}
				<Alert variant="destructive">
					<AlertTitle>Couldn't sign out other sessions</AlertTitle>
					<AlertDescription>{form.sessionsError}</AlertDescription>
				</Alert>
			{:else if form?.sessionsSuccess}
				<Alert>
					<AlertTitle>Done</AlertTitle>
					<AlertDescription>{form.sessionsSuccess}</AlertDescription>
				</Alert>
			{/if}
			<form method="POST" action="?/revokeOtherSessions">
				<Button type="submit" variant="outline">Sign out of other sessions</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
