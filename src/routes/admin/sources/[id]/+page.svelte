<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { IngestionPreviewResult, IngestionResult } from '$lib/server/ingestion/types';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Plus, Trash2 } from '@lucide/svelte';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import HealthBadge from '$lib/components/organisms/admin/HealthBadge.svelte';
	import CandidateFieldCard from '$lib/components/organisms/admin/CandidateFieldCard.svelte';
	import CollapsibleDebug from '$lib/components/organisms/admin/CollapsibleDebug.svelte';
	import { friendly, ingestionLabel, dedupeLabel, priorityLabel } from '$lib/admin/labels.js';

	type SourceDetailForm = {
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

	let { data, form } = $props<{ data: App.PageData; form?: SourceDetailForm }>();

	let tags = $state<Array<{ tagKey: string; tagValue: string }>>([]);

	$effect(() => {
		tags =
			data.tags.length > 0
				? data.tags.map((tag: { tagKey: string; tagValue: string }) => ({
						tagKey: tag.tagKey,
						tagValue: tag.tagValue
					}))
				: [{ tagKey: '', tagValue: '' }];
	});

	const coilOptions = [
		{ value: 'events', label: 'Events' },
		{ value: 'funding', label: 'Funding' },
		{ value: 'jobs', label: 'Jobs' },
		{ value: 'red_pages', label: 'Red Pages' },
		{ value: 'toolbox', label: 'Toolbox' }
	] as const;

	const dedupeOptions = [
		{ value: 'url_match', label: 'URL match' },
		{ value: 'title_fuzzy', label: 'Title fuzzy' },
		{ value: 'composite_key', label: 'Composite key' },
		{ value: 'content_hash', label: 'Content hash' },
		{ value: 'external_id', label: 'External ID' }
	] as const;

	function addTag() {
		tags = [...tags, { tagKey: '', tagValue: '' }];
	}

	function removeTag(index: number) {
		tags = tags.filter((_, i) => i !== index);
		if (tags.length === 0) tags = [{ tagKey: '', tagValue: '' }];
	}

	function formatDateTimeLocal(value?: Date | null) {
		return value ? value.toISOString().slice(0, 16) : '';
	}

	function badgeClass(value: string) {
		const lookup: Record<string, string> = {
			active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
			healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
			discovered: 'border-sky-200 bg-sky-50 text-sky-700',
			configuring: 'border-sky-200 bg-sky-50 text-sky-700',
			manual_only: 'border-indigo-200 bg-indigo-50 text-indigo-700',
			new: 'border-emerald-200 bg-emerald-50 text-emerald-700',
			update: 'border-sky-200 bg-sky-50 text-sky-700',
			duplicate: 'border-slate-200 bg-slate-50 text-slate-600',
			ambiguous: 'border-amber-200 bg-amber-50 text-amber-700',
			paused: 'border-amber-200 bg-amber-50 text-amber-700',
			degraded: 'border-amber-200 bg-amber-50 text-amber-700',
			stale: 'border-orange-200 bg-orange-50 text-orange-700',
			unhealthy: 'border-rose-200 bg-rose-50 text-rose-700',
			broken: 'border-rose-200 bg-rose-50 text-rose-700',
			auth_required: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
			deprecated: 'border-slate-200 bg-slate-50 text-slate-600',
			disabled: 'border-slate-200 bg-slate-50 text-slate-600',
			unknown: 'border-slate-200 bg-slate-50 text-slate-600'
		};
		return lookup[value] ?? 'border-slate-200 bg-slate-50 text-slate-600';
	}

	let currentResult = $derived(
		(form?.preview ?? form?.importResult ?? null) as IngestionPreviewResult | IngestionResult | null
	);

	function isImportResult(
		result: IngestionPreviewResult | IngestionResult | null
	): result is IngestionResult {
		return Boolean(result && 'batchId' in result);
	}

	function previewTitle(entry: unknown) {
		const record = entry as Record<string, unknown>;
		const title = record.title;
		return typeof title === 'string' && title.trim() ? title : 'Untitled candidate';
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div>
			<h1 class="text-2xl font-bold">{data.source.name}</h1>
			<div class="mt-2 flex flex-wrap gap-2">
				<StatusBadge status={data.source.status} />
				<HealthBadge health={data.source.healthStatus} />
				<span class="inline-flex items-center rounded-full border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--mid)] uppercase">
					{data.source.enabled ? 'Enabled' : 'Disabled'}
				</span>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			<form
				method="POST"
				action="?/testSource"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Source preview refreshed');
						else if (result.type === 'failure')
							toast.error((result.data as { error?: string })?.error ?? 'Preview failed');
						await update();
					};
				}}
			>
				<Button type="submit">Test source</Button>
			</form>
			<form
				method="POST"
				action="?/runImport"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Import run completed');
						else if (result.type === 'failure')
							toast.error((result.data as { error?: string })?.error ?? 'Import failed');
						await update();
					};
				}}
			>
				<Button type="submit" variant="secondary">Run import</Button>
			</form>
			<form
				method="POST"
				action="?/retrySource"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Retry run completed');
						else if (result.type === 'failure')
							toast.error((result.data as { error?: string })?.error ?? 'Retry failed');
						await update();
					};
				}}
			>
				<Button type="submit" variant="outline">Retry now</Button>
			</form>
			<form
				method="POST"
				action="?/resumeSource"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Source resumed');
						await update();
					};
				}}
			>
				<Button type="submit" variant="outline">Resume</Button>
			</form>
			<form
				method="POST"
				action="?/pauseSource"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Source paused');
						await update();
					};
				}}
				class="flex gap-2"
			>
				<Input name="pauseReason" placeholder="Pause reason" class="w-48" />
				<Button type="submit" variant="outline">Pause</Button>
			</form>
			<form
				method="POST"
				action="?/disableSource"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Source disabled');
						await update();
					};
				}}
			>
				<Button type="submit" variant="outline">Disable</Button>
			</form>
			<form
				method="POST"
				action="?/deprecateSource"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toast.success('Source deprecated');
						await update();
					};
				}}
			>
				<Button type="submit" variant="outline">Deprecate</Button>
			</form>
		</div>
	</div>

	{#if form?.error}
		<div class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{form.error}
		</div>
	{/if}

	{#if form?.runResult}
		<div class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-lakebed-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_70%,white)] px-5 py-4 text-sm">
			<div class="font-semibold text-[var(--color-lakebed-900)]">{form.runResult.success ? 'Run completed' : 'Run failed'}</div>
			<div class="mt-1 text-[var(--color-lakebed-800)]">
				{form.runResult.candidatesCreated} new item{form.runResult.candidatesCreated !== 1 ? 's' : ''} found ·
				{form.runResult.autoApprovedCount} auto-approved
			</div>
			{#if form.runResult.error}
				<div class="mt-2 text-[var(--color-ember-700)]">{form.runResult.error}</div>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4">
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">Setup</div>
			<div class="mt-1 text-sm font-medium">
				{data.validation.valid ? 'Ready to run' : 'Needs attention'}
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.validation.adapterDisplayName ?? friendly(ingestionLabel, data.source.adapterType) ?? 'No import method set'}
			</div>
		</div>
		<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4">
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">Items imported</div>
			<div class="mt-1 text-sm font-medium">
				{data.batchQualitySummary.totalNew} new · {data.batchQualitySummary.totalUpdated} updates
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.batchQualitySummary.totalDuplicate} duplicates · {data.batchQualitySummary.totalFailed} failed
			</div>
		</div>
		<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4">
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">Published</div>
			<div class="mt-1 text-sm font-medium">
				{data.candidateOutcomeSummary.approved + data.candidateOutcomeSummary.autoApproved} approved
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.candidateOutcomeSummary.pending} pending · {data.candidateOutcomeSummary.rejected} rejected
			</div>
		</div>
		<div class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4">
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">Error types</div>
			<div class="mt-1 text-sm font-medium">{Object.keys(data.errorPatterns).length}</div>
			<div class="mt-1 text-xs text-[var(--mid)]">Distinct error patterns seen</div>
		</div>
	</div>

	{#if !data.validation.valid || data.validation.warnings.length > 0}
		<div class="rounded-xl border border-[color:color-mix(in_srgb,var(--color-flicker-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_60%,white)] p-4 text-sm text-[var(--color-flicker-900)]">
			<div class="font-medium">Configuration issue</div>
			{#if data.validation.errors.length > 0}
				<div class="mt-2 space-y-1">
					{#each data.validation.errors as message}
						<div>{message}</div>
					{/each}
				</div>
			{/if}
			{#if data.validation.warnings.length > 0}
				<div class="mt-2 space-y-1 text-amber-800">
					{#each data.validation.warnings as message}
						<div>{message}</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if currentResult}
		{@const result = currentResult}
		<Card.Root>
			<Card.Header>
				<Card.Title
					>{form?.previewMode === 'import'
						? 'Latest import result'
						: 'Latest test preview'}</Card.Title
				>
				<Card.Description>
					Fetch, parse, normalize, and dedupe output for this source.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<div class="rounded-md border p-3">
						<div class="text-xs tracking-wide text-muted-foreground uppercase">Fetch</div>
						<div class="mt-1 text-sm font-medium">{result.fetchResult.status}</div>
						<div class="text-xs text-muted-foreground">
							{result.fetchResult.httpStatusCode ?? 'No HTTP status'} · {result.fetchResult
								.responseTimeMs} ms
						</div>
					</div>
					<div class="rounded-md border p-3">
						<div class="text-xs tracking-wide text-muted-foreground uppercase">Parsed items</div>
						<div class="mt-1 text-sm font-medium">{result.parseResult?.totalFound ?? 0}</div>
					</div>
					<div class="rounded-md border p-3">
						<div class="text-xs tracking-wide text-muted-foreground uppercase">
							Normalized records
						</div>
						<div class="mt-1 text-sm font-medium">
							{result.normalizeResult?.records.length ?? 0}
						</div>
					</div>
					<div class="rounded-md border p-3">
						<div class="text-xs tracking-wide text-muted-foreground uppercase">
							Queued candidates
						</div>
						<div class="mt-1 text-sm font-medium">
							{result.candidates.filter((candidate) => candidate.dedupe.result !== 'duplicate')
								.length}
						</div>
					</div>
				</div>

				<div class="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
					<div class="space-y-4">
						<div class="rounded-md border p-3">
							<div class="text-sm font-medium">Dedupe summary</div>
							<div class="mt-2 grid gap-2 text-sm">
								{#each Object.entries(result.dedupeCounts) as [key, count]}
									<div class="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
										<span>{key}</span>
										<span class="font-medium">{count}</span>
									</div>
								{/each}
							</div>
						</div>

						{#if result.parseResult?.errors?.length || result.normalizeResult?.errors?.length || (isImportResult(result) && result.errors.length)}
							<div class="rounded-md border border-amber-200 bg-amber-50 p-3">
								<div class="text-sm font-medium text-amber-900">Pipeline errors</div>
								<div class="mt-2 space-y-1 text-sm text-amber-800">
									{#each isImportResult(result) ? result.errors : [] as error}
										<div>{error}</div>
									{/each}
									{#each result.parseResult?.errors ?? [] as error}
										<div>{error.message}</div>
									{/each}
									{#each result.normalizeResult?.errors ?? [] as error}
										<div>{error.message}</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if form?.previewMode === 'import'}
							<div class="rounded-md border p-3 text-sm">
								<div>
									<span class="font-medium">Batch:</span>
									{isImportResult(result) ? (result.batchId ?? '—') : '—'}
								</div>
								<div>
									<span class="font-medium">Fetch log:</span>
									{isImportResult(result) ? (result.fetchLogId ?? '—') : '—'}
								</div>
								<div>
									<span class="font-medium">Created:</span>
									{isImportResult(result) ? result.candidatesCreated : 0}
								</div>
								<div>
									<span class="font-medium">Duplicates skipped:</span>
									{isImportResult(result) ? result.duplicatesSkipped : 0}
								</div>
								<div>
									<span class="font-medium">Updates queued:</span>
									{isImportResult(result) ? result.updatesQueued : 0}
								</div>
							</div>
						{/if}
					</div>

					<div class="space-y-3">
						<div class="text-sm font-medium">Candidate preview</div>
						{#each result.candidates as candidate}
							<div class="rounded-xl border border-[color:var(--rule)] p-4">
								<div class="flex flex-wrap items-center gap-2">
									<div class="font-medium">{previewTitle(candidate.normalizedData)}</div>
									<span class="inline-flex items-center rounded-full border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--mid)] uppercase">
										{friendly(dedupeLabel, candidate.dedupe.result)}
									</span>
									{#if candidate.priority !== 'normal'}
										<span class="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--color-ember-300)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_90%,white)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-[var(--color-ember-900)] uppercase">
											{friendly(priorityLabel, candidate.priority)}
										</span>
									{/if}
								</div>
								{#if candidate.dedupe.match?.canonicalTitle}
									<p class="mt-1 text-xs text-[var(--mid)]">Matches: {candidate.dedupe.match.canonicalTitle}</p>
								{/if}
								<div class="mt-3">
									<CandidateFieldCard data={candidate.normalizedData as unknown as Record<string, unknown>} />
								</div>
								<div class="mt-3">
									<CollapsibleDebug label="Raw data" data={{ normalized: candidate.normalizedData, raw: candidate.rawData }} />
								</div>
							</div>
						{:else}
							<div class="rounded-xl border border-dashed border-[color:var(--rule)] p-6 text-center text-sm text-[var(--mid)]">
								No candidate rows were produced.
							</div>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<form
		method="POST"
		action="?/updateSource"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') toast.success('Source updated');
				else if (result.type === 'failure')
					toast.error((result.data as { error?: string })?.error ?? 'Update failed');
				await update();
			};
		}}
		class="space-y-6"
	>
		<Card.Root>
			<Card.Header>
				<Card.Title>Registry details</Card.Title>
				<Card.Description>Core metadata, classification, and scheduling.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<Field.Field>
						<Field.Label for="name">Name *</Field.Label>
						<Field.Content>
							<Input id="name" name="name" value={data.source.name} required />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="sourceUrl">Source URL *</Field.Label>
						<Field.Content>
							<Input
								id="sourceUrl"
								name="sourceUrl"
								type="url"
								value={data.source.sourceUrl}
								required
							/>
						</Field.Content>
					</Field.Field>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<Field.Field>
						<Field.Label for="homepageUrl">Homepage URL</Field.Label>
						<Field.Content>
							<Input
								id="homepageUrl"
								name="homepageUrl"
								type="url"
								value={data.source.homepageUrl ?? ''}
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="fetchUrl">Fetch URL</Field.Label>
						<Field.Content>
							<Input id="fetchUrl" name="fetchUrl" type="url" value={data.source.fetchUrl ?? ''} />
						</Field.Content>
					</Field.Field>
				</div>
				<Field.Field>
					<Field.Label for="description">Description</Field.Label>
					<Field.Content>
						<Textarea
							id="description"
							name="description"
							rows={3}
							value={data.source.description ?? ''}
						/>
					</Field.Content>
				</Field.Field>
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<Field.Field>
						<Field.Label for="status">Status</Field.Label>
						<Field.Content>
							<NativeSelect.Root id="status" name="status" value={data.source.status}>
								<NativeSelect.Option value="discovered">Discovered</NativeSelect.Option>
								<NativeSelect.Option value="configuring">Configuring</NativeSelect.Option>
								<NativeSelect.Option value="active">Active</NativeSelect.Option>
								<NativeSelect.Option value="paused">Paused</NativeSelect.Option>
								<NativeSelect.Option value="deprecated">Deprecated</NativeSelect.Option>
								<NativeSelect.Option value="disabled">Disabled</NativeSelect.Option>
								<NativeSelect.Option value="manual_only">Manual only</NativeSelect.Option>
							</NativeSelect.Root>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="healthStatus">Health</Field.Label>
						<Field.Content>
							<NativeSelect.Root
								id="healthStatus"
								name="healthStatus"
								value={data.source.healthStatus}
							>
								<NativeSelect.Option value="healthy">Healthy</NativeSelect.Option>
								<NativeSelect.Option value="degraded">Degraded</NativeSelect.Option>
								<NativeSelect.Option value="unhealthy">Unhealthy</NativeSelect.Option>
								<NativeSelect.Option value="stale">Stale</NativeSelect.Option>
								<NativeSelect.Option value="broken">Broken</NativeSelect.Option>
								<NativeSelect.Option value="auth_required">Auth required</NativeSelect.Option>
								<NativeSelect.Option value="unknown">Unknown</NativeSelect.Option>
							</NativeSelect.Root>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="ingestionMethod">Ingestion method</Field.Label>
						<Field.Content>
							<NativeSelect.Root
								id="ingestionMethod"
								name="ingestionMethod"
								value={data.source.ingestionMethod}
							>
								<NativeSelect.Option value="manual_only">Manual only</NativeSelect.Option>
								<NativeSelect.Option value="manual_with_reminder">
									Manual with reminder
								</NativeSelect.Option>
								<NativeSelect.Option value="rss_import">RSS import</NativeSelect.Option>
								<NativeSelect.Option value="ical_import">iCal import</NativeSelect.Option>
								<NativeSelect.Option value="api_import">API import</NativeSelect.Option>
								<NativeSelect.Option value="html_scrape">HTML scrape</NativeSelect.Option>
								<NativeSelect.Option value="directory_sync">Directory sync</NativeSelect.Option>
								<NativeSelect.Option value="document_extraction">
									Document extraction
								</NativeSelect.Option>
								<NativeSelect.Option value="newsletter_triage"
									>Newsletter triage</NativeSelect.Option
								>
								<NativeSelect.Option value="hybrid">Hybrid</NativeSelect.Option>
							</NativeSelect.Root>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="fetchCadence">Fetch cadence</Field.Label>
						<Field.Content>
							<NativeSelect.Root
								id="fetchCadence"
								name="fetchCadence"
								value={data.source.fetchCadence}
							>
								<NativeSelect.Option value="hourly">Hourly</NativeSelect.Option>
								<NativeSelect.Option value="every_6h">Every 6h</NativeSelect.Option>
								<NativeSelect.Option value="daily">Daily</NativeSelect.Option>
								<NativeSelect.Option value="weekly">Weekly</NativeSelect.Option>
								<NativeSelect.Option value="biweekly">Biweekly</NativeSelect.Option>
								<NativeSelect.Option value="monthly">Monthly</NativeSelect.Option>
								<NativeSelect.Option value="manual">Manual</NativeSelect.Option>
							</NativeSelect.Root>
						</Field.Content>
					</Field.Field>
				</div>
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					<Field.Field>
						<Field.Label for="sourceCategory">Category</Field.Label>
						<Field.Content>
							<NativeSelect.Root
								id="sourceCategory"
								name="sourceCategory"
								value={data.source.sourceCategory ?? ''}
							>
								<NativeSelect.Option value="">Unspecified</NativeSelect.Option>
								<NativeSelect.Option value="government_federal"
									>Government (Federal)</NativeSelect.Option
								>
								<NativeSelect.Option value="government_state"
									>Government (State)</NativeSelect.Option
								>
								<NativeSelect.Option value="government_tribal"
									>Government (Tribal)</NativeSelect.Option
								>
								<NativeSelect.Option value="nonprofit">Nonprofit</NativeSelect.Option>
								<NativeSelect.Option value="foundation">Foundation</NativeSelect.Option>
								<NativeSelect.Option value="aggregator">Aggregator</NativeSelect.Option>
								<NativeSelect.Option value="news_media">News media</NativeSelect.Option>
								<NativeSelect.Option value="academic">Academic</NativeSelect.Option>
								<NativeSelect.Option value="professional_association">
									Professional association
								</NativeSelect.Option>
								<NativeSelect.Option value="private_business">Private business</NativeSelect.Option>
								<NativeSelect.Option value="community">Community</NativeSelect.Option>
							</NativeSelect.Root>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="ownerUserId">Owner user ID</Field.Label>
						<Field.Content>
							<Input id="ownerUserId" name="ownerUserId" value={data.source.ownerUserId ?? ''} />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="confidenceScore">Confidence score</Field.Label>
						<Field.Content>
							<Input
								id="confidenceScore"
								name="confidenceScore"
								type="number"
								min="1"
								max="5"
								value={data.source.confidenceScore ?? ''}
							/>
						</Field.Content>
					</Field.Field>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<Field.Field>
						<Field.Label>Coils</Field.Label>
						<Field.Content>
							<div class="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
								{#each coilOptions as coil}
									<label class="flex items-center gap-2">
										<input
											type="checkbox"
											name="coils"
											value={coil.value}
											checked={data.source.coils.includes(coil.value)}
										/>
										<span>{coil.label}</span>
									</label>
								{/each}
							</div>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label>Dedupe strategies</Field.Label>
						<Field.Content>
							<div class="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
								{#each dedupeOptions as option}
									<label class="flex items-center gap-2">
										<input
											type="checkbox"
											name="dedupeStrategies"
											value={option.value}
											checked={data.source.dedupeStrategies.includes(option.value)}
										/>
										<span>{option.label}</span>
									</label>
								{/each}
							</div>
						</Field.Content>
					</Field.Field>
				</div>
			</Card.Content>
		</Card.Root>

		<Separator />

		<Card.Root>
			<Card.Header>
				<Card.Title>Execution settings</Card.Title>
				<Card.Description
					>Adapter config, risk profile, review behavior, and timing.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<Field.Field>
						<Field.Label for="adapterType">Adapter type</Field.Label>
						<Field.Content>
							<Input id="adapterType" name="adapterType" value={data.source.adapterType ?? ''} />
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="nextCheckAt">Next check at</Field.Label>
						<Field.Content>
							<Input
								id="nextCheckAt"
								name="nextCheckAt"
								type="datetime-local"
								value={formatDateTimeLocal(data.source.nextCheckAt)}
							/>
						</Field.Content>
					</Field.Field>
				</div>
				<div class="grid gap-4 md:grid-cols-3">
					<Field.Field>
						<Field.Label for="pausedAt">Paused at</Field.Label>
						<Field.Content>
							<Input
								id="pausedAt"
								name="pausedAt"
								type="datetime-local"
								value={formatDateTimeLocal(data.source.pausedAt)}
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="deprecatedAt">Deprecated at</Field.Label>
						<Field.Content>
							<Input
								id="deprecatedAt"
								name="deprecatedAt"
								type="datetime-local"
								value={formatDateTimeLocal(data.source.deprecatedAt)}
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="pauseReason">Pause reason</Field.Label>
						<Field.Content>
							<Input id="pauseReason" name="pauseReason" value={data.source.pauseReason ?? ''} />
						</Field.Content>
					</Field.Field>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<Field.Field>
						<Field.Label for="attributionText">Attribution text</Field.Label>
						<Field.Content>
							<Input
								id="attributionText"
								name="attributionText"
								value={data.source.attributionText ?? ''}
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="stewardNotes">Steward notes</Field.Label>
						<Field.Content>
							<Textarea
								id="stewardNotes"
								name="stewardNotes"
								rows={3}
								value={data.source.stewardNotes ?? ''}
							/>
						</Field.Content>
					</Field.Field>
				</div>
				<div class="flex flex-wrap gap-4 text-sm">
					<label class="flex items-center gap-2">
						<input type="checkbox" name="enabled" checked={data.source.enabled} />
						<span>Enabled</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" name="reviewRequired" checked={data.source.reviewRequired} />
						<span>Review required</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" name="autoApprove" checked={data.source.autoApprove} />
						<span>Auto approve</span>
					</label>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							name="attributionRequired"
							checked={data.source.attributionRequired}
						/>
						<span>Attribution required</span>
					</label>
				</div>
				<div class="grid gap-4 xl:grid-cols-3">
					<Field.Field>
						<Field.Label for="adapterConfig">Adapter config (JSON)</Field.Label>
						<Field.Content>
							<Textarea
								id="adapterConfig"
								name="adapterConfig"
								rows={10}
								value={JSON.stringify(data.source.adapterConfig ?? {}, null, 2)}
								class="font-mono text-xs"
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="riskProfile">Risk profile (JSON)</Field.Label>
						<Field.Content>
							<Textarea
								id="riskProfile"
								name="riskProfile"
								rows={10}
								value={JSON.stringify(data.source.riskProfile ?? {}, null, 2)}
								class="font-mono text-xs"
							/>
						</Field.Content>
					</Field.Field>
					<Field.Field>
						<Field.Label for="dedupeConfig">Dedupe config (JSON)</Field.Label>
						<Field.Content>
							<Textarea
								id="dedupeConfig"
								name="dedupeConfig"
								rows={10}
								value={JSON.stringify(data.source.dedupeConfig ?? {}, null, 2)}
								class="font-mono text-xs"
							/>
						</Field.Content>
					</Field.Field>
				</div>
			</Card.Content>
		</Card.Root>

		<Separator />

		<Card.Root>
			<Card.Header>
				<Card.Title>Tags</Card.Title>
				<Card.Description
					>Flexible key/value metadata for stewardship and filtering.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each tags as tag, index}
					<div class="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
						<Input name="tagKey" bind:value={tag.tagKey} placeholder="Tag key" />
						<Input name="tagValue" bind:value={tag.tagValue} placeholder="Tag value" />
						<Button type="button" variant="outline" onclick={() => removeTag(index)}>
							<Trash2 class="mr-2 h-4 w-4" />
							Remove
						</Button>
					</div>
				{/each}
				<Button type="button" variant="outline" onclick={addTag}>
					<Plus class="mr-2 h-4 w-4" />
					Add tag
				</Button>
			</Card.Content>
		</Card.Root>

		<Button type="submit">Save source</Button>
	</form>

	<Card.Root>
		<Card.Header>
			<Card.Title>Operator snapshot</Card.Title>
			<Card.Description
				>Scheduling, publishing, and failure patterns for this source.</Card.Description
			>
		</Card.Header>
		<Card.Content class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-md border p-3">
				<div class="text-xs tracking-wide text-muted-foreground uppercase">
					Next scheduled check
				</div>
				<div class="mt-1 text-sm font-medium">
					{data.source.nextCheckAt ? data.source.nextCheckAt.toLocaleString() : 'Not scheduled'}
				</div>
			</div>
			<div class="rounded-md border p-3">
				<div class="text-xs tracking-wide text-muted-foreground uppercase">Last trigger</div>
				<div class="mt-1 text-sm font-medium">
					{(data.lastBatchMeta?.trigger as string | undefined)?.replace(/_/g, ' ') ?? 'Unknown'}
				</div>
				<div class="text-xs text-muted-foreground">
					{(data.lastBatchMeta?.triggered_by as string | undefined) ?? 'No actor recorded'}
				</div>
			</div>
			<div class="rounded-md border p-3">
				<div class="text-xs tracking-wide text-muted-foreground uppercase">Published outcomes</div>
				<div class="mt-1 text-sm font-medium">
					Approved {data.publishSummary.approved} · Auto-approved {data.publishSummary.autoApproved}
				</div>
			</div>
			<div class="rounded-md border p-3">
				<div class="text-xs tracking-wide text-muted-foreground uppercase">Top error pattern</div>
				<div class="mt-1 text-sm font-medium">
					{Object.entries(data.errorPatterns)[0]
						? `${Object.entries(data.errorPatterns)[0][0]} (${Object.entries(data.errorPatterns)[0][1]})`
						: 'No repeated errors'}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 xl:grid-cols-3">
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent fetch logs</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[420px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Status</Table.Head>
								<Table.Head>Attempted</Table.Head>
								<Table.Head>Items</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.fetchLogs as log}
								<Table.Row>
									<Table.Cell>{log.status}</Table.Cell>
									<Table.Cell>{log.attemptedAt.toLocaleString()}</Table.Cell>
									<Table.Cell>{log.itemsFound}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground">
										No fetch logs yet
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Recent import batches</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[420px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Status</Table.Head>
								<Table.Head>Started</Table.Head>
								<Table.Head>Trigger</Table.Head>
								<Table.Head>Fetched</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.batches as batch}
								<Table.Row>
									<Table.Cell>{batch.status}</Table.Cell>
									<Table.Cell>{batch.startedAt.toLocaleString()}</Table.Cell>
									<Table.Cell>
										{Array.isArray(batch.errors)
											? (
													(
														(batch.errors as Array<Record<string, unknown>>).find(
															(entry: Record<string, unknown>) =>
																entry &&
																typeof entry === 'object' &&
																(entry as { stage?: string }).stage === 'meta'
														) as { trigger?: string } | undefined
													)?.trigger ?? '—'
												).replace(/_/g, ' ')
											: '—'}
									</Table.Cell>
									<Table.Cell>{batch.itemsFetched}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={4} class="h-20 text-center text-muted-foreground">
										No batches yet
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Recent candidates</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<Table.Root class="min-w-[420px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Coil</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Imported</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.candidates as candidate}
								<Table.Row>
									<Table.Cell>{candidate.coil}</Table.Cell>
									<Table.Cell>{candidate.status}</Table.Cell>
									<Table.Cell>{candidate.importedAt.toLocaleString()}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-20 text-center text-muted-foreground">
										No candidates yet
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
