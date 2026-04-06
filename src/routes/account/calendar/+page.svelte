<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let { data } = $props();
	let copied = $state(false);

	async function copyFeed() {
		try {
			await navigator.clipboard.writeText(data.feedUrl);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			/* noop */
		}
	}
</script>

<Card.Root class="border-border/70 bg-card/90">
	<Card.Header>
		<Card.Title>Personal calendar feed</Card.Title>
		<Card.Description>
			Subscribe in Google, Apple, or Outlook Calendar to see followed-organization events and your
			saved event picks in one place.
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		<div class="space-y-2">
			<label class="text-sm font-medium" for="feedUrl">Subscription URL</label>
			<div class="flex flex-col gap-2 sm:flex-row">
				<Input id="feedUrl" readonly value={data.feedUrl} class="font-mono text-xs" />
				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={copyFeed}>
						{#if copied}
							<Check class="size-4" />
							Copied
						{:else}
							<Copy class="size-4" />
							Copy
						{/if}
					</Button>
					<Button href={data.feedUrl} target="_blank" rel="noopener" variant="outline">
						<ExternalLink class="size-4" />
						Open
					</Button>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-border/70 bg-muted/30 p-5">
			<p class="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
				How to subscribe
			</p>
			<ol class="mt-3 space-y-2 text-sm leading-6 text-foreground">
				<li><span class="text-muted-foreground">1.</span> Copy the URL above.</li>
				<li>
					<span class="text-muted-foreground">2.</span>
					In your calendar app choose <strong class="font-semibold">Add calendar by URL</strong>.
				</li>
				<li>
					<span class="text-muted-foreground">3.</span>
					Paste the URL — events refresh automatically.
				</li>
			</ol>
		</div>

		<form method="POST" action="?/rotateToken">
			<Button type="submit" variant="outline">
				<RefreshCw class="size-4" />
				Rotate feed token
			</Button>
		</form>

		<Alert>
			<TriangleAlert class="size-4" />
			<AlertTitle>Rotation is immediate</AlertTitle>
			<AlertDescription>
				Rotating the token invalidates the old URL right away. Anywhere that uses it will need the
				new link.
			</AlertDescription>
		</Alert>
	</Card.Content>
</Card.Root>
