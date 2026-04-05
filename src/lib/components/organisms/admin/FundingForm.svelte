<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { FundingItem } from '$lib/data/kb';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import {
		fundingTypeOptions,
		fundingStatusOptions,
		fundingFocusOptions,
		geographyOptions
	} from '$lib/data/formSchema';

	interface Props {
		funding?: FundingItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
	}

	let {
		funding,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create funding' : 'Save funding'
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');

	$effect(() => {
		descriptionHtml = funding?.description ?? '';
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
			if (result.type === 'success')
				toast.success(mode === 'create' ? 'Funding created' : 'Funding saved');
			else if (result.type === 'failure')
				toast.error((result.data as { error?: string })?.error ?? 'Error saving funding');
			update();
		};
	}}
	class="space-y-8"
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
		{#if mode === 'edit'}
			<div class="space-y-1.5">
				<Label for="slug">Slug</Label>
				<Input id="slug" name="slug" value={funding?.slug ?? ''} placeholder="auto-generated" />
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="status">Moderation status</Label>
			<select id="status" name="status" class={selectCls} value={funding?.status ?? 'draft'}>
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

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
			<Label for="fundingType">Funding type</Label>
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
			<Label for="region">Region</Label>
			<select id="region" name="region" class={selectCls} value={funding?.region ?? ''}>
				{#each geographyOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<div class="space-y-1.5">
			<Label for="amountDescription">Amount / range</Label>
			<Input
				id="amountDescription"
				name="amountDescription"
				value={funding?.amountDescription ?? ''}
				placeholder="e.g. $25,000 – $500,000"
			/>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
			<Label for="deadline">Deadline</Label>
			<Input
				id="deadline"
				name="deadline"
				type="date"
				value={funding?.deadline ? funding.deadline.slice(0, 10) : ''}
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
	</div>

	<Separator />

	<div class="space-y-1.5">
		<Label>Description</Label>
		<RichTextEditor
			bind:value={descriptionHtml}
			name="description"
			initialValue={funding?.description ?? ''}
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label for="focusAreas">Focus areas</Label>
			<Textarea
				id="focusAreas"
				name="focusAreas"
				rows={3}
				value={listValue(funding?.focusAreas)}
				placeholder={fundingFocusOptions
					.filter((option) => option.value)
					.map((option) => option.label)
					.slice(0, 4)
					.join('\n')}
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="eligibilityTypes">Eligibility types</Label>
			<Textarea
				id="eligibilityTypes"
				name="eligibilityTypes"
				rows={3}
				value={listValue(funding?.eligibilityTypes)}
				placeholder="e.g. Tribal governments&#10;Nonprofits&#10;Businesses"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="tags">Tags</Label>
			<Textarea
				id="tags"
				name="tags"
				rows={3}
				value={listValue(funding?.tags)}
				placeholder="One per line"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="geographicRestrictions">Geographic restrictions</Label>
			<Textarea
				id="geographicRestrictions"
				name="geographicRestrictions"
				rows={3}
				value={funding?.geographicRestrictions ?? ''}
				placeholder="Free-text restrictions or notes"
			/>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

	<div class="grid gap-4 sm:grid-cols-2">
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
	</div>

	<Separator />

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="space-y-1.5">
			<Label for="applyUrl">Apply URL</Label>
			<Input
				id="applyUrl"
				name="applyUrl"
				type="url"
				value={funding?.applyUrl ?? ''}
				placeholder="https://…"
			/>
		</div>
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
			<Label for="imageUrl">Image URL</Label>
			<Input
				id="imageUrl"
				name="imageUrl"
				type="url"
				value={funding?.imageUrl ?? ''}
				placeholder="https://…"
			/>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
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
		<div class="space-y-1.5">
			<Label for="recurringSchedule">Recurring schedule</Label>
			<Input
				id="recurringSchedule"
				name="recurringSchedule"
				value={funding?.recurringSchedule ?? ''}
				placeholder="e.g. Opens every September"
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<Label for="adminNotes">Admin notes</Label>
		<Textarea
			id="adminNotes"
			name="adminNotes"
			rows={4}
			value={funding?.adminNotes ?? ''}
			placeholder="Internal notes for review and moderation"
		/>
	</div>

	{#if mode === 'edit'}
		<div class="space-y-1.5">
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

	<div class="flex flex-wrap gap-6">
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
		<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
			<input
				type="checkbox"
				name="matchRequired"
				value="true"
				checked={funding?.matchRequired ?? false}
				class="h-4 w-4 rounded border-input"
			/>
			Match required
		</label>
		<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
			<input
				type="checkbox"
				name="isRecurring"
				value="true"
				checked={funding?.isRecurring ?? false}
				class="h-4 w-4 rounded border-input"
			/>
			Recurring opportunity
		</label>
	</div>

	<div class="flex gap-3">
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : submitLabel}
		</Button>
	</div>
</form>
