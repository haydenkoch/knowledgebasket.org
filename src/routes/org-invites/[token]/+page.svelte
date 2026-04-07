<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Organization invite | Knowledge Basket</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Organization invite</Card.Title>
			<Card.Description>
				You were invited to join {data.organizationName} as an {data.invite.role}.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">
				This invite is for {data.invite.email}. Accepting it will activate workspace access on this
				account.
			</p>
			<form method="POST" action="?/accept">
				<Button type="submit">Accept invite</Button>
			</form>
		</Card.Content>
	</Card.Root>
</section>
