<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { RedPagesItem } from '$lib/data/kb';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { redPagesServiceTypeOptions, redPagesAreaOptions } from '$lib/data/formSchema';

	interface Props {
		business?: RedPagesItem;
		organizations?: { id: string; name: string }[];
		action?: string;
		mode?: 'create' | 'edit';
		submitLabel?: string;
	}

	let {
		business,
		organizations = [],
		action = '?/update',
		mode = 'edit',
		submitLabel = mode === 'create' ? 'Create listing' : 'Save listing'
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state('');

	$effect(() => {
		descriptionHtml = business?.description ?? '';
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
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		submitting = true;
		return ({ result, update }) => {
			submitting = false;
			if (result.type === 'success')
				toast.success(mode === 'create' ? 'Listing created' : 'Listing saved');
			else if (result.type === 'failure')
				toast.error((result.data as { error?: string })?.error ?? 'Error saving listing');
			update();
		};
	}}
	class="space-y-8"
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
		{#if mode === 'edit'}
			<div class="space-y-1.5">
				<Label for="slug">Slug</Label>
				<Input id="slug" name="slug" value={business?.slug ?? ''} placeholder="auto-generated" />
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="status">Moderation status</Label>
			<select id="status" name="status" class={selectCls} value={business?.status ?? 'draft'}>
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
		<div class="space-y-1.5">
			<Label for="serviceType">Service type</Label>
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
			<Label for="serviceArea">Service area</Label>
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
			<Label for="website">Website</Label>
			<Input
				id="website"
				name="website"
				type="url"
				value={business?.website ?? ''}
				placeholder="https://…"
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<Label>Description</Label>
		<RichTextEditor
			bind:value={descriptionHtml}
			name="description"
			initialValue={business?.description ?? ''}
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label for="serviceTypes">Service types</Label>
			<Textarea
				id="serviceTypes"
				name="serviceTypes"
				rows={4}
				value={listValue(business?.serviceTypes)}
				placeholder="One per line"
			/>
		</div>
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
		<div class="space-y-1.5">
			<Label for="tribalAffiliations">Tribal affiliations</Label>
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

	<Separator />

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="space-y-1.5">
			<Label for="email">Email</Label>
			<Input id="email" name="email" type="email" value={business?.email ?? ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="phone">Phone</Label>
			<Input id="phone" name="phone" value={business?.phone ?? ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="region">Region</Label>
			<Input
				id="region"
				name="region"
				value={business?.region ?? business?.serviceArea ?? ''}
				placeholder="e.g. Northern California"
			/>
		</div>
		<div class="space-y-1.5 sm:col-span-2">
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
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
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
	</div>

	<div class="space-y-1.5">
		<Label for="adminNotes">Admin notes</Label>
		<Textarea
			id="adminNotes"
			name="adminNotes"
			rows={4}
			value={business?.adminNotes ?? ''}
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
				value={business?.rejectionReason ?? ''}
				placeholder="Optional reason to store if the listing is rejected"
			/>
		</div>
	{/if}

	<div class="flex flex-wrap gap-6">
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

	<div class="flex gap-3">
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : submitLabel}
		</Button>
	</div>
</form>
