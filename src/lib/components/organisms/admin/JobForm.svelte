<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { JobItem } from '$lib/data/kb';
	import AdminEditorAssistPanel from '$lib/components/organisms/admin/AdminEditorAssistPanel.svelte';
	import AdminEditorSection from '$lib/components/organisms/admin/AdminEditorSection.svelte';
	import AdminEditorShell from '$lib/components/organisms/admin/AdminEditorShell.svelte';
	import AdminSubmissionContextCard from '$lib/components/organisms/admin/AdminSubmissionContextCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import {
		jobTypeOptions,
		jobSectorOptions,
		jobLevelOptions,
		workArrangementOptions,
		geographyOptions
	} from '$lib/data/formSchema';
	import {
		buildChangeLine,
		getFormValue,
		isValidHttpUrl,
		serializeForm,
		type EditorChangeLine
	} from './editor-support';

	type SubmissionContext = {
		createdAt?: string | null;
		submitterName?: string | null;
		submitterEmail?: string | null;
		contactName?: string | null;
		contactEmail?: string | null;
		contactPhone?: string | null;
	};

	interface Props {
		job?: JobItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
		previewHref?: string | null;
		liveHref?: string | null;
		submissionContext?: SubmissionContext | null;
	}

	let {
		job,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create job' : 'Save job',
		previewHref = null,
		liveHref = null,
		submissionContext = null
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');
	let qualificationsHtml = $state('');
	let applicationInstructionsHtml = $state('');
	let formEl = $state<HTMLFormElement | null>(null);
	let initialSnapshot = $state('');
	let hasUnsavedChanges = $state(false);
	let validationIssues = $state<string[]>([]);
	let changedFields = $state<EditorChangeLine[]>([]);
	let missingFields = $state<string[]>([]);
	let sectionSignals = $state({
		classification: false,
		compensation: false,
		admin: false
	});
	const initialIndigenousPrioritySelected = () => Boolean(job?.indigenousPriority);
	const initialShowCompensationDetails = () =>
		Boolean(
			job?.compensationType ||
			job?.compensationMin != null ||
			job?.compensationMax != null ||
			job?.compensationDescription ||
			job?.benefits
		);
	let indigenousPrioritySelected = $state(initialIndigenousPrioritySelected());
	let showCompensationDetails = $state(initialShowCompensationDetails());

	$effect(() => {
		descriptionHtml = job?.description ?? '';
		qualificationsHtml = job?.qualifications ?? '';
		applicationInstructionsHtml = job?.applicationInstructions ?? '';
		indigenousPrioritySelected = Boolean(job?.indigenousPriority);
		showCompensationDetails = initialShowCompensationDetails();
		queueMicrotask(async () => {
			await tick();
			syncBaseline();
		});
	});

	const selectCls =
		'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

	function listValue(values?: string[]) {
		return values?.join('\n') ?? '';
	}

	function linkedOrganization(id: string) {
		return organizations.find((organization) => organization.id === id)?.name ?? id;
	}

	function currentFieldDiffs(formData: FormData): EditorChangeLine[] {
		const next = [
			buildChangeLine('Title', job?.title, getFormValue(formData, 'title')),
			buildChangeLine('Employer', job?.employerName, getFormValue(formData, 'employerName')),
			buildChangeLine('Job type', job?.jobType, getFormValue(formData, 'jobType')),
			buildChangeLine(
				'Work arrangement',
				job?.workArrangement,
				getFormValue(formData, 'workArrangement')
			),
			buildChangeLine('Location', job?.location, getFormValue(formData, 'location')),
			buildChangeLine(
				'Application deadline',
				job?.applicationDeadline,
				getFormValue(formData, 'applicationDeadline')
			),
			buildChangeLine('Apply URL', job?.applyUrl, getFormValue(formData, 'applyUrl')),
			buildChangeLine('Description', job?.description, descriptionHtml),
			buildChangeLine(
				'Organization',
				job?.organizationId ? linkedOrganization(job.organizationId) : null,
				getFormValue(formData, 'organizationId')
					? linkedOrganization(getFormValue(formData, 'organizationId'))
					: null
			)
		];
		return next.filter((entry): entry is EditorChangeLine => Boolean(entry));
	}

	function currentValidationIssues(formData: FormData): string[] {
		const issues: string[] = [];
		const title = getFormValue(formData, 'title');
		const employerName = getFormValue(formData, 'employerName');
		const applyUrl = getFormValue(formData, 'applyUrl');
		const imageUrl = getFormValue(formData, 'imageUrl');
		const compensationMin = getFormValue(formData, 'compensationMin');
		const compensationMax = getFormValue(formData, 'compensationMax');

		if (!title) issues.push('Title is required.');
		if (!employerName) issues.push('Employer name is required.');
		if (!isValidHttpUrl(applyUrl)) issues.push('Apply URL must be a valid http or https URL.');
		if (!isValidHttpUrl(imageUrl)) issues.push('Image URL must be a valid http or https URL.');
		if (compensationMin && compensationMax && Number(compensationMin) > Number(compensationMax)) {
			issues.push('Minimum compensation cannot be greater than maximum compensation.');
		}

		return issues;
	}

	function currentMissingFields(formData: FormData): string[] {
		const next: string[] = [];
		if (!getFormValue(formData, 'title')) next.push('Title');
		if (!getFormValue(formData, 'employerName')) next.push('Employer name');
		if (!getFormValue(formData, 'jobType')) next.push('Job type');
		if (!getFormValue(formData, 'workArrangement')) next.push('Work arrangement');
		if (!getFormValue(formData, 'location')) next.push('Location');
		if (!getFormValue(formData, 'applicationDeadline')) next.push('Application deadline');
		if (!getFormValue(formData, 'applyUrl')) next.push('Apply URL');
		if (!descriptionHtml.trim()) next.push('Description');
		return next;
	}

	function currentSectionSignals(formData: FormData) {
		indigenousPrioritySelected = formData.has('indigenousPriority');
		return {
			classification: Boolean(
				getFormValue(formData, 'organizationId') ||
				getFormValue(formData, 'seniority') ||
				getFormValue(formData, 'sector') ||
				getFormValue(formData, 'department') ||
				getFormValue(formData, 'region')
			),
			compensation: Boolean(
				showCompensationDetails ||
				getFormValue(formData, 'compensationType') ||
				getFormValue(formData, 'compensationMin') ||
				getFormValue(formData, 'compensationMax') ||
				getFormValue(formData, 'compensationDescription') ||
				getFormValue(formData, 'benefits') ||
				getFormValue(formData, 'tribalPreference') ||
				getFormValue(formData, 'applicationInstructions') ||
				validationIssues.some((issue) => issue.toLowerCase().includes('compensation'))
			),
			admin: Boolean(
				getFormValue(formData, 'slug') ||
				getFormValue(formData, 'status') !==
					(mode === 'create' ? 'draft' : (job?.status ?? 'draft')) ||
				getFormValue(formData, 'adminNotes') ||
				getFormValue(formData, 'rejectionReason') ||
				formData.has('featured') ||
				formData.has('unlisted') ||
				formData.has('indigenousPriority')
			)
		};
	}

	function recomputeEditorState() {
		if (!formEl) return;
		const formData = new FormData(formEl);
		validationIssues = currentValidationIssues(formData);
		changedFields = currentFieldDiffs(formData);
		missingFields = currentMissingFields(formData);
		sectionSignals = currentSectionSignals(formData);
		hasUnsavedChanges = serializeForm(formEl) !== initialSnapshot;
	}

	function syncBaseline() {
		if (!formEl) return;
		initialSnapshot = serializeForm(formEl);
		recomputeEditorState();
		hasUnsavedChanges = false;
	}

	function formEnhance(): SubmitFunction {
		return () => {
			submitting = true;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					toast.success(mode === 'create' ? 'Job created' : 'Job saved');
				} else if (result.type === 'failure') {
					toast.error((result.data as { error?: string })?.error ?? 'Error saving job');
				}
				await update();
				await tick();
				syncBaseline();
			};
		};
	}

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasUnsavedChanges) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		queueMicrotask(() => syncBaseline());
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	$effect(() => {
		void descriptionHtml;
		void qualificationsHtml;
		void applicationInstructionsHtml;
		if (!formEl) return;
		queueMicrotask(() => recomputeEditorState());
	});
</script>

<form
	bind:this={formEl}
	method="POST"
	{action}
	use:enhance={formEnhance()}
	oninput={recomputeEditorState}
	onchange={recomputeEditorState}
	class="space-y-6"
>
	{#if mode === 'create'}
		<input type="hidden" name="status" value="draft" />
	{/if}

	<AdminEditorShell
		{submitLabel}
		{submitting}
		mobileSummary={missingFields.length === 0
			? 'Essential job details are in place.'
			: 'Fill the essentials, then save.'}
	>
		{#snippet sidebar()}
			<AdminEditorAssistPanel
				status={mode === 'create' ? 'draft' : (job?.status ?? 'draft')}
				{previewHref}
				{liveHref}
				liveLabel="View live job"
				{hasUnsavedChanges}
				{validationIssues}
				changedFields={changedFields.slice(0, 6)}
				{missingFields}
				{submitLabel}
				{submitting}
				publishedAt={job?.publishedAt ?? null}
				updatedAt={job?.updatedAt ?? null}
			/>
			<AdminSubmissionContextCard
				createdAt={submissionContext?.createdAt ?? job?.createdAt ?? null}
				submitterName={submissionContext?.submitterName ?? job?.submitterName ?? null}
				submitterEmail={submissionContext?.submitterEmail ?? job?.submitterEmail ?? null}
				contactName={submissionContext?.contactName ?? null}
				contactEmail={submissionContext?.contactEmail ?? null}
				contactPhone={submissionContext?.contactPhone ?? null}
			/>
		{/snippet}

		{#snippet children()}
			<AdminEditorSection
				storageKey={`jobs:${mode}:essentials`}
				title="Essentials"
				description="Start with the minimum information editors need to create a usable job post."
				defaultOpen={true}
				forceOpen={true}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="title">Title *</Label>
						<Input
							id="title"
							name="title"
							required
							value={job?.title ?? ''}
							placeholder="Job title"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="employerName">Employer name *</Label>
						<Input
							id="employerName"
							name="employerName"
							required
							value={job?.employerName ?? ''}
							placeholder="e.g. Indigenous Futures Society"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="jobType">Job type *</Label>
						<select id="jobType" name="jobType" class={selectCls} value={job?.jobType ?? ''}>
							{#each jobTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="workArrangement">Work arrangement *</Label>
						<select
							id="workArrangement"
							name="workArrangement"
							class={selectCls}
							value={job?.workArrangement ?? ''}
						>
							{#each workArrangementOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="location">Location *</Label>
						<Input
							id="location"
							name="location"
							value={job?.location ?? ''}
							placeholder="e.g. Sacramento, CA or Remote"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="applicationDeadline">Application deadline *</Label>
						<Input
							id="applicationDeadline"
							name="applicationDeadline"
							type="date"
							value={job?.applicationDeadline ? job.applicationDeadline.slice(0, 10) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="applyUrl">Apply URL *</Label>
						<Input
							id="applyUrl"
							name="applyUrl"
							type="url"
							value={job?.applyUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`jobs:${mode}:details`}
				title="Details"
				description="Add the narrative and the application specifics after the essentials are in place."
				defaultOpen={true}
				forceOpen={Boolean(
					descriptionHtml.trim() || qualificationsHtml.trim() || applicationInstructionsHtml.trim()
				)}
			>
				<div class="space-y-4">
					<div class="space-y-1.5">
						<Label>Description *</Label>
						<RichTextEditor
							bind:value={descriptionHtml}
							name="description"
							initialValue={job?.description ?? ''}
						/>
					</div>

					<div class="space-y-1.5">
						<Label>Qualifications</Label>
						<RichTextEditor
							bind:value={qualificationsHtml}
							name="qualifications"
							initialValue={job?.qualifications ?? ''}
						/>
					</div>

					<div class="space-y-1.5">
						<Label>Application instructions</Label>
						<RichTextEditor
							bind:value={applicationInstructionsHtml}
							name="applicationInstructions"
							initialValue={job?.applicationInstructions ?? ''}
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`jobs:${mode}:classification`}
				title="Classification"
				description="Only open this when you need richer filtering and organization metadata."
				defaultOpen={false}
				forceOpen={sectionSignals.classification}
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="space-y-1.5">
						<Label for="organizationId">Linked organization</Label>
						<select
							id="organizationId"
							name="organizationId"
							class={selectCls}
							value={job?.organizationId ?? ''}
						>
							<option value="">— None —</option>
							{#each organizations as org}
								<option value={org.id}>{org.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="sector">Sector</Label>
						<select id="sector" name="sector" class={selectCls} value={job?.sector ?? ''}>
							{#each jobSectorOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="seniority">Seniority</Label>
						<select id="seniority" name="seniority" class={selectCls} value={job?.seniority ?? ''}>
							{#each jobLevelOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="department">Department</Label>
						<Input id="department" name="department" value={job?.department ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="region">Region</Label>
						<select id="region" name="region" class={selectCls} value={job?.region ?? ''}>
							{#each geographyOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="city">City</Label>
						<Input id="city" name="city" value={job?.city ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="state">State</Label>
						<Input id="state" name="state" value={job?.state ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="zip">ZIP</Label>
						<Input id="zip" name="zip" value={job?.zip ?? ''} />
					</div>
					<div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
						<Label for="address">Street address</Label>
						<Input id="address" name="address" value={job?.address ?? ''} />
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`jobs:${mode}:compensation`}
				title="Compensation and extras"
				description="Keep the first pass light, then open this when you want salary, benefits, or extra hiring notes."
				defaultOpen={false}
				forceOpen={sectionSignals.compensation}
				summary={showCompensationDetails ? 'Expanded' : 'Hidden until needed'}
			>
				<div class="space-y-4">
					{#if !showCompensationDetails}
						<div class="rounded-xl border border-dashed border-[color:var(--rule)] p-4">
							<p class="text-sm text-[var(--mid)]">
								Leave this closed for quick entry, or add salary and benefits when they are ready.
							</p>
							<Button
								type="button"
								variant="outline"
								class="mt-3"
								onclick={() => {
									showCompensationDetails = true;
									recomputeEditorState();
								}}
							>
								Add salary details
							</Button>
						</div>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div class="space-y-1.5">
								<Label for="compensationType">Compensation type</Label>
								<Input
									id="compensationType"
									name="compensationType"
									value={job?.compensationType ?? ''}
									placeholder="e.g. salary, hourly, stipend"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="compensationMin">Minimum compensation</Label>
								<Input
									id="compensationMin"
									name="compensationMin"
									type="number"
									step="0.01"
									value={job?.compensationMin != null ? String(job.compensationMin) : ''}
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="compensationMax">Maximum compensation</Label>
								<Input
									id="compensationMax"
									name="compensationMax"
									type="number"
									step="0.01"
									value={job?.compensationMax != null ? String(job.compensationMax) : ''}
								/>
							</div>
							<div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
								<Label for="compensationDescription">Compensation summary</Label>
								<Input
									id="compensationDescription"
									name="compensationDescription"
									value={job?.compensationDescription ?? ''}
									placeholder="e.g. $65,000–80,000 DOE"
								/>
							</div>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="benefits">Benefits</Label>
								<Textarea
									id="benefits"
									name="benefits"
									rows={4}
									value={job?.benefits ?? ''}
									placeholder="Benefits, leave, retirement, travel, or scheduling notes"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="tags">Tags</Label>
								<Textarea
									id="tags"
									name="tags"
									rows={4}
									value={listValue(job?.tags)}
									placeholder="One per line"
								/>
							</div>
						</div>
					{/if}

					<div class="grid gap-4 sm:grid-cols-2">
						<label class="flex items-center gap-2 rounded-xl border border-[color:var(--rule)] p-3">
							<input
								type="checkbox"
								name="indigenousPriority"
								value="true"
								checked={job?.indigenousPriority ?? false}
								class="h-4 w-4 rounded border-input"
							/>
							<span class="text-sm font-medium">Indigenous priority</span>
						</label>
						{#if indigenousPrioritySelected}
							<div class="space-y-1.5">
								<Label for="tribalPreference">Tribal preference</Label>
								<Input
									id="tribalPreference"
									name="tribalPreference"
									value={job?.tribalPreference ?? ''}
									placeholder="Optional policy or hiring note"
								/>
							</div>
						{/if}
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`jobs:${mode}:admin`}
				title="Admin and moderation"
				description="Open this only when you need moderation controls, internal notes, or publishing flags."
				defaultOpen={false}
				forceOpen={sectionSignals.admin}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					{#if mode === 'edit'}
						<div class="space-y-1.5">
							<Label for="slug">Slug</Label>
							<Input id="slug" name="slug" value={job?.slug ?? ''} placeholder="auto-generated" />
						</div>
						<div class="space-y-1.5">
							<Label for="statusSelect">Moderation status</Label>
							<select
								id="statusSelect"
								name="status"
								class={selectCls}
								value={job?.status ?? 'draft'}
							>
								<option value="draft">Draft</option>
								<option value="pending">Pending</option>
								<option value="published">Published</option>
								<option value="rejected">Rejected</option>
							</select>
						</div>
					{/if}
					<div class="space-y-1.5">
						<Label for="imageUrl">Image URL</Label>
						<Input
							id="imageUrl"
							name="imageUrl"
							type="url"
							value={job?.imageUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="imageUrls">Additional image URLs</Label>
						<Textarea
							id="imageUrls"
							name="imageUrls"
							rows={4}
							value={job?.imageUrls?.join('\n') ?? ''}
							placeholder="One URL per line"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="adminNotes">Admin notes</Label>
						<Textarea
							id="adminNotes"
							name="adminNotes"
							rows={4}
							value={job?.adminNotes ?? ''}
							placeholder="Internal moderation or sourcing notes"
						/>
					</div>
				</div>

				{#if mode === 'edit'}
					<div class="mt-4 space-y-1.5">
						<Label for="rejectionReason">Rejection reason</Label>
						<Textarea
							id="rejectionReason"
							name="rejectionReason"
							rows={3}
							value={job?.rejectionReason ?? ''}
							placeholder="Optional reason to store if the job is rejected"
						/>
					</div>
				{/if}

				<div class="mt-4 flex flex-wrap gap-6">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="featured"
							value="true"
							checked={job?.featured ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Featured
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="unlisted"
							value="true"
							checked={job?.unlisted ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Unlisted
					</label>
				</div>
			</AdminEditorSection>
		{/snippet}
	</AdminEditorShell>
</form>
