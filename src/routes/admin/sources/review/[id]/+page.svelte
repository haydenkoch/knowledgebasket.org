<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data } = $props();

	function diffEntries(
		candidate: Record<string, unknown>,
		published: Record<string, unknown> | null
	) {
		const keys = Array.from(
			new Set([...Object.keys(candidate), ...Object.keys(published ?? {})])
		).sort();
		return keys.map((key) => ({
			key,
			candidate: candidate[key] ?? null,
			published: published?.[key] ?? null,
			changed: JSON.stringify(candidate[key] ?? null) !== JSON.stringify(published?.[key] ?? null)
		}));
	}

	let detail = $derived(data.detail);
	let normalized = $derived((detail.candidate.normalizedData ?? {}) as Record<string, unknown>);
	let comparablePublished = $derived(
		(detail.comparablePublishedRecord ?? null) as Record<string, unknown> | null
	);
	let rows = $derived(diffEntries(normalized, comparablePublished));
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Review candidate</h1>
			<p class="text-sm text-muted-foreground">
				{detail.candidate.sourceName} · {detail.candidate.coil} · {detail.candidate.dedupeResult}
			</p>
		</div>
		<Button href="/admin/sources/review" variant="outline">Back to queue</Button>
	</div>

	<div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Candidate snapshot</Card.Title>
				</Card.Header>
				<Card.Content class="grid gap-4 xl:grid-cols-2">
					<div>
						<div class="mb-2 text-sm font-medium">Normalized</div>
						<pre
							class="max-h-[28rem] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(
								detail.candidate.normalizedData,
								null,
								2
							)}</pre>
					</div>
					<div>
						<div class="mb-2 text-sm font-medium">Raw</div>
						<pre
							class="max-h-[28rem] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(
								detail.candidate.rawData,
								null,
								2
							)}</pre>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Match and live record</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="text-sm text-muted-foreground">
						{#if detail.canonical}
							Matched canonical: {detail.canonical.canonicalTitle}
						{:else}
							No canonical record attached yet
						{/if}
					</div>
					{#if comparablePublished}
						<div class="overflow-x-auto rounded-md border">
							<table class="min-w-full text-sm">
								<thead class="bg-muted/50">
									<tr>
										<th class="px-3 py-2 text-left">Field</th>
										<th class="px-3 py-2 text-left">Candidate</th>
										<th class="px-3 py-2 text-left">Published</th>
									</tr>
								</thead>
								<tbody>
									{#each rows as row}
										<tr class={row.changed ? 'bg-amber-50/60' : ''}>
											<td class="border-t px-3 py-2 font-medium">{row.key}</td>
											<td class="border-t px-3 py-2 align-top text-xs"
												>{JSON.stringify(row.candidate)}</td
											>
											<td class="border-t px-3 py-2 align-top text-xs"
												>{JSON.stringify(row.published)}</td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
							No published record is linked yet.
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Decision</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if detail.suggestedMatches.length > 0}
						<form method="POST" action="?/resolveMatch" class="space-y-3 rounded-md border p-3">
							<div class="text-sm font-medium">Attach to an existing canonical record</div>
							<NativeSelect.Root
								name="matchedCanonicalId"
								value={detail.candidate.matchedCanonicalId ?? ''}
							>
								<NativeSelect.Option value="">Choose a match</NativeSelect.Option>
								{#each detail.suggestedMatches as match}
									<NativeSelect.Option value={match.id}>{match.canonicalTitle}</NativeSelect.Option>
								{/each}
							</NativeSelect.Root>
							<Textarea name="reviewNotes" rows={2} placeholder="Notes for this match decision" />
							<Button type="submit" variant="outline" class="w-full">Attach match</Button>
						</form>
					{/if}

					<form method="POST" action="?/approveAsNew" class="space-y-3 rounded-md border p-3">
						<div class="text-sm font-medium">Approve as new</div>
						<Textarea name="reviewNotes" rows={2} placeholder="Optional approval notes" />
						<Button type="submit" class="w-full">Publish new record</Button>
					</form>

					<form method="POST" action="?/approveAsUpdate" class="space-y-3 rounded-md border p-3">
						<div class="text-sm font-medium">Approve as update</div>
						{#if detail.suggestedMatches.length > 0}
							<NativeSelect.Root
								name="matchedCanonicalId"
								value={detail.candidate.matchedCanonicalId ?? ''}
							>
								<NativeSelect.Option value="">Use current match</NativeSelect.Option>
								{#each detail.suggestedMatches as match}
									<NativeSelect.Option value={match.id}>{match.canonicalTitle}</NativeSelect.Option>
								{/each}
							</NativeSelect.Root>
						{/if}
						<Textarea
							name="reviewNotes"
							rows={2}
							placeholder="What should change on the live record?"
						/>
						<Button type="submit" variant="secondary" class="w-full">Publish update</Button>
					</form>

					<form method="POST" action="?/needsInfo" class="space-y-3 rounded-md border p-3">
						<div class="text-sm font-medium">Needs info</div>
						<Textarea name="reviewNotes" rows={2} placeholder="What’s missing or unclear?" />
						<Button type="submit" variant="outline" class="w-full">Mark needs info</Button>
					</form>

					<form method="POST" action="?/reject" class="space-y-3 rounded-md border p-3">
						<div class="text-sm font-medium">Reject</div>
						<NativeSelect.Root name="rejectionReason">
							<NativeSelect.Option value="duplicate">Duplicate</NativeSelect.Option>
							<NativeSelect.Option value="irrelevant">Irrelevant</NativeSelect.Option>
							<NativeSelect.Option value="expired">Expired</NativeSelect.Option>
							<NativeSelect.Option value="low_quality">Low quality</NativeSelect.Option>
							<NativeSelect.Option value="inaccurate">Inaccurate</NativeSelect.Option>
							<NativeSelect.Option value="incomplete">Incomplete</NativeSelect.Option>
							<NativeSelect.Option value="out_of_scope">Out of scope</NativeSelect.Option>
							<NativeSelect.Option value="spam">Spam</NativeSelect.Option>
							<NativeSelect.Option value="other">Other</NativeSelect.Option>
						</NativeSelect.Root>
						<Textarea name="reviewNotes" rows={2} placeholder="Rejection notes" />
						<Button type="submit" variant="destructive" class="w-full">Reject candidate</Button>
					</form>

					<form method="POST" action="?/archive" class="space-y-3 rounded-md border p-3">
						<div class="text-sm font-medium">Archive</div>
						<Textarea name="reviewNotes" rows={2} placeholder="Archive notes" />
						<Button type="submit" variant="outline" class="w-full">Archive candidate</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
