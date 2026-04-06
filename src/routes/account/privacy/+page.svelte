<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { openPrivacyChoices } from '$lib/privacy/consent';
	import type { BadgeVariant } from '$lib/components/ui/badge/index.js';
	import Download from '@lucide/svelte/icons/download';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let { data, form } = $props();

	function requestLabel(requestType: string): string {
		switch (requestType) {
			case 'export_data':
				return 'Export';
			case 'delete_account':
				return 'Delete account';
			case 'correct_content':
				return 'Correction';
			case 'remove_content':
				return 'Removal';
			case 'opt_out_marketing':
				return 'Marketing opt-out';
			default:
				return requestType;
		}
	}

	function statusVariant(status: string): BadgeVariant {
		switch (status) {
			case 'completed':
			case 'approved':
				return 'default';
			case 'rejected':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	const submissionCounts = $derived([
		{ label: 'Events', value: data.submissionCounts.events },
		{ label: 'Funding', value: data.submissionCounts.funding },
		{ label: 'Jobs', value: data.submissionCounts.jobs },
		{ label: 'Red pages', value: data.submissionCounts.redPages },
		{ label: 'Toolbox', value: data.submissionCounts.toolbox }
	]);
</script>

<svelte:head>
	<title>Privacy & data · Knowledge Basket</title>
</svelte:head>

<div class="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
	<div class="space-y-6">
		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header>
				<Card.Title>Self-serve tools</Card.Title>
				<Card.Description>
					Export a complete JSON copy of your account data, or manage the consent choices stored in
					your browser.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="flex flex-wrap gap-3">
					<Button href="/account/privacy/export">
						<Download class="size-4" />
						Download my data
					</Button>
					<Button type="button" variant="outline" onclick={openPrivacyChoices}>
						<Settings2 class="size-4" />
						Privacy choices
					</Button>
				</div>

				<div class="space-y-3">
					<p class="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
						Content linked to your account
					</p>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
						{#each submissionCounts as stat}
							<div class="rounded-lg border border-border/70 bg-background p-4">
								<div
									class="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
								>
									{stat.label}
								</div>
								<div class="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</div>
							</div>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header>
				<Card.Title>Submit a request</Card.Title>
				<Card.Description>
					Corrections and removals are reviewed by the moderation team. We'll follow up on the email
					associated with your account.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Tabs.Root value="correction">
					<Tabs.List>
						<Tabs.Trigger value="correction">Correction</Tabs.Trigger>
						<Tabs.Trigger value="removal">Removal</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="correction" class="pt-5">
						<form method="POST" action="?/requestCorrection" class="space-y-4">
							<Field.Field>
								<Field.Label for="correction-subject">Subject</Field.Label>
								<Field.Content>
									<Input
										id="correction-subject"
										name="subject"
										placeholder="Correct my event listing title"
									/>
								</Field.Content>
							</Field.Field>
							<Field.Field>
								<Field.Label for="correction-url">Content URL</Field.Label>
								<Field.Content>
									<Input
										id="correction-url"
										name="contentUrl"
										type="url"
										placeholder="https://knowledgebasket.ca/events/example"
									/>
								</Field.Content>
							</Field.Field>
							<Field.Field>
								<Field.Label for="correction-message">What should change?</Field.Label>
								<Field.Content>
									<Textarea
										id="correction-message"
										name="message"
										rows={4}
										placeholder="Describe the update you need and why it matters."
									/>
								</Field.Content>
							</Field.Field>
							{#if form?.correctionError}
								<p class="text-sm text-destructive">{form.correctionError}</p>
							{:else if form?.correctionSuccess}
								<p class="text-sm text-emerald-700 dark:text-emerald-400">
									{form.correctionSuccess}
								</p>
							{/if}
							<Button type="submit">Submit correction request</Button>
						</form>
					</Tabs.Content>

					<Tabs.Content value="removal" class="pt-5">
						<form method="POST" action="?/requestRemoval" class="space-y-4">
							<Field.Field>
								<Field.Label for="removal-subject">Subject</Field.Label>
								<Field.Content>
									<Input
										id="removal-subject"
										name="subject"
										placeholder="Remove contact details from my listing"
									/>
								</Field.Content>
							</Field.Field>
							<Field.Field>
								<Field.Label for="removal-url">Content URL</Field.Label>
								<Field.Content>
									<Input
										id="removal-url"
										name="contentUrl"
										type="url"
										placeholder="https://knowledgebasket.ca/red-pages/example"
									/>
								</Field.Content>
							</Field.Field>
							<Field.Field>
								<Field.Label for="removal-message">What should be removed?</Field.Label>
								<Field.Content>
									<Textarea
										id="removal-message"
										name="message"
										rows={4}
										placeholder="Explain what should be taken down or hidden and why."
									/>
								</Field.Content>
							</Field.Field>
							{#if form?.removalError}
								<p class="text-sm text-destructive">{form.removalError}</p>
							{:else if form?.removalSuccess}
								<p class="text-sm text-emerald-700 dark:text-emerald-400">
									{form.removalSuccess}
								</p>
							{/if}
							<Button type="submit" variant="outline">Submit removal request</Button>
						</form>
					</Tabs.Content>
				</Tabs.Root>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-destructive/40 bg-card/90">
			<Card.Header>
				<Card.Title class="text-destructive">Delete account</Card.Title>
				<Card.Description>
					This removes sign-in access, clears session data, and anonymizes your account record.
					Published listings may remain as part of the public knowledge base, but submitter contact
					details are stripped where available.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Alert variant="destructive" class="mb-4">
					<TriangleAlert class="size-4" />
					<AlertTitle>This cannot be undone</AlertTitle>
					<AlertDescription>
						You will immediately lose access to this account and any in-progress submissions.
					</AlertDescription>
				</Alert>
				<form method="POST" action="?/deleteAccount" class="space-y-4">
					<Field.Field>
						<Field.Label for="delete-confirmation">
							Type <span class="font-mono font-semibold">DELETE</span> to confirm
						</Field.Label>
						<Field.Content>
							<Input id="delete-confirmation" name="confirmation" placeholder="DELETE" />
						</Field.Content>
					</Field.Field>
					{#if form?.deleteError}
						<p class="text-sm text-destructive">{form.deleteError}</p>
					{/if}
					<Button type="submit" variant="destructive">Delete my account</Button>
				</form>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-6">
		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header>
				<Card.Title>Request history</Card.Title>
				<Card.Description>Recent privacy actions linked to this account.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.requests.length === 0}
					<p
						class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground"
					>
						No privacy requests yet.
					</p>
				{:else}
					<ul class="divide-y divide-border/60">
						{#each data.requests as request}
							<li class="space-y-1 py-3 first:pt-0 last:pb-0">
								<div class="flex items-center justify-between gap-3">
									<p class="text-sm font-medium">{requestLabel(request.requestType)}</p>
									<Badge
										variant={statusVariant(request.status)}
										class="text-[10px] tracking-wider uppercase"
									>
										{request.status}
									</Badge>
								</div>
								{#if request.subject}
									<p class="text-sm text-muted-foreground">{request.subject}</p>
								{/if}
								<p class="text-xs text-muted-foreground">
									Requested {new Date(request.requestedAt).toLocaleString()}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header>
				<Card.Title>Recent submissions</Card.Title>
				<Card.Description
					>Content linked to your account for moderation or publication.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				{#if data.submissions.length === 0}
					<p
						class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground"
					>
						No linked submissions yet.
					</p>
				{:else}
					<ul class="divide-y divide-border/60">
						{#each data.submissions.slice(0, 8) as submission}
							<li class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{submission.title}</p>
									<p
										class="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
									>
										{submission.coil}
									</p>
								</div>
								<Badge variant="secondary" class="text-[10px] tracking-wider uppercase">
									{submission.status ?? 'unknown'}
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
