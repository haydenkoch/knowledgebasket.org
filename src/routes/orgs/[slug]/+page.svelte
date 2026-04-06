<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
	<div class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Workspace snapshot</Card.Title>
				<Card.Description>What’s currently connected to this organization.</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-xl border border-border/70 p-4">
					<div class="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
						Events
					</div>
					<div class="mt-2 text-2xl font-semibold">{data.events.length}</div>
				</div>
				<div class="rounded-xl border border-border/70 p-4">
					<div class="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
						Jobs
					</div>
					<div class="mt-2 text-2xl font-semibold">{data.jobs.length}</div>
				</div>
				<div class="rounded-xl border border-border/70 p-4">
					<div class="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
						Resources
					</div>
					<div class="mt-2 text-2xl font-semibold">{data.resources.length}</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Recent content</Card.Title>
				<Card.Description>Newest organization-linked submissions and updates.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each [...data.events.slice(0, 2), ...data.jobs.slice(0, 2), ...data.resources.slice(0, 2)] as item}
					<div class="rounded-xl border border-border/70 p-4">
						<p class="font-medium">{item.title}</p>
						<p class="text-sm text-muted-foreground">Status: {item.status ?? 'draft'}</p>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No workspace content yet.</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Team</Card.Title>
				<Card.Description>Members and pending invites for this organization.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<p class="text-sm text-muted-foreground">
					{data.members.length} active member{data.members.length === 1 ? '' : 's'}.
				</p>
				<p class="text-sm text-muted-foreground">
					{data.invites.length} pending invite{data.invites.length === 1 ? '' : 's'}.
				</p>
				<Button href={`/orgs/${data.organization.slug}/team`} variant="outline"
					>Open team settings</Button
				>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Organization settings</Card.Title>
				<Card.Description
					>Update your public profile, contact details, and description.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<Button href={`/orgs/${data.organization.slug}/settings`} variant="outline"
					>Edit organization</Button
				>
			</Card.Content>
		</Card.Root>
	</div>
</div>
