<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { FundingItem } from '$lib/data/kb';
	import AdminEditorAssistPanel from '$lib/components/organisms/admin/AdminEditorAssistPanel.svelte';
	import AdminEditorSection from '$lib/components/organisms/admin/AdminEditorSection.svelte';
	import AdminEditorShell from '$lib/components/organisms/admin/AdminEditorShell.svelte';
	import AdminOptionChipsField from '$lib/components/organisms/admin/AdminOptionChipsField.svelte';
	import AdminSubmissionContextCard from '$lib/components/organisms/admin/AdminSubmissionContextCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import {
		fundingTypeOptions,
		fundingStatusOptions,
		fundingFocusOptions,
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
		funding?: FundingItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
		previewHref?: string | null;
		liveHref?: string | null;
		submissionContext?: SubmissionContext | null;
	}

	let {
		funding,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create funding' : 'Save funding',
		previewHref = null,
		liveHref = null,
		submissionContext = null
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');
	let formEl = $state<HTMLFormElement | null>(null);
	let initialSnapshot = $state('');
	let hasUnsavedChanges = $state(false);
	let validationIssues = $state<string[]>([]);
	let changedFields = $state<EditorChangeLine[]>([]);
	let missingFields = $state<string[]>([]);
	let sectionSignals = $state({
		classification: false,
		details: false,
		contact: false,
		admin: false
	});
	const initialRecurringSelected = () => Boolean(funding?.isRecurring);
	const initialMatchRequiredSelected = () => Boolean(funding?.matchRequired);
	let recurringSelected = $state(initialRecurringSelected());
	let matchRequiredSelected = $state(initialMatchRequiredSelected());

	$effect(() => {
		descriptionHtml = funding?.description ?? '';
		recurringSelected = Boolean(funding?.isRecurring);
		matchRequiredSelected = Boolean(funding?.matchRequired);
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
			buildChangeLine('Title', funding?.title, getFormValue(formData, 'title')),
			buildChangeLine('Funder', funding?.funderName, getFormValue(formData, 'funderName')),
			buildChangeLine('Funding type', funding?.fundingType, getFormValue(formData, 'fundingType')),
			buildChangeLine('Deadline', funding?.deadline, getFormValue(formData, 'deadline')),
			buildChangeLine('Apply URL', funding?.applyUrl, getFormValue(formData, 'applyUrl')),
			buildChangeLine(
				'Amount',
				funding?.amountDescription,
				getFormValue(formData, 'amountDescription')
			),
			buildChangeLine('Region', funding?.region, getFormValue(formData, 'region')),
			buildChangeLine('Description', funding?.description, descriptionHtml),
			buildChangeLine(
				'Organization',
				funding?.organizationId ? linkedOrganization(funding.organizationId) : null,
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
		const funderName = getFormValue(formData, 'funderName');
		const openDate = getFormValue(formData, 'openDate');
		const deadline = getFormValue(formData, 'deadline');
		const amountMin = getFormValue(formData, 'amountMin');
		const amountMax = getFormValue(formData, 'amountMax');
		const applyUrl = getFormValue(formData, 'applyUrl');
		const imageUrl = getFormValue(formData, 'imageUrl');

		if (!title) issues.push('Title is required.');
		if (!funderName) issues.push('Funder name is required.');
		if (openDate && deadline && new Date(openDate).getTime() > new Date(deadline).getTime()) {
			issues.push('Open date must be before the deadline.');
		}
		if (amountMin && amountMax && Number(amountMin) > Number(amountMax)) {
			issues.push('Minimum amount cannot be greater than maximum amount.');
		}
		if (!isValidHttpUrl(applyUrl)) issues.push('Apply URL must be a valid http or https URL.');
		if (!isValidHttpUrl(imageUrl)) issues.push('Image URL must be a valid http or https URL.');

		return issues;
	}

	function currentMissingFields(formData: FormData): string[] {
		const next: string[] = [];
		if (!getFormValue(formData, 'title')) next.push('Title');
		if (!getFormValue(formData, 'funderName')) next.push('Funder name');
		if (!getFormValue(formData, 'fundingType')) next.push('Funding type');
		if (!getFormValue(formData, 'deadline')) next.push('Deadline');
		if (!getFormValue(formData, 'amountDescription')) next.push('Amount description');
		if (!getFormValue(formData, 'applyUrl')) next.push('Apply URL');
		if (!getFormValue(formData, 'region')) next.push('Region');
		if (!descriptionHtml.trim()) next.push('Description');
		return next;
	}

	function currentSectionSignals(formData: FormData) {
		recurringSelected = formData.has('isRecurring');
		matchRequiredSelected = formData.has('matchRequired');
		return {
			classification: Boolean(
				getFormValue(formData, 'organizationId') ||
				getFormValue(formData, 'eligibilityType') ||
				getFormValue(formData, 'eligibilityTypes') ||
				getFormValue(formData, 'focusAreas') ||
				getFormValue(formData, 'fundingTypes')
			),
			details: Boolean(
				getFormValue(formData, 'applicationStatus') ||
				getFormValue(formData, 'openDate') ||
				getFormValue(formData, 'awardDate') ||
				getFormValue(formData, 'fundingCycleNotes') ||
				getFormValue(formData, 'recurringSchedule') ||
				getFormValue(formData, 'amountMin') ||
				getFormValue(formData, 'amountMax') ||
				getFormValue(formData, 'fundingTerm') ||
				getFormValue(formData, 'matchRequirements') ||
				getFormValue(formData, 'eligibleCosts')
			),
			contact: Boolean(
				getFormValue(formData, 'contactName') ||
				getFormValue(formData, 'contactEmail') ||
				getFormValue(formData, 'contactPhone') ||
				getFormValue(formData, 'imageUrl') ||
				getFormValue(formData, 'geographicRestrictions') ||
				getFormValue(formData, 'tags')
			),
			admin: Boolean(
				getFormValue(formData, 'slug') ||
				getFormValue(formData, 'status') !==
					(mode === 'create' ? 'draft' : (funding?.status ?? 'draft')) ||
				getFormValue(formData, 'adminNotes') ||
				getFormValue(formData, 'rejectionReason') ||
				formData.has('featured') ||
				formData.has('unlisted')
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
					toast.success(mode === 'create' ? 'Funding created' : 'Funding saved');
				} else if (result.type === 'failure') {
					toast.error((result.data as { error?: string })?.error ?? 'Error saving funding');
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
			? 'Core funding details are ready to save.'
			: 'Add the essentials, then save.'}
	>
		{#snippet sidebar()}
			<AdminEditorAssistPanel
				status={mode === 'create' ? 'draft' : (funding?.status ?? 'draft')}
				{previewHref}
				{liveHref}
				liveLabel="View live funding"
				{hasUnsavedChanges}
				{validationIssues}
				changedFields={changedFields.slice(0, 6)}
				{missingFields}
				{submitLabel}
				{submitting}
				publishedAt={funding?.publishedAt ?? null}
				updatedAt={funding?.updatedAt ?? null}
			/>
			<AdminSubmissionContextCard
				createdAt={submissionContext?.createdAt ?? funding?.createdAt ?? null}
				submitterName={submissionContext?.submitterName ?? funding?.submitterName ?? null}
				submitterEmail={submissionContext?.submitterEmail ?? funding?.submitterEmail ?? null}
				contactName={submissionContext?.contactName ?? funding?.contactName ?? null}
				contactEmail={submissionContext?.contactEmail ?? funding?.contactEmail ?? null}
				contactPhone={submissionContext?.contactPhone ?? funding?.contactPhone ?? null}
			/>
		{/snippet}

		{#snippet children()}
			<AdminEditorSection
				storageKey={`funding:${mode}:essentials`}
				title="Essentials"
				description="Start with the funding details moderators need most often."
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
							value={funding?.title ?? ''}
							placeholder="Funding opportunity title"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="funderName">Funder name *</Label>
						<Input
							id="funderName"
							name="funderName"
							required
							value={funding?.funderName ?? ''}
							placeholder="e.g. Native Arts & Cultures Foundation"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="fundingType">Funding type *</Label>
						<select
							id="fundingType"
							name="fundingType"
							class={selectCls}
							value={funding?.fundingType ?? ''}
						>
							{#each fundingTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="deadline">Deadline *</Label>
						<Input
							id="deadline"
							name="deadline"
							type="date"
							value={funding?.deadline ? funding.deadline.slice(0, 10) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="amountDescription">Amount / range *</Label>
						<Input
							id="amountDescription"
							name="amountDescription"
							value={funding?.amountDescription ?? ''}
							placeholder="e.g. $25,000 – $500,000"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="applyUrl">Apply URL *</Label>
						<Input
							id="applyUrl"
							name="applyUrl"
							type="url"
							value={funding?.applyUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="region">Region *</Label>
						<select id="region" name="region" class={selectCls} value={funding?.region ?? ''}>
							{#each geographyOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mt-4 space-y-1.5">
					<Label>Description *</Label>
					<RichTextEditor
						bind:value={descriptionHtml}
						name="description"
						initialValue={funding?.description ?? ''}
					/>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`funding:${mode}:classification`}
				title="Classification"
				description="Open this only when you need taxonomy depth or linked organization context."
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
							value={funding?.organizationId ?? ''}
						>
							<option value="">— None —</option>
							{#each organizations as org}
								<option value={org.id}>{org.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="eligibilityType">Primary eligibility type</Label>
						<Input
							id="eligibilityType"
							name="eligibilityType"
							value={funding?.eligibilityType ?? ''}
							placeholder="e.g. Tribal governments"
						/>
					</div>
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<AdminOptionChipsField
						name="fundingTypes"
						label="Additional funding types"
						options={fundingTypeOptions.filter((option) => option.value)}
						selected={funding?.fundingTypes ?? []}
						placeholder="Add extra funding tags"
					/>
					<AdminOptionChipsField
						name="eligibilityTypes"
						label="Eligibility types"
						options={[
							{ value: 'Tribal governments', label: 'Tribal governments' },
							{ value: 'Nonprofits', label: 'Nonprofits' },
							{ value: 'Businesses', label: 'Businesses' },
							{ value: 'Artists', label: 'Artists' },
							{ value: 'Students', label: 'Students' }
						]}
						selected={funding?.eligibilityTypes ?? []}
						placeholder="Add eligibility tags"
					/>
					<AdminOptionChipsField
						name="focusAreas"
						label="Focus areas"
						options={fundingFocusOptions.filter((option) => option.value)}
						selected={funding?.focusAreas ?? []}
						placeholder="Add focus-area tags"
					/>
					<div class="space-y-1.5">
						<Label for="tags">Tags</Label>
						<Textarea
							id="tags"
							name="tags"
							rows={4}
							value={listValue(funding?.tags)}
							placeholder="One per line"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`funding:${mode}:details`}
				title="Cycle and amount details"
				description="Use these fields once the core opportunity is captured."
				defaultOpen={false}
				forceOpen={sectionSignals.details}
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="space-y-1.5">
						<Label for="applicationStatus">Application status</Label>
						<select
							id="applicationStatus"
							name="applicationStatus"
							class={selectCls}
							value={funding?.applicationStatus ?? ''}
						>
							{#each fundingStatusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="openDate">Open date</Label>
						<Input
							id="openDate"
							name="openDate"
							type="date"
							value={funding?.openDate ? funding.openDate.slice(0, 10) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="awardDate">Award date</Label>
						<Input
							id="awardDate"
							name="awardDate"
							type="date"
							value={funding?.awardDate ? funding.awardDate.slice(0, 10) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="amountMin">Minimum amount</Label>
						<Input
							id="amountMin"
							name="amountMin"
							type="number"
							step="0.01"
							value={funding?.amountMin != null ? String(funding.amountMin) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="amountMax">Maximum amount</Label>
						<Input
							id="amountMax"
							name="amountMax"
							type="number"
							step="0.01"
							value={funding?.amountMax != null ? String(funding.amountMax) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="fundingTerm">Funding term</Label>
						<Input
							id="fundingTerm"
							name="fundingTerm"
							value={funding?.fundingTerm ?? ''}
							placeholder="e.g. single-year, multi-year"
						/>
					</div>
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<label class="flex items-center gap-2 rounded-xl border border-[color:var(--rule)] p-3">
						<input
							type="checkbox"
							name="isRecurring"
							value="true"
							checked={funding?.isRecurring ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						<span class="text-sm font-medium">Recurring opportunity</span>
					</label>
					{#if recurringSelected}
						<div class="space-y-1.5">
							<Label for="recurringSchedule">Recurring schedule</Label>
							<Input
								id="recurringSchedule"
								name="recurringSchedule"
								value={funding?.recurringSchedule ?? ''}
								placeholder="e.g. Opens every September"
							/>
						</div>
					{/if}
					<label class="flex items-center gap-2 rounded-xl border border-[color:var(--rule)] p-3">
						<input
							type="checkbox"
							name="matchRequired"
							value="true"
							checked={funding?.matchRequired ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						<span class="text-sm font-medium">Match required</span>
					</label>
					{#if matchRequiredSelected}
						<div class="space-y-1.5">
							<Label for="matchRequirements">Match requirements</Label>
							<Textarea
								id="matchRequirements"
								name="matchRequirements"
								rows={3}
								value={funding?.matchRequirements ?? ''}
								placeholder="Describe any matching fund expectations"
							/>
						</div>
					{/if}
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="eligibleCosts">Eligible costs</Label>
						<Textarea
							id="eligibleCosts"
							name="eligibleCosts"
							rows={3}
							value={funding?.eligibleCosts ?? ''}
							placeholder="What expenses are eligible or excluded?"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="fundingCycleNotes">Funding cycle notes</Label>
						<Textarea
							id="fundingCycleNotes"
							name="fundingCycleNotes"
							rows={3}
							value={funding?.fundingCycleNotes ?? ''}
							placeholder="e.g. Annual cycle, future rounds expected"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`funding:${mode}:contact`}
				title="Links and contact"
				description="Hold the secondary contact and display fields until the opportunity is otherwise complete."
				defaultOpen={false}
				forceOpen={sectionSignals.contact}
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="space-y-1.5">
						<Label for="contactName">Contact name</Label>
						<Input id="contactName" name="contactName" value={funding?.contactName ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="contactEmail">Contact email</Label>
						<Input
							id="contactEmail"
							name="contactEmail"
							type="email"
							value={funding?.contactEmail ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="contactPhone">Contact phone</Label>
						<Input id="contactPhone" name="contactPhone" value={funding?.contactPhone ?? ''} />
					</div>
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="geographicRestrictions">Geographic restrictions</Label>
						<Textarea
							id="geographicRestrictions"
							name="geographicRestrictions"
							rows={3}
							value={funding?.geographicRestrictions ?? ''}
							placeholder="Free-text restrictions or notes"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="imageUrl">Image URL</Label>
						<Input
							id="imageUrl"
							name="imageUrl"
							type="url"
							value={funding?.imageUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="imageUrls">Additional image URLs</Label>
						<Textarea
							id="imageUrls"
							name="imageUrls"
							rows={4}
							value={funding?.imageUrls?.join('\n') ?? ''}
							placeholder="One URL per line"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`funding:${mode}:admin`}
				title="Admin and moderation"
				description="Keep publishing flags, status controls, and internal notes out of the initial authoring path."
				defaultOpen={false}
				forceOpen={sectionSignals.admin}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					{#if mode === 'edit'}
						<div class="space-y-1.5">
							<Label for="slug">Slug</Label>
							<Input
								id="slug"
								name="slug"
								value={funding?.slug ?? ''}
								placeholder="auto-generated"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="statusSelect">Moderation status</Label>
							<select
								id="statusSelect"
								name="status"
								class={selectCls}
								value={funding?.status ?? 'draft'}
							>
								<option value="draft">Draft</option>
								<option value="pending">Pending</option>
								<option value="published">Published</option>
								<option value="rejected">Rejected</option>
								<option value="cancelled">Cancelled</option>
							</select>
						</div>
					{/if}
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="adminNotes">Admin notes</Label>
						<Textarea
							id="adminNotes"
							name="adminNotes"
							rows={4}
							value={funding?.adminNotes ?? ''}
							placeholder="Internal notes for review and moderation"
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
							value={funding?.rejectionReason ?? ''}
							placeholder="Optional reason to store if the item is rejected"
						/>
					</div>
				{/if}

				<div class="mt-4 flex flex-wrap gap-6">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="featured"
							value="true"
							checked={funding?.featured ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Featured
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="unlisted"
							value="true"
							checked={funding?.unlisted ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Unlisted
					</label>
				</div>
			</AdminEditorSection>
		{/snippet}
	</AdminEditorShell>
</form>
