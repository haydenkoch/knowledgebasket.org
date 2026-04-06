<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import StatusBadge from '$lib/components/organisms/admin/StatusBadge.svelte';
	import HealthBadge from '$lib/components/organisms/admin/HealthBadge.svelte';
	import { friendly, ingestionLabel, dedupeLabel } from '$lib/admin/labels.js';
	import { ArrowRight, History, Save } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

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

	const tagsText = $derived(
		data.tags
			.map((tag: { tagKey: string; tagValue: string }) => `${tag.tagKey}=${tag.tagValue}`)
			.join('\n')
	);

	function formatDateTimeLocal(value?: Date | null) {
		return value ? value.toISOString().slice(0, 16) : '';
	}

	const validationSummary = $derived(
		data.validation.errors[0] ?? data.validation.warnings[0] ?? null
	);

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
				Configure metadata, adapter settings, cadence, ownership, and moderation defaults here. Run
				history, fetch logs, previews, and imports now live in the dedicated runs view.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href={`/admin/sources/${data.source.id}/runs`} variant="secondary">
				<History class="mr-2 h-4 w-4" />
				View runs
			</Button>
			<Button href={`/admin/sources/review?sourceId=${data.source.id}`} variant="outline">
				Review imported items
			</Button>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Import method
			</div>
			<div class="mt-1 text-sm font-medium">
				{friendly(ingestionLabel, data.source.ingestionMethod) ?? data.source.ingestionMethod}
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.source.fetchCadence ?? 'manual'} cadence
			</div>
		</div>
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Candidates
			</div>
			<div class="mt-1 text-sm font-medium">
				{data.candidateOutcomeSummary.pending} pending · {data.candidateOutcomeSummary.needsInfo} need
				info
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.candidateOutcomeSummary.approved + data.candidateOutcomeSummary.autoApproved} approved total
			</div>
		</div>
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Batch quality
			</div>
			<div class="mt-1 text-sm font-medium">
				{data.batchQualitySummary.totalNew} new · {data.batchQualitySummary.totalUpdated} updates
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{data.batchQualitySummary.totalDuplicate} duplicates · {data.batchQualitySummary
					.totalFailed} failed
			</div>
		</div>
		<div
			class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/50 p-4"
		>
			<div class="text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase">
				Validation
			</div>
			<div class="mt-1 text-sm font-medium">
				{data.validation.valid ? 'Ready to run' : 'Needs attention'}
			</div>
			<div class="mt-1 text-xs text-[var(--mid)]">
				{validationSummary ?? 'No blocking setup issues'}
			</div>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
		<form
			method="POST"
			action="?/updateSource"
			use:enhance={enhanceToast('Source updated')}
			class="space-y-6"
		>
			<Card.Root>
				<Card.Header>
					<Card.Title>Registry details</Card.Title>
					<Card.Description>Core metadata, URLs, classification, and cadence.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label for="name">Name *</Field.Label>
							<Field.Content
								><Input id="name" name="name" value={data.source.name} required /></Field.Content
							>
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
								<Input
									id="fetchUrl"
									name="fetchUrl"
									type="url"
									value={data.source.fetchUrl ?? ''}
								/>
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
									<NativeSelect.Option value="manual_with_reminder"
										>Manual with reminder</NativeSelect.Option
									>
									<NativeSelect.Option value="rss_import">RSS import</NativeSelect.Option>
									<NativeSelect.Option value="ical_import">iCal import</NativeSelect.Option>
									<NativeSelect.Option value="api_import">API import</NativeSelect.Option>
									<NativeSelect.Option value="html_scrape">HTML scrape</NativeSelect.Option>
									<NativeSelect.Option value="directory_sync">Directory sync</NativeSelect.Option>
									<NativeSelect.Option value="document_extraction"
										>Document extraction</NativeSelect.Option
									>
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
									<NativeSelect.Option value="professional_association"
										>Professional association</NativeSelect.Option
									>
									<NativeSelect.Option value="private_business"
										>Private business</NativeSelect.Option
									>
									<NativeSelect.Option value="community">Community</NativeSelect.Option>
								</NativeSelect.Root>
							</Field.Content>
						</Field.Field>
						<Field.Field>
							<Field.Label for="ownerUserId">Owner user ID</Field.Label>
							<Field.Content
								><Input
									id="ownerUserId"
									name="ownerUserId"
									value={data.source.ownerUserId ?? ''}
								/></Field.Content
							>
						</Field.Field>
						<Field.Field>
							<Field.Label for="nextCheckAt">Next check</Field.Label>
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
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Ownership and moderation</Card.Title>
					<Card.Description
						>Choose defaults for review behavior, attribution, and stewardship.</Card.Description
					>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label for="stewardNotes">Steward notes</Field.Label>
							<Field.Content>
								<Textarea
									id="stewardNotes"
									name="stewardNotes"
									rows={4}
									value={data.source.stewardNotes ?? ''}
								/>
							</Field.Content>
						</Field.Field>
						<Field.Field>
							<Field.Label for="qaNotes">QA notes (JSON)</Field.Label>
							<Field.Content>
								<Textarea
									id="qaNotes"
									name="qaNotes"
									rows={4}
									value={JSON.stringify(data.source.qaNotes ?? [], null, 2)}
								/>
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

					<div class="grid gap-3 text-sm md:grid-cols-2">
						<label
							class="flex items-center gap-2 rounded-lg border border-[color:var(--rule)] px-3 py-2"
						>
							<input type="checkbox" name="enabled" checked={data.source.enabled} />
							<span>Enabled</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-lg border border-[color:var(--rule)] px-3 py-2"
						>
							<input type="checkbox" name="reviewRequired" checked={data.source.reviewRequired} />
							<span>Review required</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-lg border border-[color:var(--rule)] px-3 py-2"
						>
							<input type="checkbox" name="autoApprove" checked={data.source.autoApprove} />
							<span>Auto-approve</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-lg border border-[color:var(--rule)] px-3 py-2"
						>
							<input
								type="checkbox"
								name="attributionRequired"
								checked={data.source.attributionRequired}
							/>
							<span>Attribution required</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-lg border border-[color:var(--rule)] px-3 py-2"
						>
							<input type="checkbox" name="quarantined" checked={data.source.quarantined} />
							<span>Quarantined</span>
						</label>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label for="pauseReason">Pause reason</Field.Label>
							<Field.Content
								><Input
									id="pauseReason"
									name="pauseReason"
									value={data.source.pauseReason ?? ''}
								/></Field.Content
							>
						</Field.Field>
						<Field.Field>
							<Field.Label for="quarantineReason">Quarantine reason</Field.Label>
							<Field.Content>
								<Input
									id="quarantineReason"
									name="quarantineReason"
									value={data.source.quarantineReason ?? ''}
								/>
							</Field.Content>
						</Field.Field>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Adapter and dedupe settings</Card.Title>
					<Card.Description>Keep raw adapter config and risk rules in one place.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						<Field.Field>
							<Field.Label for="adapterType">Adapter type</Field.Label>
							<Field.Content
								><Input
									id="adapterType"
									name="adapterType"
									value={data.source.adapterType ?? ''}
								/></Field.Content
							>
						</Field.Field>
						<Field.Field>
							<Field.Label for="adapterVersion">Adapter version</Field.Label>
							<Field.Content
								><Input
									id="adapterVersion"
									name="adapterVersion"
									value={data.source.adapterVersion ?? ''}
								/></Field.Content
							>
						</Field.Field>
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
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label>Coils</Field.Label>
							<Field.Content>
								<div
									class="grid grid-cols-2 gap-2 rounded-md border border-[color:var(--rule)] p-3 text-sm"
								>
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
								<div
									class="grid grid-cols-2 gap-2 rounded-md border border-[color:var(--rule)] p-3 text-sm"
								>
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

					<div class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label for="adapterConfig">Adapter config (JSON)</Field.Label>
							<Field.Content>
								<Textarea
									id="adapterConfig"
									name="adapterConfig"
									rows={8}
									value={JSON.stringify(data.source.adapterConfig ?? {}, null, 2)}
								/>
							</Field.Content>
						</Field.Field>
						<Field.Field>
							<Field.Label for="riskProfile">Risk profile (JSON)</Field.Label>
							<Field.Content>
								<Textarea
									id="riskProfile"
									name="riskProfile"
									rows={8}
									value={JSON.stringify(data.source.riskProfile ?? {}, null, 2)}
								/>
							</Field.Content>
						</Field.Field>
						<Field.Field class="md:col-span-2">
							<Field.Label for="dedupeConfig">Dedupe config (JSON)</Field.Label>
							<Field.Content>
								<Textarea
									id="dedupeConfig"
									name="dedupeConfig"
									rows={6}
									value={JSON.stringify(data.source.dedupeConfig ?? {}, null, 2)}
								/>
							</Field.Content>
						</Field.Field>
						<Field.Field class="md:col-span-2">
							<Field.Label for="tagsText">Tags</Field.Label>
							<Field.Description>One `key=value` pair per line.</Field.Description>
							<Field.Content>
								<Textarea id="tagsText" name="tagsText" rows={5} value={tagsText} />
							</Field.Content>
						</Field.Field>
					</div>
				</Card.Content>
			</Card.Root>

			<div class="flex justify-end">
				<Button type="submit">
					<Save class="mr-2 h-4 w-4" />
					Save source config
				</Button>
			</div>
		</form>

		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Next actions</Card.Title>
					<Card.Description
						>Use the task-shaped flows instead of doing everything from one screen.</Card.Description
					>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<a
						href={`/admin/sources/${data.source.id}/runs`}
						class="flex items-center justify-between rounded-lg border border-[color:var(--rule)] px-3 py-3 no-underline hover:bg-[var(--color-alpine-snow-100)]/60 hover:no-underline"
					>
						<span>
							<span class="block font-medium text-[var(--dark)]">Run history and preview</span>
							<span class="text-[var(--mid)]">Test, import, retry, inspect logs and stages.</span>
						</span>
						<ArrowRight class="h-4 w-4 text-[var(--mid)]" />
					</a>
					<a
						href={`/admin/sources/review?sourceId=${data.source.id}`}
						class="flex items-center justify-between rounded-lg border border-[color:var(--rule)] px-3 py-3 no-underline hover:bg-[var(--color-alpine-snow-100)]/60 hover:no-underline"
					>
						<span>
							<span class="block font-medium text-[var(--dark)]">Imported item review</span>
							<span class="text-[var(--mid)]">Moderate candidates scoped to this source.</span>
						</span>
						<ArrowRight class="h-4 w-4 text-[var(--mid)]" />
					</a>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Runtime flags</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<div class="flex items-center justify-between gap-3">
						<span>Enabled</span>
						<span class="font-medium">{data.source.enabled ? 'Yes' : 'No'}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span>Review required</span>
						<span class="font-medium">{data.source.reviewRequired ? 'Yes' : 'No'}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span>Auto approve</span>
						<span class="font-medium">{data.source.autoApprove ? 'Yes' : 'No'}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span>Quarantined</span>
						<span class="font-medium">{data.source.quarantined ? 'Yes' : 'No'}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span>Dedupe</span>
						<span class="text-right font-medium">
							{data.source.dedupeStrategies
								.map((strategy: string) => dedupeLabel[strategy] ?? strategy)
								.join(', ') || 'None'}
						</span>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Quick state actions</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2">
					<form method="POST" action="?/pauseSource" use:enhance={enhanceToast('Source paused')}>
						<input
							type="hidden"
							name="pauseReason"
							value={data.source.pauseReason ?? 'Paused from config page'}
						/>
						<Button type="submit" variant="outline" class="w-full justify-start"
							>Pause source</Button
						>
					</form>
					<form method="POST" action="?/resumeSource" use:enhance={enhanceToast('Source resumed')}>
						<Button type="submit" variant="outline" class="w-full justify-start"
							>Resume source</Button
						>
					</form>
					<form
						method="POST"
						action="?/quarantineSource"
						use:enhance={enhanceToast('Source quarantined')}
					>
						<input
							type="hidden"
							name="quarantineReason"
							value={data.source.quarantineReason ?? 'Quarantined from config page'}
						/>
						<Button type="submit" variant="outline" class="w-full justify-start"
							>Quarantine source</Button
						>
					</form>
					<form
						method="POST"
						action="?/unquarantineSource"
						use:enhance={enhanceToast('Source unquarantined')}
					>
						<Button type="submit" variant="outline" class="w-full justify-start"
							>Remove quarantine</Button
						>
					</form>
					<form
						method="POST"
						action="?/disableSource"
						use:enhance={enhanceToast('Source disabled')}
					>
						<Button type="submit" variant="outline" class="w-full justify-start"
							>Disable source</Button
						>
					</form>
					<form
						method="POST"
						action="?/deprecateSource"
						use:enhance={enhanceToast('Source deprecated')}
					>
						<Button type="submit" variant="outline" class="w-full justify-start"
							>Deprecate source</Button
						>
					</form>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
