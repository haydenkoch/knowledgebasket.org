<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Clock, CheckCircle, XCircle, AlertTriangle, List, FileDown, Copy } from '@lucide/svelte';

	let { data } = $props();

	const statusCards = [
		{ label: 'Pending', key: 'pending', icon: Clock, color: 'text-amber-600 bg-amber-50' },
		{
			label: 'Published',
			key: 'published',
			icon: CheckCircle,
			color: 'text-green-600 bg-green-50'
		},
		{ label: 'Rejected', key: 'rejected', icon: XCircle, color: 'text-red-600 bg-red-50' },
		{
			label: 'Cancelled',
			key: 'cancelled',
			icon: AlertTriangle,
			color: 'text-muted-foreground bg-muted'
		}
	];

	const quickLinks = [
		{
			href: '/admin/events',
			label: 'Manage Events',
			description: 'Review, edit, approve/reject events',
			icon: List
		},
		{
			href: '/admin/events/import',
			label: 'Import iCal',
			description: 'Import from iCal feeds',
			icon: FileDown
		},
		{
			href: '/admin/events/duplicates',
			label: 'Find Duplicates',
			description: 'Detect and merge duplicate events',
			icon: Copy
		}
	];
</script>

<div class="space-y-8">
	<h1 class="text-2xl font-bold">Dashboard</h1>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each statusCards as card}
			<a
				href="/admin/events?status={card.key}"
				class="block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Card.Root>
					<Card.Content class="flex flex-row items-center gap-3 pt-6">
						<div class="rounded-md p-2 {card.color}">
							<card.icon class="h-5 w-5" />
						</div>
						<div>
							<p class="text-sm text-muted-foreground">{card.label}</p>
							<p class="text-2xl font-bold">{data.counts[card.key] ?? 0}</p>
						</div>
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>

	<Separator />

	{#if data.recentPending?.length > 0}
		<div>
			<h2 class="mb-4 text-lg font-semibold">Recent pending</h2>
			<Card.Root>
				<Card.Content class="pt-6">
					<ul class="space-y-2 text-sm">
						{#each data.recentPending as event}
							<li class="flex items-center justify-between gap-2">
								<a
									href="/admin/events/{event.id}"
									class="truncate font-medium text-primary hover:underline">{event.title}</a
								>
								<span class="shrink-0 text-muted-foreground">
									{#if event.createdAt}
										{new Date(event.createdAt).toLocaleDateString()}
									{:else}
										—
									{/if}
								</span>
							</li>
						{/each}
					</ul>
					<a
						href="/admin/events?status=pending"
						class="mt-3 inline-block text-sm font-medium text-primary hover:underline"
						>View all pending →</a
					>
				</Card.Content>
			</Card.Root>
		</div>
		<Separator />
	{/if}

	<div>
		<h2 class="mb-4 text-lg font-semibold">Quick actions</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each quickLinks as link}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header>
						<link.icon class="mb-2 h-6 w-6 text-muted-foreground" />
						<Card.Title>{link.label}</Card.Title>
						<Card.Description>{link.description}</Card.Description>
					</Card.Header>
					<Card.Footer>
						<Button href={link.href} variant="secondary" class="w-full justify-start">
							<link.icon class="mr-2 h-4 w-4" />
							Open
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>
</div>
