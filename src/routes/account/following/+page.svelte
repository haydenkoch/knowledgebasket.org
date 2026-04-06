<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<Card.Root class="border-border/70 bg-card/90">
	<Card.Header>
		<Card.Title>Followed organizations</Card.Title>
		<Card.Description>
			Organizations you're tracking for updates and calendar activity.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if data.follows.length === 0}
			<p class="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
				You're not following any organizations yet. Use the follow button on an organization page
				to start.
			</p>
		{:else}
			<ul class="divide-y divide-border/60">
				{#each data.follows as follow}
					<li class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
						<div class="min-w-0">
							<p class="truncate font-medium">{follow.organization.name}</p>
							<p class="text-xs text-muted-foreground">
								Following since {new Date(follow.followedAt).toLocaleDateString()}
							</p>
						</div>
						<Button href={`/o/${follow.organization.slug}`} size="sm" variant="outline">
							View
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>
