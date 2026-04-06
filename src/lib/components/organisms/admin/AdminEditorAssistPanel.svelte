<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import { AlertTriangle, Eye, ExternalLink, FileDiff, Save, Sparkles } from '@lucide/svelte';
	import type { EditorChangeLine } from './editor-support';

	interface Props {
		previewHref?: string | null;
		liveHref?: string | null;
		liveLabel?: string;
		status?: string | null;
		missingFields?: string[];
		hasUnsavedChanges?: boolean;
		validationIssues?: string[];
		changedFields?: EditorChangeLine[];
		submitLabel?: string;
		submitting?: boolean;
		publishedAt?: string | null;
		updatedAt?: string | null;
	}

	let {
		previewHref = null,
		liveHref = null,
		liveLabel = 'View live',
		status = 'draft',
		missingFields = [],
		hasUnsavedChanges = false,
		validationIssues = [],
		changedFields = [],
		submitLabel = 'Save changes',
		submitting = false,
		publishedAt = null,
		updatedAt = null
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header class="gap-3">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<Card.Title>Publishing</Card.Title>
				<Card.Description>
					Keep an eye on readiness, preview access, and the most important editor signals.
				</Card.Description>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if previewHref}
					<Button href={previewHref} target="_blank" rel="noreferrer" variant="outline" size="sm">
						<Eye class="mr-2 h-4 w-4" />
						Open preview
					</Button>
				{/if}
				{#if liveHref}
					<Button href={liveHref} target="_blank" rel="noreferrer" variant="outline" size="sm">
						<ExternalLink class="mr-2 h-4 w-4" />
						{liveLabel}
					</Button>
				{/if}
			</div>
		</div>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="grid gap-3">
			<div
				class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/55 p-4"
			>
				<div
					class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase"
				>
					<Sparkles class="h-4 w-4" />
					Current status
				</div>
				<div class="mt-2 flex flex-wrap items-center gap-2">
					<StatusBadge status={status ?? 'draft'} />
				</div>
				{#if publishedAt || updatedAt}
					<p class="mt-2 text-sm text-[var(--mid)]">
						{#if publishedAt}
							Published {new Date(publishedAt).toLocaleString()}
						{:else if updatedAt}
							Last updated {new Date(updatedAt).toLocaleString()}
						{/if}
					</p>
				{/if}
			</div>

			<div
				class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/55 p-4"
			>
				<div
					class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase"
				>
					<Save class="h-4 w-4" />
					Unsaved changes
				</div>
				<p class="mt-2 text-sm font-medium text-[var(--dark)]">
					{hasUnsavedChanges ? 'You have unsaved edits' : 'All changes are saved'}
				</p>
			</div>

			<div
				class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/55 p-4"
			>
				<div
					class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase"
				>
					<AlertTriangle class="h-4 w-4" />
					Validation
				</div>
				<p class="mt-2 text-sm font-medium text-[var(--dark)]">
					{validationIssues.length === 0
						? 'Ready to save'
						: `${validationIssues.length} item${validationIssues.length === 1 ? '' : 's'} need attention`}
				</p>
			</div>

			<div
				class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/55 p-4"
			>
				<div
					class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase"
				>
					<FileDiff class="h-4 w-4" />
					Change diff
				</div>
				<p class="mt-2 text-sm font-medium text-[var(--dark)]">
					{changedFields.length === 0
						? 'No major field changes yet'
						: `${changedFields.length} major field${changedFields.length === 1 ? '' : 's'} changed`}
				</p>
			</div>
		</div>

		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/90 p-4"
		>
			<p class="text-sm font-semibold text-[var(--dark)]">Completion summary</p>
			{#if missingFields.length === 0}
				<p class="mt-2 text-sm text-[var(--mid)]">
					All essential fields are present for this editor.
				</p>
			{:else}
				<ul class="mt-2 space-y-1 text-sm text-[var(--mid)]">
					{#each missingFields as field}
						<li>Missing: {field}</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if validationIssues.length > 0}
			<div
				class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_72%,white)] p-4"
			>
				<p class="text-sm font-semibold text-[var(--color-flicker-950)]">Fix before saving</p>
				<ul class="mt-2 space-y-1 text-sm text-[var(--color-flicker-950)]">
					{#each validationIssues as issue}
						<li>{issue}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if changedFields.length > 0}
			<div class="space-y-3">
				<p class="text-sm font-semibold text-[var(--dark)]">Major field diff</p>
				<div class="space-y-2">
					{#each changedFields as change}
						<div class="rounded-xl border border-[color:var(--rule)] p-4">
							<p class="text-sm font-semibold text-[var(--dark)]">{change.label}</p>
							<div class="mt-2 grid gap-3 md:grid-cols-2">
								<div>
									<p
										class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase"
									>
										Before
									</p>
									<p class="mt-1 text-sm text-[var(--mid)]">{change.before}</p>
								</div>
								<div>
									<p
										class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase"
									>
										After
									</p>
									<p class="mt-1 text-sm text-[var(--dark)]">{change.after}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="hidden xl:block">
			<Button type="submit" class="w-full" disabled={submitting}>
				{submitting ? 'Saving…' : submitLabel}
			</Button>
		</div>
	</Card.Content>
</Card.Root>
