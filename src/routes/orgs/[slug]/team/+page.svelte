<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data, form } = $props();
</script>

<div class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
	<Card.Root>
		<Card.Header>
			<Card.Title>Invite teammates</Card.Title>
			<Card.Description
				>Owners can invite other people into this organization workspace.</Card.Description
			>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form method="POST" action="?/invite" class="space-y-4">
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Field.Content><Input id="email" name="email" type="email" required /></Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="role">Role</Field.Label>
					<Field.Content>
						<select
							id="role"
							name="role"
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
						>
							<option value="editor">Editor</option>
							<option value="admin">Admin</option>
							<option value="owner">Owner</option>
						</select>
					</Field.Content>
				</Field.Field>
				<Button type="submit">Send invite</Button>
			</form>
			{#if form?.inviteLink}
				<div class="rounded-xl border border-border/70 p-4">
					<p class="text-sm font-medium">Invite link</p>
					<p class="mt-2 text-sm break-all text-muted-foreground">{form.inviteLink}</p>
				</div>
			{/if}
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<div class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Active members</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each data.members as member}
					<div class="rounded-xl border border-border/70 p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-medium">{member.userName}</p>
								<p class="text-sm text-muted-foreground">{member.userEmail} · {member.role}</p>
							</div>
							{#if member.userId !== data.membership.userId}
								<form method="POST" action="?/revoke">
									<input type="hidden" name="memberUserId" value={member.userId} />
									<Button type="submit" size="sm" variant="outline">Remove</Button>
								</form>
							{/if}
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No members found.</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Pending invites and claims</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if data.invites.length === 0 && data.claims.length === 0}
					<p class="text-sm text-muted-foreground">No pending access activity.</p>
				{:else}
					{#each data.invites as invite}
						<div class="rounded-xl border border-border/70 p-4">
							<p class="font-medium">{invite.email}</p>
							<p class="text-sm text-muted-foreground">Invite role: {invite.role}</p>
						</div>
					{/each}
					{#each data.claims.filter((claim) => claim.status === 'pending') as claim}
						<div class="rounded-xl border border-border/70 p-4">
							<p class="font-medium">{claim.requesterName}</p>
							<p class="text-sm text-muted-foreground">
								Claim pending · {claim.requesterEmail}{#if claim.emailDomain}
									· {claim.emailDomain}{/if}
							</p>
						</div>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
