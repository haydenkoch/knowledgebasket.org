<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { EventItem } from '$lib/data/kb';
	import AdminEditorAssistPanel from '$lib/components/organisms/admin/AdminEditorAssistPanel.svelte';
	import AdminEditorSection from '$lib/components/organisms/admin/AdminEditorSection.svelte';
	import AdminEditorShell from '$lib/components/organisms/admin/AdminEditorShell.svelte';
	import AdminSubmissionContextCard from '$lib/components/organisms/admin/AdminSubmissionContextCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { eventTypeOptions, eventAudienceOptions, eventCostOptions } from '$lib/data/formSchema';
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
		event?: EventItem & Record<string, unknown>;
		organizations?: { id: string; name: string }[];
		venues?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		taxonomyTags?: { slug: string; label: string; group: string }[];
		regionOptions?: { value: string; label: string }[];
		audienceOptions?: { value: string; label: string }[];
		costOptions?: { value: string; label: string }[];
		previewHref?: string | null;
		liveHref?: string | null;
		submissionContext?: SubmissionContext | null;
	}

	let {
		event,
		organizations = [],
		venues = [],
		action = '?/update',
		mode = 'edit',
		regionOptions = [],
		audienceOptions = [],
		costOptions = [],
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
		details: false,
		relationships: false,
		links: false,
		media: false,
		admin: false
	});
	const initialEventFormatValue = () => event?.eventFormat ?? '';
	let eventFormatValue = $state(initialEventFormatValue());

	$effect(() => {
		descriptionHtml = event?.description ?? '';
		eventFormatValue = event?.eventFormat ?? '';
		queueMicrotask(async () => {
			await tick();
			syncBaseline();
		});
	});

	const selectCls =
		'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

	function linkedName(items: Array<{ id: string; name: string }>, id: string) {
		return items.find((item) => item.id === id)?.name ?? id;
	}

	function currentFieldDiffs(formData: FormData): EditorChangeLine[] {
		const next = [
			buildChangeLine('Title', event?.title, getFormValue(formData, 'title')),
			buildChangeLine('Start date', event?.startDate, getFormValue(formData, 'startDate')),
			buildChangeLine('End date', event?.endDate, getFormValue(formData, 'endDate')),
			buildChangeLine('Event format', event?.eventFormat, getFormValue(formData, 'eventFormat')),
			buildChangeLine('Location', event?.location, getFormValue(formData, 'location')),
			buildChangeLine('Region', event?.region, getFormValue(formData, 'region')),
			buildChangeLine('Event URL', event?.eventUrl, getFormValue(formData, 'eventUrl')),
			buildChangeLine(
				'Registration URL',
				event?.registrationUrl,
				getFormValue(formData, 'registrationUrl')
			),
			buildChangeLine('Description', event?.description, descriptionHtml),
			buildChangeLine(
				'Organization',
				event?.organizationId ? linkedName(organizations, event.organizationId) : null,
				getFormValue(formData, 'organizationId')
					? linkedName(organizations, getFormValue(formData, 'organizationId'))
					: null
			),
			buildChangeLine(
				'Venue',
				event?.venueId ? linkedName(venues, event.venueId) : null,
				getFormValue(formData, 'venueId')
					? linkedName(venues, getFormValue(formData, 'venueId'))
					: null
			)
		];
		return next.filter((entry): entry is EditorChangeLine => Boolean(entry));
	}

	function currentValidationIssues(formData: FormData): string[] {
		const issues: string[] = [];
		const title = getFormValue(formData, 'title');
		const startDate = getFormValue(formData, 'startDate');
		const endDate = getFormValue(formData, 'endDate');
		const eventUrl = getFormValue(formData, 'eventUrl');
		const registrationUrl = getFormValue(formData, 'registrationUrl');
		const imageUrl = getFormValue(formData, 'imageUrl');

		if (!title) issues.push('Title is required.');
		if (startDate && endDate && new Date(endDate).getTime() < new Date(startDate).getTime()) {
			issues.push('End date must be after the start date.');
		}
		if (!isValidHttpUrl(eventUrl)) issues.push('Event URL must be a valid http or https URL.');
		if (!isValidHttpUrl(registrationUrl))
			issues.push('Registration URL must be a valid http or https URL.');
		if (!isValidHttpUrl(imageUrl)) issues.push('Image URL must be a valid http or https URL.');
		if (!isValidHttpUrl(getFormValue(formData, 'virtualEventUrl')))
			issues.push('Virtual event URL must be a valid http or https URL.');
		if (!isValidHttpUrl(getFormValue(formData, 'waitlistUrl')))
			issues.push('Waitlist URL must be a valid http or https URL.');

		return issues;
	}

	function currentMissingFields(formData: FormData): string[] {
		const next: string[] = [];
		const hasPrimaryUrl = Boolean(
			getFormValue(formData, 'eventUrl') || getFormValue(formData, 'registrationUrl')
		);
		if (!getFormValue(formData, 'title')) next.push('Title');
		if (!getFormValue(formData, 'startDate')) next.push('Start date');
		if (!getFormValue(formData, 'endDate')) next.push('End date');
		if (!getFormValue(formData, 'eventFormat')) next.push('Event format');
		if (!getFormValue(formData, 'location')) next.push('Location label');
		if (!getFormValue(formData, 'region')) next.push('Region');
		if (!hasPrimaryUrl) next.push('Event URL or registration URL');
		if (!descriptionHtml.trim()) next.push('Description');
		return next;
	}

	function currentSectionSignals(formData: FormData) {
		eventFormatValue = getFormValue(formData, 'eventFormat');
		return {
			details: Boolean(
				getFormValue(formData, 'type') ||
				getFormValue(formData, 'audience') ||
				getFormValue(formData, 'cost') ||
				getFormValue(formData, 'timezone') ||
				getFormValue(formData, 'capacity') ||
				getFormValue(formData, 'ageRestriction') ||
				getFormValue(formData, 'doorsOpenAt') ||
				getFormValue(formData, 'address') ||
				formData.has('isAllDay') ||
				formData.has('soldOut')
			),
			relationships: Boolean(
				getFormValue(formData, 'organizationId') ||
				getFormValue(formData, 'venueId') ||
				getFormValue(formData, 'hostOrg') ||
				getFormValue(formData, 'parentEventId') ||
				getFormValue(formData, 'lat') ||
				getFormValue(formData, 'lng')
			),
			links: Boolean(
				getFormValue(formData, 'registrationUrl') ||
				getFormValue(formData, 'registrationDeadline') ||
				getFormValue(formData, 'contactEmail') ||
				getFormValue(formData, 'contactName') ||
				getFormValue(formData, 'contactPhone') ||
				getFormValue(formData, 'accessibilityNotes') ||
				getFormValue(formData, 'virtualEventUrl') ||
				getFormValue(formData, 'waitlistUrl')
			),
			media: Boolean(
				getFormValue(formData, 'imageUrl') ||
				getFormValue(formData, 'imageUrls') ||
				getFormValue(formData, 'tags') ||
				getFormValue(formData, 'pricingTiers')
			),
			admin: Boolean(
				getFormValue(formData, 'slug') ||
				getFormValue(formData, 'status') !==
					(mode === 'create' ? 'draft' : (event?.status ?? 'draft')) ||
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
				if (result.type === 'success') toast.success(mode === 'create' ? 'Event created' : 'Saved');
				else if (result.type === 'failure')
					toast.error((result.data as { error?: string })?.error ?? 'Error saving');
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

	const locationLabel = $derived(
		eventFormatValue === 'online' ? 'Online location label' : 'Location label'
	);
	const locationPlaceholder = $derived(
		eventFormatValue === 'online' ? 'Zoom, Livestream, Virtual workshop' : 'Placerville, CA'
	);
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
		submitLabel={mode === 'create' ? 'Create event' : 'Save event'}
		{submitting}
		mobileSummary={missingFields.length === 0
			? 'Core event details are ready to save.'
			: 'Capture the essentials, then save.'}
	>
		{#snippet sidebar()}
			<AdminEditorAssistPanel
				status={mode === 'create' ? 'draft' : (event?.status ?? 'draft')}
				{previewHref}
				{liveHref}
				liveLabel="View live event"
				{hasUnsavedChanges}
				{validationIssues}
				changedFields={changedFields.slice(0, 6)}
				{missingFields}
				submitLabel={mode === 'create' ? 'Create event' : 'Save event'}
				{submitting}
				publishedAt={event?.publishedAt ?? null}
				updatedAt={event?.updatedAt ?? null}
			/>
			<AdminSubmissionContextCard
				createdAt={submissionContext?.createdAt ?? event?.createdAt ?? null}
				submitterName={submissionContext?.submitterName ?? event?.submitterName ?? null}
				submitterEmail={submissionContext?.submitterEmail ?? event?.submitterEmail ?? null}
				contactName={submissionContext?.contactName ?? event?.contactName ?? null}
				contactEmail={submissionContext?.contactEmail ?? event?.contactEmail ?? null}
				contactPhone={submissionContext?.contactPhone ?? event?.contactPhone ?? null}
			/>
		{/snippet}

		{#snippet children()}
			<AdminEditorSection
				storageKey={`events:${mode}:essentials`}
				title="Essentials"
				description="Start with the event details editors reach for first."
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
							value={event?.title ?? ''}
							placeholder="Event title"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="startDate">Start date *</Label>
						<Input
							id="startDate"
							name="startDate"
							type="datetime-local"
							value={event?.startDateInput ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="endDate">End date *</Label>
						<Input
							id="endDate"
							name="endDate"
							type="datetime-local"
							value={event?.endDateInput ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="eventFormat">Event format *</Label>
						<select
							id="eventFormat"
							name="eventFormat"
							class={selectCls}
							value={event?.eventFormat ?? ''}
						>
							<option value="">— Select —</option>
							<option value="in_person">In person</option>
							<option value="online">Online</option>
							<option value="hybrid">Hybrid</option>
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="location">{locationLabel} *</Label>
						<Input
							id="location"
							name="location"
							value={event?.location ?? ''}
							placeholder={locationPlaceholder}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="region">Region *</Label>
						<select id="region" name="region" class={selectCls} value={event?.region ?? ''}>
							<option value="">— Select —</option>
							{#if regionOptions.length}
								{#each regionOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							{:else}
								<option value="California">California</option>
								<option value="Sierra Nevada">Sierra Nevada</option>
								<option value="National">National</option>
							{/if}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="eventUrl">Event URL</Label>
						<Input
							id="eventUrl"
							name="eventUrl"
							type="url"
							value={event?.eventUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="registrationUrl">Registration URL</Label>
						<Input
							id="registrationUrl"
							name="registrationUrl"
							type="url"
							value={event?.registrationUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
				</div>

				<div class="mt-4 space-y-1.5">
					<Label>Description *</Label>
					<RichTextEditor
						bind:value={descriptionHtml}
						name="description"
						initialValue={event?.description ?? ''}
					/>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`events:${mode}:details`}
				title="Details and discovery"
				description="Open this for classification fields that improve browsing but are not needed for the first draft."
				defaultOpen={false}
				forceOpen={sectionSignals.details}
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="space-y-1.5">
						<Label for="type">Type</Label>
						<select id="type" name="type" class={selectCls} value={event?.type ?? ''}>
							{#each eventTypeOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="audience">Audience</Label>
						<select id="audience" name="audience" class={selectCls} value={event?.audience ?? ''}>
							{#if audienceOptions.length}
								{#each audienceOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							{:else}
								{#each eventAudienceOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							{/if}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="cost">Cost</Label>
						<select id="cost" name="cost" class={selectCls} value={event?.cost ?? ''}>
							{#if costOptions.length}
								{#each costOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							{:else}
								{#each eventCostOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							{/if}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="timezone">Timezone</Label>
						<Input
							id="timezone"
							name="timezone"
							value={event?.timezone ?? ''}
							placeholder="America/Los_Angeles"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="capacity">Capacity</Label>
						<Input
							id="capacity"
							name="capacity"
							type="number"
							min="0"
							value={event?.capacity ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="ageRestriction">Age restriction</Label>
						<Input
							id="ageRestriction"
							name="ageRestriction"
							value={event?.ageRestriction ?? ''}
							placeholder="All ages / 21+"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="doorsOpenAt">Doors open</Label>
						<Input
							id="doorsOpenAt"
							name="doorsOpenAt"
							type="datetime-local"
							value={event?.doorsOpenAtInput ?? ''}
						/>
					</div>
					<div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
						<Label for="address">Street address</Label>
						<Input
							id="address"
							name="address"
							value={event?.address ?? ''}
							placeholder="Optional address or meeting point"
						/>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap gap-6">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="isAllDay"
							value="true"
							checked={event?.isAllDay ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						All-day event
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="soldOut"
							value="true"
							checked={event?.soldOut ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Sold out
					</label>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`events:${mode}:relationships`}
				title="Organizations and venue"
				description="Linked organizations and venues stay out of the way until you need the richer admin wiring."
				defaultOpen={false}
				forceOpen={sectionSignals.relationships}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="organizationId">Organization</Label>
						<select
							id="organizationId"
							name="organizationId"
							class={selectCls}
							value={event?.organizationId ?? ''}
						>
							<option value="">— None —</option>
							{#each organizations as org}
								<option value={org.id}>{org.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="venueId">Venue</Label>
						<select id="venueId" name="venueId" class={selectCls} value={event?.venueId ?? ''}>
							<option value="">— None —</option>
							{#each venues as venue}
								<option value={venue.id}>{venue.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="hostOrg">Host organization label</Label>
						<Input id="hostOrg" name="hostOrg" value={event?.hostOrg ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="parentEventId">Parent event ID</Label>
						<Input
							id="parentEventId"
							name="parentEventId"
							value={event?.parentEventId ?? ''}
							placeholder="Series parent event UUID"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="lat">Latitude</Label>
						<Input id="lat" name="lat" type="number" step="any" value={event?.lat ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="lng">Longitude</Label>
						<Input id="lng" name="lng" type="number" step="any" value={event?.lng ?? ''} />
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`events:${mode}:links`}
				title="Links and contact"
				description="Keep secondary logistics and public contact fields collapsed until they are needed."
				defaultOpen={false}
				forceOpen={sectionSignals.links}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="contactName">Contact name</Label>
						<Input id="contactName" name="contactName" value={event?.contactName ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="contactEmail">Contact email</Label>
						<Input
							id="contactEmail"
							name="contactEmail"
							type="email"
							value={event?.contactEmail ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="contactPhone">Contact phone</Label>
						<Input id="contactPhone" name="contactPhone" value={event?.contactPhone ?? ''} />
					</div>
					<div class="space-y-1.5">
						<Label for="registrationDeadline">Registration deadline</Label>
						<Input
							id="registrationDeadline"
							name="registrationDeadline"
							type="date"
							value={event?.registrationDeadlineInput ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="virtualEventUrl">Virtual event URL</Label>
						<Input
							id="virtualEventUrl"
							name="virtualEventUrl"
							type="url"
							value={event?.virtualEventUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="waitlistUrl">Waitlist URL</Label>
						<Input
							id="waitlistUrl"
							name="waitlistUrl"
							type="url"
							value={event?.waitlistUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="accessibilityNotes">Accessibility notes</Label>
						<Textarea
							id="accessibilityNotes"
							name="accessibilityNotes"
							rows={3}
							value={event?.accessibilityNotes ?? ''}
							placeholder="Optional accessibility or accommodation details"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`events:${mode}:media`}
				title="Media and display"
				description="Add images and internal discovery tags after the core event is already useful."
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
							value={event?.imageUrl ?? ''}
							placeholder="https://…"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="tags">Tags</Label>
						<Textarea
							id="tags"
							name="tags"
							rows={4}
							value={event?.tags?.join('\n') ?? ''}
							placeholder="One per line"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="imageUrls">Additional image URLs</Label>
						<Textarea
							id="imageUrls"
							name="imageUrls"
							rows={4}
							value={event?.imageUrls?.join('\n') ?? ''}
							placeholder="One URL per line"
						/>
					</div>
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="pricingTiers">Pricing tiers JSON</Label>
						<Textarea
							id="pricingTiers"
							name="pricingTiers"
							rows={5}
							value={event?.pricingTiers ? JSON.stringify(event.pricingTiers, null, 2) : '[]'}
							placeholder="JSON array of pricing tiers"
						/>
					</div>
				</div>
			</AdminEditorSection>

			<AdminEditorSection
				storageKey={`events:${mode}:admin`}
				title="Admin and moderation"
				description="Keep moderation controls and internal flags out of the default event-writing flow."
				defaultOpen={false}
				forceOpen={sectionSignals.admin}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					{#if mode === 'edit'}
						<div class="space-y-1.5">
							<Label for="slug">Slug</Label>
							<Input id="slug" name="slug" value={event?.slug ?? ''} placeholder="auto-generated" />
						</div>
						<div class="space-y-1.5">
							<Label for="statusSelect">Moderation status</Label>
							<select
								id="statusSelect"
								name="status"
								class={selectCls}
								value={event?.status ?? 'draft'}
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
							rows={3}
							value={event?.adminNotes ?? ''}
							placeholder="Internal notes (not shown publicly)"
						/>
					</div>
					<div class="space-y-1.5 sm:col-span-2">
						<Label for="rejectionReason">Rejection reason</Label>
						<Textarea
							id="rejectionReason"
							name="rejectionReason"
							rows={2}
							value={event?.rejectionReason ?? ''}
							placeholder="Only used when the event is rejected"
						/>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap gap-6">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="featured"
							value="true"
							checked={event?.featured ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Featured
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							name="unlisted"
							value="true"
							checked={event?.unlisted ?? false}
							class="h-4 w-4 rounded border-input"
						/>
						Unlisted
					</label>
				</div>
			</AdminEditorSection>
		{/snippet}
	</AdminEditorShell>
</form>
