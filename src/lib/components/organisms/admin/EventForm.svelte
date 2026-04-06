<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { EventItem } from '$lib/data/kb';
	import AdminEditorAssistPanel from '$lib/components/organisms/admin/AdminEditorAssistPanel.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { eventTypeOptions, eventAudienceOptions, eventCostOptions } from '$lib/data/formSchema';
	import {
		buildChangeLine,
		getFormValue,
		isValidHttpUrl,
		serializeForm,
		type EditorChangeLine
	} from './editor-support';

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
	}

	let {
		event,
		organizations = [],
		venues = [],
		action = '?/update',
		mode = 'edit',
		taxonomyTags = [],
		regionOptions = [],
		audienceOptions = [],
		costOptions = [],
		previewHref = null
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');
	let formEl = $state<HTMLFormElement | null>(null);
	let initialSnapshot = $state('');
	let hasUnsavedChanges = $state(false);
	let validationIssues = $state<string[]>([]);
	let changedFields = $state<EditorChangeLine[]>([]);

	$effect(() => {
		descriptionHtml = event?.description ?? '';
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
			buildChangeLine('Description', event?.description, descriptionHtml),
			buildChangeLine('Start date', event?.startDate, getFormValue(formData, 'startDate')),
			buildChangeLine('End date', event?.endDate, getFormValue(formData, 'endDate')),
			buildChangeLine(
				'Status',
				event?.status ?? 'draft',
				getFormValue(formData, 'status') || 'draft'
			),
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
			),
			buildChangeLine('Event URL', event?.eventUrl, getFormValue(formData, 'eventUrl')),
			buildChangeLine(
				'Registration URL',
				event?.registrationUrl,
				getFormValue(formData, 'registrationUrl')
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

		return issues;
	}

	function recomputeEditorState() {
		if (!formEl) return;
		const formData = new FormData(formEl);
		validationIssues = currentValidationIssues(formData);
		changedFields = currentFieldDiffs(formData);
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
				if (result.type === 'success') toast.success('Saved');
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
</script>

<form
	bind:this={formEl}
	method="POST"
	{action}
	use:enhance={formEnhance()}
	oninput={recomputeEditorState}
	onchange={recomputeEditorState}
	class="space-y-8"
>
	<AdminEditorAssistPanel
		{previewHref}
		{hasUnsavedChanges}
		{validationIssues}
		changedFields={changedFields.slice(0, 6)}
	/>

	<!-- Core fields -->
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
		{#if mode === 'edit'}
			<div class="space-y-1.5">
				<Label for="slug">Slug</Label>
				<Input id="slug" name="slug" value={event?.slug ?? ''} placeholder="auto-generated" />
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="status">Status</Label>
			<select id="status" name="status" class={selectCls} value={event?.status ?? 'draft'}>
				<option value="draft">Draft</option>
				<option value="pending">Pending</option>
				<option value="published">Published</option>
				{#if mode === 'edit'}
					<option value="rejected">Rejected</option>
					<option value="cancelled">Cancelled</option>
				{/if}
			</select>
		</div>
	</div>

	<Separator />

	<!-- Dates & location -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="space-y-1.5">
			<Label for="startDate">Start date</Label>
			<Input
				id="startDate"
				name="startDate"
				type="datetime-local"
				value={event?.startDate ? event.startDate.slice(0, 16) : ''}
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="endDate">End date</Label>
			<Input
				id="endDate"
				name="endDate"
				type="datetime-local"
				value={event?.endDate ? event.endDate.slice(0, 16) : ''}
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="timezone">Timezone</Label>
			<Input id="timezone" name="timezone" value={event?.timezone ?? 'America/Los_Angeles'} />
		</div>
		<div class="space-y-1.5 sm:col-span-2">
			<Label for="location">Location / city</Label>
			<Input
				id="location"
				name="location"
				value={event?.location ?? ''}
				placeholder="Placerville, CA"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="region">Region</Label>
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
	</div>

	<Separator />

	<!-- Classification -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="space-y-1.5">
			<Label for="type">Type</Label>
			<select id="type" name="type" class={selectCls} value={event?.type ?? ''}>
				{#each eventTypeOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
			</select>
		</div>
		<div class="space-y-1.5">
			<Label for="audience">Audience</Label>
			<select id="audience" name="audience" class={selectCls} value={event?.audience ?? ''}>
				{#if audienceOptions.length}
					{#each audienceOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
				{:else}
					{#each eventAudienceOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
				{/if}
			</select>
		</div>
		<div class="space-y-1.5">
			<Label for="cost">Cost</Label>
			<select id="cost" name="cost" class={selectCls} value={event?.cost ?? ''}>
				{#if costOptions.length}
					{#each costOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
				{:else}
					{#each eventCostOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
				{/if}
			</select>
		</div>
		<div class="space-y-1.5">
			<Label for="eventFormat">Format</Label>
			<select
				id="eventFormat"
				name="eventFormat"
				class={selectCls}
				value={event?.eventFormat ?? ''}
			>
				<option value="">— Select —</option>
				<option value="in_person">In Person</option>
				<option value="online">Online</option>
				<option value="hybrid">Hybrid</option>
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

	<Separator />

	<!-- Description -->
	<div class="space-y-1.5">
		<Label>Description</Label>
		<RichTextEditor
			bind:value={descriptionHtml}
			name="description"
			initialValue={event?.description ?? ''}
		/>
	</div>

	<!-- Image -->
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

	<Separator />

	<!-- Org & venue -->
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
	</div>

	<!-- Admin notes -->
	<div class="space-y-1.5">
		<Label for="adminNotes">Admin notes</Label>
		<Textarea
			id="adminNotes"
			name="adminNotes"
			rows={3}
			value={event?.adminNotes ?? ''}
			placeholder="Internal notes (not shown publicly)"
		/>
	</div>

	<!-- Featured / unlisted -->
	<div class="flex gap-6">
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

	<div class="flex gap-3">
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save event'}
		</Button>
	</div>
</form>
