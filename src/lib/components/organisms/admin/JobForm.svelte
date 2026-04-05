<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { JobItem } from '$lib/data/kb';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import {
		jobTypeOptions,
		jobSectorOptions,
		jobLevelOptions,
		workArrangementOptions,
		geographyOptions
	} from '$lib/data/formSchema';

	interface Props {
		job?: JobItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
	}

	let {
		job,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create job' : 'Save job'
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');
	let qualificationsHtml = $state('');
	let applicationInstructionsHtml = $state('');

	$effect(() => {
		descriptionHtml = job?.description ?? '';
		qualificationsHtml = job?.qualifications ?? '';
		applicationInstructionsHtml = job?.applicationInstructions ?? '';
	});

	const selectCls =
		'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

	function listValue(values?: string[]) {
		return values?.join('\n') ?? '';
	}
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		submitting = true;
		return ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') toast.success(mode === 'create' ? 'Job created' : 'Job saved');
			else if (result.type === 'failure')
				toast.error((result.data as { error?: string })?.error ?? 'Error saving job');
			update();
		};
	}}
	class="space-y-8"
>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5 sm:col-span-2">
			<Label for="title">Title *</Label>
			<Input id="title" name="title" required value={job?.title ?? ''} placeholder="Job title" />
		</div>
		{#if mode === 'edit'}
			<div class="space-y-1.5">
				<Label for="slug">Slug</Label>
				<Input id="slug" name="slug" value={job?.slug ?? ''} placeholder="auto-generated" />
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="status">Moderation status</Label>
			<select id="status" name="status" class={selectCls} value={job?.status ?? 'draft'}>
				<option value="draft">Draft</option>
				<option value="pending">Pending</option>
				<option value="published">Published</option>
				{#if mode === 'edit'}
					<option value="rejected">Rejected</option>
				{/if}
			</select>
		</div>
	</div>

	<Separator />

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
			<Label for="jobType">Job type</Label>
			<select id="jobType" name="jobType" class={selectCls} value={job?.jobType ?? ''}>
				{#each jobTypeOptions as option}
					<option value={option.value}>{option.label}</option>
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
			<Label for="workArrangement">Work arrangement</Label>
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
			<Label for="applicationDeadline">Application deadline</Label>
			<Input
				id="applicationDeadline"
				name="applicationDeadline"
				type="date"
				value={job?.applicationDeadline ? job.applicationDeadline.slice(0, 10) : ''}
			/>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="space-y-1.5 sm:col-span-2">
			<Label for="location">Location</Label>
			<Input
				id="location"
				name="location"
				value={job?.location ?? ''}
				placeholder="e.g. Sacramento, CA or Remote"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="city">City</Label>
			<Input id="city" name="city" value={job?.city ?? ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="state">State</Label>
			<Input id="state" name="state" value={job?.state ?? ''} />
		</div>
		<div class="space-y-1.5 sm:col-span-2">
			<Label for="address">Address</Label>
			<Input id="address" name="address" value={job?.address ?? ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="zip">ZIP</Label>
			<Input id="zip" name="zip" value={job?.zip ?? ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="applyUrl">Apply URL</Label>
			<Input
				id="applyUrl"
				name="applyUrl"
				type="url"
				value={job?.applyUrl ?? ''}
				placeholder="https://…"
			/>
		</div>
	</div>

	<Separator />

	<div class="space-y-1.5">
		<Label>Description</Label>
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

	<Separator />

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
		<div class="space-y-1.5 sm:col-span-2">
			<Label for="compensationDescription">Compensation summary</Label>
			<Input
				id="compensationDescription"
				name="compensationDescription"
				value={job?.compensationDescription ?? ''}
				placeholder="e.g. $65,000–80,000 DOE"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="tribalPreference">Tribal preference</Label>
			<Input
				id="tribalPreference"
				name="tribalPreference"
				value={job?.tribalPreference ?? ''}
				placeholder="Optional policy or hiring note"
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

	<div class="grid gap-4 sm:grid-cols-2">
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
		<div class="space-y-1.5">
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

	<div class="flex flex-wrap gap-6">
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
		<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
			<input
				type="checkbox"
				name="indigenousPriority"
				value="true"
				checked={job?.indigenousPriority ?? false}
				class="h-4 w-4 rounded border-input"
			/>
			Indigenous priority
		</label>
	</div>

	<div class="flex gap-3">
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : submitLabel}
		</Button>
	</div>
</form>
