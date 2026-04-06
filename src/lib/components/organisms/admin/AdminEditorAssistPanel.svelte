<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertTriangle, Eye, FileDiff, Save } from '@lucide/svelte';
	import type { EditorChangeLine } from './editor-support';

	interface Props {
		previewHref?: string | null;
		hasUnsavedChanges?: boolean;
		validationIssues?: string[];
		changedFields?: EditorChangeLine[];
	}

	let {
		previewHref = null,
		hasUnsavedChanges = false,
		validationIssues = [],
		changedFields = []
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header class="gap-3">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<Card.Title>Editor status</Card.Title>
				<Card.Description>
					Review validation, unsaved edits, and major field changes before saving.
				</Card.Description>
			</div>
			{#if previewHref}
				<Button href={previewHref} target="_blank" rel="noreferrer" variant="outline" size="sm">
					<Eye class="mr-2 h-4 w-4" />
					Open preview
				</Button>
			{/if}
		</div>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="grid gap-3 md:grid-cols-3">
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
	</Card.Content>
</Card.Root>
