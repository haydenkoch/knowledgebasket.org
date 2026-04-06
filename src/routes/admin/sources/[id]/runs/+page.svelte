<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type {
		IngestionPreviewResult,
		IngestionResult,
		NormalizedRecord,
		PreviewCandidate
	} from '$lib/server/ingestion/types';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import HealthBadge from '$lib/components/organisms/admin/HealthBadge.svelte';
	import CollapsibleDebug from '$lib/components/organisms/admin/CollapsibleDebug.svelte';
	import CandidateFieldCard from '$lib/components/organisms/admin/CandidateFieldCard.svelte';
	import { timeAgo } from '$lib/admin/labels.js';
	import { ArrowLeft, ArrowRight, Play, RefreshCw, TestTube2 } from '@lucide/svelte';
	import type { PageData } from './$types';

	type SourceRunsForm = {
		error?: string;
		previewMode?: 'test' | 'import';
		preview?: IngestionPreviewResult;
		importResult?: IngestionResult;
		runResult?: {
			success: boolean;
			batchId: string | null;
			fetchLogId: string | null;
			candidatesCreated: number;
			autoApprovedCount: number;
			error: string | null;
		};
	};
	type SourceRunEntry = PageData['sourceRuns'][number];

	let { data, form } = $props<{ data: PageData; form?: SourceRunsForm }>();

	function enhanceToast(message: string): SubmitFunction {
		return () => {
			return async ({ result, update }) => {
				if (result.type === 'success') toast.success(message);
				else if (result.type === 'failure')
					toast.error((result.data as { error?: string })?.error ?? 'Action failed');
				await update();
			};
		};
	}

	const currentResult = $derived(
		(form?.preview ?? form?.importResult ?? null) as IngestionPreviewResult | IngestionResult | null
	);

	function previewTitle(entry: unknown) {
		const record = entry as Record<string, unknown>;
		const title = record.title;
		return typeof title === 'string' && title.trim() ? title : 'Untitled candidate';
	}

	function confidenceScore(value: unknown): number | null {
		if (!value || typeof value !== 'object') return null;
		const overall = Number((value as { overall?: unknown }).overall ?? NaN);
		return Number.isFinite(overall) ? overall : null;
	}

	function previewDedupeLabel(candidate: PreviewCandidate) {
		return candidate.dedupe.result.replace(/_/g, ' ');
	}

	function candidateRecord(entry: NormalizedRecord): Record<string, unknown> {
		return entry as unknown as Record<string, unknown>;
	}

	function stageIssueCount(run: {
		stages?: Array<{ status: string; warnings?: unknown; errors?: unknown }>;
	}) {
		return (run.stages ?? []).filter((stage) => {
			const hasWarnings = Array.isArray(stage.warnings) && stage.warnings.length > 0;
			const hasErrors = Array.isArray(stage.errors) && stage.errors.length > 0;
			return stage.status !== 'success' || hasWarnings || hasErrors;
		}).length;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-2xl font-bold">{data.source.name}</h1>
				<StatusBadge status={data.source.status} />
				<HealthBadge health={data.source.healthStatus} />
			</div>
			<p class="mt-2 max-w-3xl text-sm text-[var(--mid)]">
				Test the source, run imports, retry failed runs, and inspect recent history without mixing
				those operational tasks into the configuration page.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/sources/${data.source.id}`} variant="outline">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to config
			</Button>
			<Button href={`/admin/sources/review?sourceId=${data.source.id}`} variant="secondary">
				Review imported items
			</Button>
		</div>
	</div>

	{#if form?.error}
		<div class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{form.error}
		</div>
	{/if}

	{#if form?.runResult}
		<div
			class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-lakebed-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_70%,white)] px-5 py-4 text-sm"
		>
			<div class="font-semibold text-[var(--color-lakebed-900)]">
				{form.runResult.success ? 'Retry run completed' : 'Retry run failed'}
			</div>
			<div class="mt-1 text-[var(--color-lakebed-800)]">
				{form.runResult.candidatesCreated} new item{form.runResult.candidatesCreated !== 1
					? 's'
					: ''} found ·
				{form.runResult.autoApprovedCount} auto-approved
			</div>
			{#if form.runResult.error}
				<div class="mt-2 text-[var(--color-ember-700)]">{form.runResult.error}</div>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Recent fetches
			</div>
			<div class="mt-1 text-sm font-medium">{data.fetchLogs.length}</div>
			<div class="mt-1 text-xs text-[var(--mid)]">Latest operational attempts</div>
		</div>
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Runs tracked
			</div>
			<div class="mt-1 text-sm font-medium">{data.sourceRuns.length}</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.sourceRuns.filter((run: SourceRunEntry) => stageIssueCount(run) > 0).length} with warnings
				or errors
			</div>
		</div>
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Imported batches
			</div>
			<div class="mt-1 text-sm font-medium">{data.batches.length}</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.batchQualitySummary.totalNew} new · {data.batchQualitySummary.totalUpdated} updates
			</div>
		</div>
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Review queue
			</div>
			<div class="mt-1 text-sm font-medium">{data.candidates.length} recent candidates</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.candidateOutcomeSummary.pending} pending review
			</div>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Run actions</Card.Title>
			<Card.Description
				>Operational actions are grouped here so config changes stay separate.</Card.Description
			>
		</Card.Header>
		<Card.Content class="flex flex-wrap gap-2">
			<form
				method="POST"
				action="?/testSource"
				use:enhance={enhanceToast('Source preview refreshed')}
			>
				<Button type="submit">
					<TestTube2 class="mr-2 h-4 w-4" />
					Test source
				</Button>
			</form>
			<form method="POST" action="?/runImport" use:enhance={enhanceToast('Import run completed')}>
				<Button type="submit" variant="secondary">
					<Play class="mr-2 h-4 w-4" />
					Run import
				</Button>
			</form>
			<form method="POST" action="?/retrySource" use:enhance={enhanceToast('Retry run completed')}>
				<Button type="submit" variant="outline">
					<RefreshCw class="mr-2 h-4 w-4" />
					Retry now
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if currentResult}
		<Card.Root>
			<Card.Header>
				<Card.Title
					>{form?.previewMode === 'import' ? 'Import result' : 'Preview result'}</Card.Title
				>
				<Card.Description>
					Inspect candidate output before leaving this page for review.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 md:grid-cols-4">
					<div class="rounded-lg border border-[color:var(--rule)] p-3 text-sm">
						<div class="text-[11px] font-semibold text-[var(--mid)] uppercase">New</div>
						<div class="mt-1 font-medium">{currentResult.dedupeCounts.new}</div>
					</div>
					<div class="rounded-lg border border-[color:var(--rule)] p-3 text-sm">
						<div class="text-[11px] font-semibold text-[var(--mid)] uppercase">Updates</div>
						<div class="mt-1 font-medium">{currentResult.dedupeCounts.update}</div>
					</div>
					<div class="rounded-lg border border-[color:var(--rule)] p-3 text-sm">
						<div class="text-[11px] font-semibold text-[var(--mid)] uppercase">Duplicates</div>
						<div class="mt-1 font-medium">{currentResult.dedupeCounts.duplicate}</div>
					</div>
					<div class="rounded-lg border border-[color:var(--rule)] p-3 text-sm">
						<div class="text-[11px] font-semibold text-[var(--mid)] uppercase">Ambiguous</div>
						<div class="mt-1 font-medium">{currentResult.dedupeCounts.ambiguous}</div>
					</div>
				</div>

				{#if currentResult.candidates?.length}
					<div class="space-y-3">
						{#each currentResult.candidates.slice(0, 6) as candidate}
							<div class="rounded-xl border border-[color:var(--rule)] p-4">
								<div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
									<div>
										<p class="font-semibold text-[var(--dark)]">
											{previewTitle(candidate.normalizedData)}
										</p>
										<p class="text-sm text-[var(--mid)]">
											{previewDedupeLabel(
												candidate
											)}{#if confidenceScore(candidate.confidence) !== null}
												· confidence {(confidenceScore(candidate.confidence) ?? 0).toFixed(2)}
											{/if}
										</p>
									</div>
									<Button
										href={`/admin/sources/review?sourceId=${data.source.id}`}
										size="sm"
										variant="outline"
									>
										Review queue
										<ArrowRight class="ml-2 h-3.5 w-3.5" />
									</Button>
								</div>
								<div class="mt-3">
									<CandidateFieldCard data={candidateRecord(candidate.normalizedData)} />
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<CollapsibleDebug label="Raw preview payload" data={currentResult} />
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent runs</Card.Title>
				<Card.Description>Execution history with stage-level warnings and errors.</Card.Description>
			</Card.Header>
			<Card.Content class="overflow-x-auto">
				<Table.Root class="min-w-[720px]">
					<Table.Header>
						<Table.Row>
							<Table.Head>Started</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Trigger</Table.Head>
							<Table.Head>Issues</Table.Head>
							<Table.Head>Summary</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.sourceRuns as run}
							<Table.Row>
								<Table.Cell class="text-sm text-[var(--mid)]"
									>{run.startedAt ? timeAgo(run.startedAt) : 'Unknown'}</Table.Cell
								>
								<Table.Cell><StatusBadge status={run.status ?? 'unknown'} /></Table.Cell>
								<Table.Cell class="text-sm text-[var(--mid)]"
									>{run.trigger ?? 'scheduler'}</Table.Cell
								>
								<Table.Cell class="text-sm text-[var(--mid)]">{stageIssueCount(run)}</Table.Cell>
								<Table.Cell class="text-sm text-[var(--mid)]">
									{run.totalCandidates ?? 0} candidates · {run.autoApprovedCount ?? 0} auto-approved
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground"
									>No runs yet</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Recent fetch logs</Card.Title>
				<Card.Description>Latest fetch outcomes for this source.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each data.fetchLogs as log}
					<div class="rounded-lg border border-[color:var(--rule)] p-3 text-sm">
						<div class="flex items-center justify-between gap-3">
							<div class="font-medium text-[var(--dark)]">{log.status}</div>
							<div class="text-xs text-[var(--mid)]">{timeAgo(log.createdAt)}</div>
						</div>
						<div class="mt-1 text-[var(--mid)]">
							HTTP {log.httpStatusCode ?? '—'} · {log.responseTimeMs ?? '—'}ms
						</div>
						{#if log.errorCategory || log.errorMessage}
							<div class="mt-1 text-[var(--color-ember-700)]">
								{log.errorCategory ?? 'Error'}{#if log.errorMessage}: {log.errorMessage}{/if}
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-[var(--mid)]">No fetch logs yet.</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recent candidates</Card.Title>
			<Card.Description>The latest normalized rows linked to this source.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#each data.candidates as candidate}
				<div class="rounded-lg border border-[color:var(--rule)] p-3">
					<div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<div class="font-medium text-[var(--dark)]">
								{typeof candidate.normalizedData === 'object' && candidate.normalizedData
									? previewTitle(candidate.normalizedData)
									: candidate.sourceItemId}
							</div>
							<div class="text-sm text-[var(--mid)]">
								{candidate.status.replace(/_/g, ' ')} · {candidate.dedupeResult.replace(/_/g, ' ')}
							</div>
						</div>
						<Button href={`/admin/sources/review/${candidate.id}`} size="sm" variant="outline">
							Open candidate
						</Button>
					</div>
				</div>
			{:else}
				<p class="text-sm text-[var(--mid)]">No candidates yet.</p>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
