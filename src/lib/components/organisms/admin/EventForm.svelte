<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { EventItem } from '$lib/data/kb';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { eventTypeOptions, eventAudienceOptions, eventCostOptions } from '$lib/data/formSchema';

	interface Props {
		event?: EventItem & Record<string, unknown>;
		organizations?: { id: string; name: string }[];
		venues?: { id: string; name: string }[];
		action?: string;
		taxonomyTags?: { slug: string; label: string; group: string }[];
		regionOptions?: { value: string; label: string }[];
		audienceOptions?: { value: string; label: string }[];
		costOptions?: { value: string; label: string }[];
	}

	let {
		event,
		organizations = [],
		venues = [],
		action = '?/update',
		taxonomyTags = [],
		regionOptions = [],
		audienceOptions = [],
		costOptions = []
	}: Props = $props();

	let submitting = $state(false);
	let descriptionHtml = $state(event?.description ?? '');

	const selectCls = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		submitting = true;
		return ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') toast.success('Saved');
			else if (result.type === 'failure') toast.error((result.data as { error?: string })?.error ?? 'Error saving');
			update();
		};
	}}
	class="space-y-8"
>
	<!-- Core fields -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="sm:col-span-2 space-y-1.5">
			<Label for="title">Title *</Label>
			<Input id="title" name="title" required value={event?.title ?? ''} placeholder="Event title" />
		</div>
		<div class="space-y-1.5">
			<Label for="slug">Slug</Label>
			<Input id="slug" name="slug" value={event?.slug ?? ''} placeholder="auto-generated" />
		</div>
		<div class="space-y-1.5">
			<Label for="status">Status</Label>
			<select id="status" name="status" class={selectCls} value={event?.status ?? 'draft'}>
				<option value="pending">Pending</option>
				<option value="published">Published</option>
				<option value="draft">Draft</option>
				<option value="rejected">Rejected</option>
				<option value="cancelled">Cancelled</option>
			</select>
		</div>
	</div>

	<Separator />

	<!-- Dates & location -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="space-y-1.5">
			<Label for="startDate">Start date</Label>
			<Input id="startDate" name="startDate" type="datetime-local" value={event?.startDate ? event.startDate.slice(0,16) : ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="endDate">End date</Label>
			<Input id="endDate" name="endDate" type="datetime-local" value={event?.endDate ? event.endDate.slice(0,16) : ''} />
		</div>
		<div class="space-y-1.5">
			<Label for="timezone">Timezone</Label>
			<Input id="timezone" name="timezone" value={event?.timezone ?? 'America/Los_Angeles'} />
		</div>
		<div class="sm:col-span-2 space-y-1.5">
			<Label for="location">Location / city</Label>
			<Input id="location" name="location" value={event?.location ?? ''} placeholder="Placerville, CA" />
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
			<select id="eventFormat" name="eventFormat" class={selectCls} value={event?.eventFormat ?? ''}>
				<option value="">— Select —</option>
				<option value="in_person">In Person</option>
				<option value="online">Online</option>
				<option value="hybrid">Hybrid</option>
			</select>
		</div>
		<div class="space-y-1.5">
			<Label for="eventUrl">Event URL</Label>
			<Input id="eventUrl" name="eventUrl" type="url" value={event?.eventUrl ?? ''} placeholder="https://…" />
		</div>
		<div class="space-y-1.5">
			<Label for="registrationUrl">Registration URL</Label>
			<Input id="registrationUrl" name="registrationUrl" type="url" value={event?.registrationUrl ?? ''} placeholder="https://…" />
		</div>
	</div>

	<Separator />

	<!-- Description -->
	<div class="space-y-1.5">
		<Label>Description</Label>
		<RichTextEditor bind:value={descriptionHtml} name="description" initialValue={event?.description ?? ''} />
	</div>

	<!-- Image -->
	<div class="space-y-1.5">
		<Label for="imageUrl">Image URL</Label>
		<Input id="imageUrl" name="imageUrl" type="url" value={event?.imageUrl ?? ''} placeholder="https://…" />
	</div>

	<Separator />

	<!-- Org & venue -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label for="organizationId">Organization</Label>
			<select id="organizationId" name="organizationId" class={selectCls} value={event?.organizationId ?? ''}>
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
		<Textarea id="adminNotes" name="adminNotes" rows={3} value={event?.adminNotes ?? ''} placeholder="Internal notes (not shown publicly)" />
	</div>

	<!-- Featured / unlisted -->
	<div class="flex gap-6">
		<label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
			<input type="checkbox" name="featured" value="true" checked={event?.featured ?? false} class="h-4 w-4 rounded border-input" />
			Featured
		</label>
		<label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
			<input type="checkbox" name="unlisted" value="true" checked={event?.unlisted ?? false} class="h-4 w-4 rounded border-input" />
			Unlisted
		</label>
	</div>

	<div class="flex gap-3">
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save event'}
		</Button>
	</div>
</form>
