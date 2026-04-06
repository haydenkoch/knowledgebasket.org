<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		createdAt?: string | null;
		submitterName?: string | null;
		submitterEmail?: string | null;
		contactName?: string | null;
		contactEmail?: string | null;
		contactPhone?: string | null;
	}

	let {
		createdAt = null,
		submitterName = null,
		submitterEmail = null,
		contactName = null,
		contactEmail = null,
		contactPhone = null
	}: Props = $props();

	const hasSubmissionContext = $derived(
		Boolean(
			createdAt || submitterName || submitterEmail || contactName || contactEmail || contactPhone
		)
	);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Submission context</Card.Title>
		<Card.Description
			>Saved public-submission details and moderation handoff context.</Card.Description
		>
	</Card.Header>
	<Card.Content class="space-y-2 text-sm">
		{#if hasSubmissionContext}
			{#if createdAt}
				<p>
					Submitted on
					<span class="font-medium">{new Date(createdAt).toLocaleString()}</span>
				</p>
			{/if}
			{#if submitterName || submitterEmail}
				<p>
					Submitted by
					<span class="font-medium">{submitterName ?? submitterEmail}</span>
				</p>
			{/if}
			{#if contactName || contactEmail || contactPhone}
				<div
					class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/45 p-3"
				>
					<p class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
						Public contact
					</p>
					<div class="mt-2 space-y-1">
						{#if contactName}
							<p>{contactName}</p>
						{/if}
						{#if contactEmail}
							<p>
								<a class="text-[var(--teal)] hover:underline" href={`mailto:${contactEmail}`}>
									{contactEmail}
								</a>
							</p>
						{/if}
						{#if contactPhone}
							<p>{contactPhone}</p>
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<p class="text-[var(--mid)]">No public submission metadata is stored for this record.</p>
		{/if}
	</Card.Content>
</Card.Root>
