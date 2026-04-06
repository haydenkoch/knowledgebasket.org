<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { BadgeVariant } from '$lib/components/ui/badge/index.js';

	let { data } = $props();

	function statusVariant(status: string): BadgeVariant {
		switch (status) {
			case 'approved':
				return 'default';
			case 'rejected':
				return 'destructive';
			default:
				return 'secondary';
		}
	}
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<Card.Title>Managed organizations</Card.Title>
			<Card.Description>Approved memberships attached to your account.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.organizations.length === 0}
				<p class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
					No active organization memberships yet. Claim one from its public organization page to get
					started.
				</p>
			{:else}
				<ul class="divide-y divide-border/60">
					{#each data.organizations as membership}
						<li class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
							<div class="min-w-0">
								<p class="truncate font-medium">{membership.organization.name}</p>
								<p class="mt-1">
									<Badge variant="secondary" class="text-[10px] tracking-wider uppercase">
										{membership.role}
									</Badge>
								</p>
							</div>
							<Button href={`/orgs/${membership.organization.slug}`} size="sm" variant="outline">
								Manage
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<Card.Title>Claim requests</Card.Title>
			<Card.Description>Claims you've submitted for review.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.claims.length === 0}
				<p class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
					You haven't submitted any organization claims yet.
				</p>
			{:else}
				<ul class="space-y-3">
					{#each data.claims as claim}
						<li class="rounded-lg border border-border/70 bg-background p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate font-medium">{claim.organization.name}</p>
									{#if claim.emailDomain}
										<p class="mt-0.5 text-xs text-muted-foreground">domain · {claim.emailDomain}</p>
									{/if}
								</div>
								<Badge
									variant={statusVariant(claim.status)}
									class="text-[10px] tracking-wider uppercase"
								>
									{claim.status}
								</Badge>
							</div>
							{#if claim.reviewNotes}
								<p class="mt-3 text-sm leading-6 text-muted-foreground">{claim.reviewNotes}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
