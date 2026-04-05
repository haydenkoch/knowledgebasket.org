<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { ToolboxItem } from '$lib/data/kb';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { toolboxMediaTypeOptions, toolboxCategoryOptions } from '$lib/data/formSchema';

	interface Props {
		resource?: ToolboxItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
	}

	let {
		resource,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create resource' : 'Save resource'
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');
	let bodyHtml = $state('');

	$effect(() => {
		descriptionHtml = resource?.description ?? '';
		bodyHtml = resource?.body ?? '';
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
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		submitting = true;
		return ({ result, update }) => {
			submitting = false;
			if (result.type === 'success')
				toast.success(mode === 'create' ? 'Resource created' : 'Resource saved');
			else if (result.type === 'failure')
				toast.error((result.data as { error?: string })?.error ?? 'Error saving resource');
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
				value={resource?.title ?? ''}
				placeholder="Resource title"
			/>
		</div>
		{#if mode === 'edit'}
			<div class="space-y-1.5">
				<Label for="slug">Slug</Label>
				<Input id="slug" name="slug" value={resource?.slug ?? ''} placeholder="auto-generated" />
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="status">Moderation status</Label>
			<select id="status" name="status" class={selectCls} value={resource?.status ?? 'draft'}>
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
			<Label for="sourceName">Source / publisher</Label>
			<Input
				id="sourceName"
				name="sourceName"
				value={resource?.sourceName ?? ''}
				placeholder="e.g. Indigenous Futures Society"
			/>
		</div>
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
			<Label for="mediaType">Media type label</Label>
			<Input
				id="mediaType"
				name="mediaType"
				value={resource?.mediaType ?? ''}
				placeholder="Defaults to resource type if left blank"
			/>
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
			<Label for="category">Primary category</Label>
			<select id="category" name="category" class={selectCls} value={resource?.category ?? ''}>
				{#each toolboxCategoryOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
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

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label for="externalUrl">External URL</Label>
			<Input
				id="externalUrl"
				name="externalUrl"
				type="url"
				value={resource?.externalUrl ?? ''}
				placeholder="https://…"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="fileUrl">File URL</Label>
			<Input
				id="fileUrl"
				name="fileUrl"
				type="url"
				value={resource?.fileUrl ?? ''}
				placeholder="https://…"
			/>
		</div>
		<div class="space-y-1.5 sm:col-span-2">
			<Label for="imageUrl">Image URL</Label>
			<Input
				id="imageUrl"
				name="imageUrl"
				type="url"
				value={resource?.imageUrl ?? ''}
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
			initialValue={resource?.description ?? ''}
		/>
	</div>

	<div class="space-y-1.5">
		<Label>Hosted body</Label>
		<RichTextEditor bind:value={bodyHtml} name="body" initialValue={resource?.body ?? ''} />
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label for="categories">Additional categories</Label>
			<Textarea
				id="categories"
				name="categories"
				rows={4}
				value={listValue(resource?.categories)}
				placeholder="One per line"
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

	<div class="space-y-1.5">
		<Label for="adminNotes">Admin notes</Label>
		<Textarea
			id="adminNotes"
			name="adminNotes"
			rows={4}
			value={resource?.adminNotes ?? ''}
			placeholder="Internal moderation or sourcing notes"
		/>
	</div>

	{#if mode === 'edit'}
		<div class="space-y-1.5">
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

	<div class="flex flex-wrap gap-6">
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

	<div class="flex gap-3">
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : submitLabel}
		</Button>
	</div>
</form>
