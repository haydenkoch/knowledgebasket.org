<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { ToolboxItem } from '$lib/data/kb';
	import AdminEditorAssistPanel from '$lib/components/organisms/admin/AdminEditorAssistPanel.svelte';
	import AdminEditorSection from '$lib/components/organisms/admin/AdminEditorSection.svelte';
	import AdminEditorShell from '$lib/components/organisms/admin/AdminEditorShell.svelte';
	import AdminOptionChipsField from '$lib/components/organisms/admin/AdminOptionChipsField.svelte';
	import AdminSubmissionContextCard from '$lib/components/organisms/admin/AdminSubmissionContextCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { toolboxMediaTypeOptions, toolboxCategoryOptions } from '$lib/data/formSchema';
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
		resource?: ToolboxItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
		previewHref?: string | null;
		liveHref?: string | null;
		submissionContext?: SubmissionContext | null;
	}

	let {
		resource,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create resource' : 'Save resource',
		previewHref = null,
		liveHref = null,
		submissionContext = null
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');
	let bodyHtml = $state('');
	let formEl = $state<HTMLFormElement | null>(null);
	let initialSnapshot = $state('');
	let hasUnsavedChanges = $state(false);
	let validationIssues = $state<string[]>([]);
	let changedFields = $state<EditorChangeLine[]>([]);
	let missingFields = $state<string[]>([]);
	let sectionSignals = $state({
		classification: false,
		media: false,
		admin: false
	});
	const initialContentModeValue = () => resource?.contentMode ?? 'link';
	let contentModeValue = $state(initialContentModeValue());

	$effect(() => {
		descriptionHtml = resource?.description ?? '';
		bodyHtml = resource?.body ?? '';
		contentModeValue = resource?.contentMode ?? 'link';
		queueMicrotask(async () => {
			await tick();
			syncBaseline();
		});
	});

	const selectCls =
		'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

	const contentModeOptions = [
		{ value: 'link', label: 'External link' },
		{ value: 'hosted', label: 'Hosted article / page' },
		{ value: 'file', label: 'File / download' }
	] as const;

	function listValue(values?: string[]) {
		return values?.join('\n') ?? '';
	}

	function linkedOrganization(id: string) {
		return organizations.find((organization) => organization.id === id)?.name ?? id;
	}

	function currentFieldDiffs(formData: FormData): EditorChangeLine[] {
		const next = [
			buildChangeLine('Title', resource?.title, getFormValue(formData, 'title')),
			buildChangeLine(
				'Resource type',
				resource?.resourceType,
				getFormValue(formData, 'resourceType')
			),
			buildChangeLine('Content mode', resource?.contentMode, getFormValue(formData, 'contentMode')),
			buildChangeLine('Source', resource?.sourceName, getFormValue(formData, 'sourceName')),
			buildChangeLine('Primary category', resource?.category, getFormValue(formData, 'category')),
			buildChangeLine('Description', resource?.description, descriptionHtml),
			buildChangeLine('Hosted body', resource?.body, bodyHtml),
			buildChangeLine(
				'Organization',
				resource?.organizationId ? linkedOrganization(resource.organizationId) : null,
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
		const resourceType = getFormValue(formData, 'resourceType');
		const contentMode = getFormValue(formData, 'contentMode') || 'link';
		const externalUrl = getFormValue(formData, 'externalUrl');
		const fileUrl = getFormValue(formData, 'fileUrl');
		const imageUrl = getFormValue(formData, 'imageUrl');

		if (!title) issues.push('Title is required.');
		if (!resourceType) issues.push('Resource type is required.');
		if (contentMode === 'link' && !externalUrl)
			issues.push('External URL is required for link resources.');
		if (contentMode === 'file' && !fileUrl) issues.push('File URL is required for file resources.');
		if (!isValidHttpUrl(externalUrl))
			issues.push('External URL must be a valid http or https URL.');
		if (!isValidHttpUrl(fileUrl)) issues.push('File URL must be a valid http or https URL.');
		if (!isValidHttpUrl(imageUrl)) issues.push('Image URL must be a valid http or https URL.');

		return issues;
	}

	function currentMissingFields(formData: FormData): string[] {
		const next: string[] = [];
		const contentMode = getFormValue(formData, 'contentMode') || 'link';
		if (!getFormValue(formData, 'title')) next.push('Title');
		if (!getFormValue(formData, 'resourceType')) next.push('Resource type');
		if (!contentMode) next.push('Content mode');
		if (!getFormValue(formData, 'sourceName')) next.push('Source or publisher');
		if (!getFormValue(formData, 'category')) next.push('Primary category');
		if (!descriptionHtml.trim()) next.push('Description');
		if (contentMode === 'link' && !getFormValue(formData, 'externalUrl')) next.push('External URL');
		if (contentMode === 'file' && !getFormValue(formData, 'fileUrl')) next.push('File URL');
		return next;
	}

	function currentSectionSignals(formData: FormData) {
		contentModeValue = getFormValue(formData, 'contentMode') || 'link';
		return {
			classification: Boolean(
				getFormValue(formData, 'organizationId') ||
				getFormValue(formData, 'author') ||
				getFormValue(formData, 'mediaType') ||
				getFormValue(formData, 'publishDate') ||
				getFormValue(formData, 'lastReviewedAt') ||
				getFormValue(formData, 'categories')
			),
			media: Boolean(
				getFormValue(formData, 'imageUrl') ||
				getFormValue(formData, 'tags') ||
				(contentModeValue === 'hosted' && bodyHtml.trim())
			),
			admin: Boolean(
				getFormValue(formData, 'slug') ||
				getFormValue(formData, 'status') !==
					(mode === 'create' ? 'draft' : (resource?.status ?? 'draft')) ||
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
					toast.success(mode === 'create' ? 'Resource created' : 'Resource saved');
				} else if (result.type === 'failure') {
					toast.error((result.data as { error?: string })?.error ?? 'Error saving resource');
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
		void bodyHtml;
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
			? 'Core resource details are ready to save.'
			: 'Finish the essentials, then save.'}
	>
		{#snippet sidebar()}
			<AdminEditorAssistPanel
				status={mode === 'create' ? 'draft' : (resource?.status ?? 'draft')}
				{previewHref}
				{liveHref}
				liveLabel="View live resource"
				{hasUnsavedChanges}
				{validationIssues}
				changedFields={changedFields.slice(0, 6)}
				{missingFields}
				{submitLabel}
				{submitting}
				publishedAt={resource?.publishedAt ?? null}
				updatedAt={resource?.updatedAt ?? null}
			/>
			<AdminSubmissionContextCard
				createdAt={submissionContext?.createdAt ?? resource?.createdAt ?? null}
				submitterName={submissionContext?.submitterName ?? resource?.submitterName ?? null}
				submitterEmail={submissionContext?.submitterEmail ?? resource?.submitterEmail ?? null}
				contactName={submissionContext?.contactName ?? null}
				contactEmail={submissionContext?.contactEmail ?? null}
				contactPhone={submissionContext?.contactPhone ?? null}
			/>
		{/snippet}

		{#snippet children()}
			<AdminEditorSection
				storageKey={`toolbox:${mode}:essentials`}
				title="Essentials"
				description="Capture the minimum information people need before you worry about secondary metadata."
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
							value={resource?.title ?? ''}
							placeholder="Resource title"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="resourceType">Resource type *</Label>
						<select
							id="resourceType"
							name="resourceType"
							class={selectCls}
							value={resource?.resourceType ?? ''}
							required
						>
							{#each toolboxMediaTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="contentMode">Content mode *</Label>
						<select
							id="contentMode"
							name="contentMode"
							class={selectCls}
							value={resource?.contentMode ?? 'link'}
							required
						>
							{#each contentModeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="sourceName">Source / publisher *</Label>
						<Input
							id="sourceName"
							name="sourceName"
							value={resource?.sourceName ?? ''}
							placeholder="e.g. Indigenous Futures Society"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="category">Primary category *</Label>
						<select
							id="category"
							name="category"
							class={selectCls}
							value={resource?.category ?? ''}
						>
							{#each toolboxCategoryOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					{#if contentModeValue === 'link'}
						<div class="space-y-1.5 sm:col-span-2">
							<Label for="externalUrl">External URL *</Label>
							<Input
								id="externalUrl"
								name="externalUrl"
								type="url"
								value={resource?.externalUrl ?? ''}
								placeholder="https://…"
							/>
						</div>
					{:else if contentModeValue === 'file'}
						<div class="space-y-1.5 sm:col-span-2">
							<Label for="fileUrl">File URL *</Label>
							<Input
								id="fileUrl"
								name="fileUrl"
								type="url"
								value={resource?.fileUrl ?? ''}
								placeholder="https://…"
							/>
						</div>
					{:else}
						<div
							class="rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/45 p-4 sm:col-span-2"
						>
							<p class="text-sm text-[var(--mid)]">
								Hosted resources use the saved body content below instead of a file or external
								link.
							</p>
						</div>
					{/if}
				</div>

				<div class="mt-4 space-y-1.5">
					<Label>Description *</Label>
					<RichTextEditor
						bind:value={descriptionHtml}
						name="description"
						initialValue={resource?.description ?? ''}
					/>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`toolbox:${mode}:details`}
				title="Details"
				description="Use this for richer hosted content and review-facing notes about what the resource contains."
				defaultOpen={contentModeValue === 'hosted'}
				forceOpen={contentModeValue === 'hosted' || Boolean(bodyHtml.trim())}
			>
				{#if contentModeValue === 'hosted'}
					<div class="space-y-1.5">
						<Label>Hosted body</Label>
						<RichTextEditor bind:value={bodyHtml} name="body" initialValue={resource?.body ?? ''} />
					</div>
				{:else}
					<div
						class="rounded-xl border border-dashed border-[color:var(--rule)] p-4 text-sm text-[var(--mid)]"
					>
						Switch the content mode to <span class="font-medium">Hosted article / page</span> to edit
						the full hosted body here.
					</div>
				{/if}
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`toolbox:${mode}:classification`}
				title="Classification"
				description="Open only when you want extra taxonomy, author, or review metadata."
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
							value={resource?.organizationId ?? ''}
						>
							<option value="">— None —</option>
							{#each organizations as org}
								<option value={org.id}>{org.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="author">Author</Label>
						<Input id="author" name="author" value={resource?.author ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="mediaType">Media type label</Label>
						<Input
							id="mediaType"
							name="mediaType"
							value={resource?.mediaType ?? ''}
							placeholder="Defaults to resource type if left blank"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="publishDate">Publish date</Label>
						<Input
							id="publishDate"
							name="publishDate"
							type="date"
							value={resource?.publishDate ? resource.publishDate.slice(0, 10) : ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="lastReviewedAt">Last reviewed date</Label>
						<Input
							id="lastReviewedAt"
							name="lastReviewedAt"
							type="date"
							value={resource?.lastReviewedAt ? resource.lastReviewedAt.slice(0, 10) : ''}
						/>
					</div>
				</div>

				<div class="mt-4">
					<AdminOptionChipsField
						name="categories"
						label="Additional categories"
						options={toolboxCategoryOptions.filter((option) => option.value)}
						selected={resource?.categories ?? []}
						placeholder="Add extra category tags"
						description="Use these only when one primary category is not enough."
					/>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`toolbox:${mode}:media`}
				title="Media and display"
				description="Tuck away image and freeform tagging work until the resource is otherwise ready."
				defaultOpen={false}
				forceOpen={sectionSignals.media}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="imageUrl">Image URL</Label>
						<Input
							id="imageUrl"
							name="imageUrl"
							type="url"
							value={resource?.imageUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="tags">Tags</Label>
						<Textarea
							id="tags"
							name="tags"
							rows={4}
							value={listValue(resource?.tags)}
							placeholder="One per line"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`toolbox:${mode}:admin`}
				title="Admin and moderation"
				description="Keep internal controls out of the way until you are ready to publish or moderate."
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
								value={resource?.slug ?? ''}
								placeholder="auto-generated"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="statusSelect">Moderation status</Label>
							<select
								id="statusSelect"
								name="status"
								class={selectCls}
								value={resource?.status ?? 'draft'}
							>
								<option value="draft">Draft</option>
								<option value="pending">Pending</option>
								<option value="published">Published</option>
								<option value="rejected">Rejected</option>
							</select>
						</div>
					{/if}
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="adminNotes">Admin notes</Label>
						<Textarea
							id="adminNotes"
							name="adminNotes"
							rows={4}
							value={resource?.adminNotes ?? ''}
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
							value={resource?.rejectionReason ?? ''}
							placeholder="Optional reason to store if the resource is rejected"
						/>
					</div>
				{/if}

				<div class="mt-4 flex flex-wrap gap-6">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="featured"
							value="true"
							checked={resource?.featured ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Featured
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="unlisted"
							value="true"
							checked={resource?.unlisted ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Unlisted
					</label>
				</div>
			</AdminEditorSection>
		{/snippet}
	</AdminEditorShell>
</form>
