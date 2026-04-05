<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { User } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Account | KB Admin</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
	<h1 class="text-2xl font-bold">Account</h1>

	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					{#if data.user?.image}
						<img src={data.user.image} alt="" class="h-12 w-12 rounded-full object-cover" />
					{:else}
						<User class="h-6 w-6 text-muted-foreground" />
					{/if}
				</div>
				<div>
					<Card.Title>{data.user?.name ?? 'User'}</Card.Title>
					<Card.Description>{data.user?.email}</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			<dl class="grid gap-2 text-sm">
				<div>
					<dt class="text-muted-foreground">Name</dt>
					<dd class="font-medium">{data.user?.name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Email</dt>
					<dd class="font-medium">{data.user?.email ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Role</dt>
					<dd class="font-medium">
						{data.user?.role === 'admin'
							? 'Administrator — full access to all settings and content'
							: data.user?.role === 'moderator'
								? 'Moderator — can review and publish content'
								: data.user?.role === 'contributor'
									? 'Contributor — can submit content for review'
									: (data.user?.role ?? '—')}
					</dd>
				</div>
			</dl>
		</Card.Content>
	</Card.Root>
</div>
