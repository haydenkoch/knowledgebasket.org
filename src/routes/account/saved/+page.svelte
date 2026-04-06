<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();

	function hrefForBookmark(itemType: string, slug: string | undefined) {
		switch (itemType) {
			case 'event':
				return slug ? `/events/${slug}` : '/events';
			case 'funding':
				return slug ? `/funding/${slug}` : '/funding';
			case 'job':
				return slug ? `/jobs/${slug}` : '/jobs';
			case 'redpage':
				return slug ? `/red-pages/${slug}` : '/red-pages';
			case 'toolbox':
				return slug ? `/toolbox/${slug}` : '/toolbox';
			default:
				return '/';
		}
	}

	function labelForType(itemType: string) {
		return itemType === 'redpage' ? 'red page' : itemType;
	}
</script>

<Card.Root class="border-border/70 bg-card/90">
	<Card.Header>
		<Card.Title>Saved items</Card.Title>
		<Card.Description>
			Bookmarks across events, jobs, funding, directory listings, and resources.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if data.bookmarks.length === 0}
			<p
				class="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground"
			>
				No saved items yet. Use the bookmark button on any listing to keep it handy here.
			</p>
		{:else}
			<ul class="divide-y divide-border/60">
				{#each data.bookmarks as bookmark}
					{#if bookmark.item}
						<li class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
							<div class="min-w-0 flex-1 space-y-1.5">
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant="secondary" class="text-[10px] tracking-wider uppercase">
										{labelForType(bookmark.itemType)}
									</Badge>
									<span class="text-xs text-muted-foreground">
										saved {new Date(bookmark.bookmark.createdAt).toLocaleDateString()}
									</span>
								</div>
								<p class="truncate font-medium">{bookmark.item.title}</p>
							</div>
							<Button
								href={hrefForBookmark(bookmark.itemType, bookmark.item.slug)}
								size="sm"
								variant="outline"
							>
								Open
							</Button>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>
