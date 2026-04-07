<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { RedPagesItem } from '$lib/data/kb';
	import AdminEditorAssistPanel from '$lib/components/organisms/admin/AdminEditorAssistPanel.svelte';
	import AdminEditorSection from '$lib/components/organisms/admin/AdminEditorSection.svelte';
	import AdminEditorShell from '$lib/components/organisms/admin/AdminEditorShell.svelte';
	import AdminOptionChipsField from '$lib/components/organisms/admin/AdminOptionChipsField.svelte';
	import AdminSubmissionContextCard from '$lib/components/organisms/admin/AdminSubmissionContextCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { redPagesServiceTypeOptions, redPagesAreaOptions } from '$lib/data/formSchema';
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
		business?: RedPagesItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
		previewHref?: string | null;
		liveHref?: string | null;
		submissionContext?: SubmissionContext | null;
	}

	let {
		business,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create listing' : 'Save listing',
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
		contact: false,
		admin: false
	});
	const initialVerifiedSelected = () => Boolean(business?.verified);
	let verifiedSelected = $state(initialVerifiedSelected());

	$effect(() => {
		descriptionHtml = business?.description ?? '';
		verifiedSelected = Boolean(business?.verified);
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

	function socialValue(values?: Record<string, string>) {
		if (!values) return '';
		return Object.entries(values)
			.map(([platform, url]) => `${platform}: ${url}`)
			.join('\n');
	}

	function linkedOrganization(id: string) {
		return organizations.find((organization) => organization.id === id)?.name ?? id;
	}

	function currentFieldDiffs(formData: FormData): EditorChangeLine[] {
		const next = [
			buildChangeLine('Business name', business?.name, getFormValue(formData, 'name')),
			buildChangeLine(
				'Tribal affiliation',
				business?.tribalAffiliation,
				getFormValue(formData, 'tribalAffiliation')
			),
			buildChangeLine('Service type', business?.serviceType, getFormValue(formData, 'serviceType')),
			buildChangeLine('Service area', business?.serviceArea, getFormValue(formData, 'serviceArea')),
			buildChangeLine('Website', business?.website, getFormValue(formData, 'website')),
			buildChangeLine('Email', business?.email, getFormValue(formData, 'email')),
			buildChangeLine('Phone', business?.phone, getFormValue(formData, 'phone')),
			buildChangeLine('Description', business?.description, descriptionHtml),
			buildChangeLine(
				'Organization',
				business?.organizationId ? linkedOrganization(business.organizationId) : null,
				getFormValue(formData, 'organizationId')
					? linkedOrganization(getFormValue(formData, 'organizationId'))
					: null
			)
		];
		return next.filter((entry): entry is EditorChangeLine => Boolean(entry));
	}

	function currentValidationIssues(formData: FormData): string[] {
		const issues: string[] = [];
		const name = getFormValue(formData, 'name');
		const tribalAffiliation = getFormValue(formData, 'tribalAffiliation');
		const website = getFormValue(formData, 'website');
		const logoUrl = getFormValue(formData, 'logoUrl');
		const imageUrl = getFormValue(formData, 'imageUrl');

		if (!name) issues.push('Business name is required.');
		if (!tribalAffiliation) issues.push('Tribal affiliation is required.');
		if (!isValidHttpUrl(website)) issues.push('Website must be a valid http or https URL.');
		if (!isValidHttpUrl(logoUrl)) issues.push('Logo URL must be a valid http or https URL.');
		if (!isValidHttpUrl(imageUrl)) issues.push('Image URL must be a valid http or https URL.');

		return issues;
	}

	function currentMissingFields(formData: FormData): string[] {
		const next: string[] = [];
		if (!getFormValue(formData, 'name')) next.push('Business name');
		if (!getFormValue(formData, 'tribalAffiliation')) next.push('Tribal affiliation');
		if (!getFormValue(formData, 'serviceType')) next.push('Service type');
		if (!getFormValue(formData, 'serviceArea')) next.push('Service area');
		if (!getFormValue(formData, 'website')) next.push('Website');
		if (!getFormValue(formData, 'email')) next.push('Email');
		if (!getFormValue(formData, 'phone')) next.push('Phone');
		if (!descriptionHtml.trim()) next.push('Description');
		return next;
	}

	function currentSectionSignals(formData: FormData) {
		verifiedSelected = formData.has('verified');
		return {
			classification: Boolean(
				getFormValue(formData, 'organizationId') ||
				getFormValue(formData, 'ownerName') ||
				getFormValue(formData, 'serviceTypes') ||
				getFormValue(formData, 'tags')
			),
			contact: Boolean(
				getFormValue(formData, 'address') ||
				getFormValue(formData, 'city') ||
				getFormValue(formData, 'state') ||
				getFormValue(formData, 'zip') ||
				getFormValue(formData, 'region') ||
				getFormValue(formData, 'logoUrl') ||
				getFormValue(formData, 'imageUrl') ||
				getFormValue(formData, 'certifications') ||
				getFormValue(formData, 'socialLinks') ||
				getFormValue(formData, 'tribalAffiliations') ||
				getFormValue(formData, 'ownershipIdentity')
			),
			admin: Boolean(
				getFormValue(formData, 'slug') ||
				getFormValue(formData, 'status') !==
					(mode === 'create' ? 'draft' : (business?.status ?? 'draft')) ||
				getFormValue(formData, 'adminNotes') ||
				getFormValue(formData, 'rejectionReason') ||
				formData.has('featured') ||
				formData.has('unlisted') ||
				verifiedSelected
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
					toast.success(mode === 'create' ? 'Listing created' : 'Listing saved');
				} else if (result.type === 'failure') {
					toast.error((result.data as { error?: string })?.error ?? 'Error saving listing');
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
			? 'Core directory details are ready to save.'
			: 'Capture the basics, then save.'}
	>
		{#snippet sidebar()}
			<AdminEditorAssistPanel
				status={mode === 'create' ? 'draft' : (business?.status ?? 'draft')}
				{previewHref}
				{liveHref}
				liveLabel="View live listing"
				{hasUnsavedChanges}
				{validationIssues}
				changedFields={changedFields.slice(0, 6)}
				{missingFields}
				{submitLabel}
				{submitting}
				publishedAt={business?.publishedAt ?? null}
				updatedAt={business?.updatedAt ?? null}
			/>
			<AdminSubmissionContextCard
				createdAt={submissionContext?.createdAt ?? business?.createdAt ?? null}
				submitterName={submissionContext?.submitterName ?? business?.submitterName ?? null}
				submitterEmail={submissionContext?.submitterEmail ?? business?.submitterEmail ?? null}
				contactName={submissionContext?.contactName ?? null}
				contactEmail={submissionContext?.contactEmail ?? null}
				contactPhone={submissionContext?.contactPhone ?? null}
			/>
		{/snippet}

		{#snippet children()}
			<AdminEditorSection
				storageKey={`red-pages:${mode}:essentials`}
				title="Essentials"
				description="Capture the public-facing basics first so the listing does not feel like a giant intake form."
				defaultOpen={true}
				forceOpen={true}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="name">Business / organization name *</Label>
						<Input
							id="name"
							name="name"
							required
							value={business?.name ?? business?.title ?? ''}
							placeholder="e.g. Numa Designs"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="tribalAffiliation">Tribal affiliation *</Label>
						<Input
							id="tribalAffiliation"
							name="tribalAffiliation"
							required
							value={business?.tribalAffiliation ?? ''}
							placeholder="e.g. Paiute / Washoe"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="serviceType">Service type *</Label>
						<select
							id="serviceType"
							name="serviceType"
							class={selectCls}
							value={business?.serviceType ?? ''}
						>
							{#each redPagesServiceTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="serviceArea">Service area *</Label>
						<select
							id="serviceArea"
							name="serviceArea"
							class={selectCls}
							value={business?.serviceArea ?? business?.region ?? ''}
						>
							{#each redPagesAreaOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="website">Website *</Label>
						<Input
							id="website"
							name="website"
							type="url"
							value={business?.website ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="email">Email *</Label>
						<Input id="email" name="email" type="email" value={business?.email ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="phone">Phone *</Label>
						<Input id="phone" name="phone" value={business?.phone ?? ''} />
					</div>
				</div>

				<div class="mt-4 space-y-1.5">
					<Label>Description *</Label>
					<RichTextEditor
						bind:value={descriptionHtml}
						name="description"
						initialValue={business?.description ?? ''}
					/>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`red-pages:${mode}:classification`}
				title="Classification"
				description="Use this when you need richer service taxonomy or linked organization context."
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
							value={business?.organizationId ?? ''}
						>
							<option value="">— None —</option>
							{#each organizations as org}
								<option value={org.id}>{org.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="ownerName">Owner name</Label>
						<Input id="ownerName" name="ownerName" value={business?.ownerName ?? ''} />
					</div>
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<AdminOptionChipsField
						name="serviceTypes"
						label="Additional service types"
						options={redPagesServiceTypeOptions.filter((option) => option.value)}
						selected={business?.serviceTypes ?? []}
						placeholder="Add extra service tags"
						description="Use these when the listing spans more than one service category."
					/>
					<div class="space-y-1.5">
						<Label for="tags">Tags</Label>
						<Textarea
							id="tags"
							name="tags"
							rows={4}
							value={listValue(business?.tags)}
							placeholder="One per line"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`red-pages:${mode}:contact`}
				title="Contact and identity extras"
				description="Keep secondary contact, image, and identity metadata out of the primary data-entry path."
				defaultOpen={false}
				forceOpen={sectionSignals.contact}
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="space-y-1.5">
						<Label for="address">Address</Label>
						<Input id="address" name="address" value={business?.address ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="city">City</Label>
						<Input id="city" name="city" value={business?.city ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="state">State</Label>
						<Input id="state" name="state" value={business?.state ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="zip">ZIP</Label>
						<Input id="zip" name="zip" value={business?.zip ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="region">Region</Label>
						<Input id="region" name="region" value={business?.region ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="logoUrl">Logo URL</Label>
						<Input
							id="logoUrl"
							name="logoUrl"
							type="url"
							value={business?.logoUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="imageUrl">Image URL</Label>
						<Input
							id="imageUrl"
							name="imageUrl"
							type="url"
							value={business?.imageUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="imageUrls">Additional image URLs</Label>
						<Textarea
							id="imageUrls"
							name="imageUrls"
							rows={4}
							value={business?.imageUrls?.join('\n') ?? ''}
							placeholder="One URL per line"
						/>
					</div>
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="tribalAffiliations">Additional tribal affiliations</Label>
						<Textarea
							id="tribalAffiliations"
							name="tribalAffiliations"
							rows={4}
							value={listValue(business?.tribalAffiliations)}
							placeholder="One per line"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="ownershipIdentity">Ownership identity</Label>
						<Textarea
							id="ownershipIdentity"
							name="ownershipIdentity"
							rows={4}
							value={listValue(business?.ownershipIdentity)}
							placeholder="One per line"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="certifications">Certifications</Label>
						<Textarea
							id="certifications"
							name="certifications"
							rows={4}
							value={listValue(business?.certifications)}
							placeholder="One per line"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="socialLinks">Social links</Label>
						<Textarea
							id="socialLinks"
							name="socialLinks"
							rows={4}
							value={socialValue(business?.socialLinks)}
							placeholder="instagram: https://…"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`red-pages:${mode}:admin`}
				title="Admin and moderation"
				description="Keep moderation state, internal notes, and verification controls tucked away until they are needed."
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
								value={business?.slug ?? ''}
								placeholder="auto-generated"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="statusSelect">Moderation status</Label>
							<select
								id="statusSelect"
								name="status"
								class={selectCls}
								value={business?.status ?? 'draft'}
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
							value={business?.adminNotes ?? ''}
							placeholder="Internal moderation or sourcing notes"
						/>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap gap-6">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="featured"
							value="true"
							checked={business?.featured ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Featured
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="unlisted"
							value="true"
							checked={business?.unlisted ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Unlisted
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="verified"
							value="true"
							checked={business?.verified ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Verified
					</label>
				</div>

				{#if mode === 'edit'}
					<div class="mt-4 space-y-1.5">
						<Label for="rejectionReason">Rejection reason</Label>
						<Textarea
							id="rejectionReason"
							name="rejectionReason"
							rows={3}
							value={business?.rejectionReason ?? ''}
							placeholder="Optional reason to store if the listing is rejected"
						/>
					</div>
				{/if}
			</AdminEditorSection>
		{/snippet}
	</AdminEditorShell>
</form>
