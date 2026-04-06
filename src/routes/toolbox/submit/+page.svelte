<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import KbFormShell from '$lib/components/organisms/KbFormShell.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		toolboxMediaTypeOptions,
		toolboxCategoryOptions,
		placeholders,
		suggestedOrganizations
	} from '$lib/data/formSchema';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	type FormResult = {
		success?: boolean;
		message?: string;
		error?: string;
		values?: Record<string, string>;
	} | null;
	let { data } = $props();
	let form = $derived(
		($page as unknown as { form?: FormResult }).form ??
			(data as { form?: FormResult })?.form ??
			null
	);
	let descriptionHtml = $state('');
	let submitting = $state(false);

	let mediaType = $state('');
	let category = $state('');

	$effect(() => {
		const v = form?.values;
		if (v) {
			if (v.media_type != null) mediaType = v.media_type;
			if (v.category != null) category = v.category;
		}
	});

	const successData = $derived(
		form?.success
			? {
					heading: 'Resource submitted',
					message: form.message ?? '',
					backHref: '/toolbox',
					backLabel: 'Back to Toolbox'
				}
			: null
	);
</script>

<svelte:head>
	<title>Submit a resource | Toolbox | Knowledge Basket</title>
</svelte:head>

<KbFormShell
	coil="toolbox"
	breadcrumbHref="/toolbox"
	breadcrumbLabel="Toolbox"
	pageTitle="Submit a resource"
	pageDescription="Add a link, report, toolkit, video, or other resource. The Toolbox prioritizes resources that support Indigenous sovereignty, cultural economies, land stewardship, and community self-determination."
	noticeLabel="Curatorial note"
	noticeText="Resources are reviewed within 3–5 business days. We prioritize content that supports Indigenous sovereignty and self-determination."
	success={successData}
>
	{#snippet footerContent()}
		Submissions are reviewed within 3–5 business days. IFS will add the resource to the Toolbox if
		it aligns with our mission. By submitting you agree to the
		<a href="/terms" class="underline underline-offset-2">Terms of Service</a> and
		<a href="/privacy" class="underline underline-offset-2">Privacy Policy</a>.
	{/snippet}
	<form
		method="POST"
		action="?/default"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				try {
					if (result.type === 'success' || result.type === 'failure') await update();
				} finally {
					submitting = false;
				}
			};
		}}
	>
		{#if form?.error}
			<div
				role="alert"
				aria-live="assertive"
				class="mb-6 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>
		{/if}

		<!-- Resource Details -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Resource details</h3>

			<Field.Field>
				<Field.Label for="resource_title"
					>Resource title <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="resource_title"
						name="resource_title"
						type="text"
						required
						value={form?.values?.resource_title ?? ''}
						placeholder="e.g. NCAI Tribal Economic Development Toolkit"
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="url">URL / link <span class="text-destructive">*</span></Field.Label>
				<Field.Content>
					<Input
						id="url"
						name="url"
						type="url"
						required
						value={form?.values?.url ?? ''}
						placeholder={placeholders.applyUrl}
						class="w-full"
					/>
				</Field.Content>
				<Field.Description>Public URL where the resource can be accessed.</Field.Description>
			</Field.Field>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="media_type">Resource type</Field.Label>
					<Field.Content>
						<input type="hidden" name="media_type" value={mediaType} />
						<Select.Root type="single" bind:value={mediaType}>
							<Select.Trigger class="w-full">
								{toolboxMediaTypeOptions.find((o) => o.value === mediaType)?.label ??
									'Choose resource type'}
							</Select.Trigger>
							<Select.Content>
								{#each toolboxMediaTypeOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="category">Category</Field.Label>
					<Field.Content>
						<input type="hidden" name="category" value={category} />
						<Select.Root type="single" bind:value={category}>
							<Select.Trigger class="w-full">
								{toolboxCategoryOptions.find((o) => o.value === category)?.label ??
									'Choose category'}
							</Select.Trigger>
							<Select.Content>
								{#each toolboxCategoryOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="source">Source / publisher</Field.Label>
				<Field.Content>
					<Input
						id="source"
						name="source"
						type="text"
						value={form?.values?.source ?? ''}
						placeholder={placeholders.organization}
						list="datalist-organizations"
						class="w-full"
					/>
					<datalist id="datalist-organizations">
						{#each suggestedOrganizations as org}
							<option value={org}></option>
						{/each}
					</datalist>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="description"
					>Description <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<RichTextEditor
						bind:value={descriptionHtml}
						mode="plain"
						name="description"
						placeholder="Briefly describe what this resource is and why it's valuable for Indigenous communities and allies."
						minHeight="180px"
						initialValue={form?.values?.description ?? ''}
					/>
				</Field.Content>
			</Field.Field>
		</div>

		<!-- Contact Information -->
		<div class="-mx-4 mt-2 space-y-5 rounded-lg bg-muted/40 px-4 py-8 sm:-mx-6 sm:px-6">
			<h3 class="font-serif text-lg font-semibold text-foreground">Your contact information</h3>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="contact_name"
						>Your name <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<Input
							id="contact_name"
							name="contact_name"
							type="text"
							required
							value={form?.values?.contact_name ?? ''}
							placeholder="First Last"
							class="w-full"
						/>
					</Field.Content>
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Your email <span class="text-destructive">*</span></Field.Label>
					<Field.Content>
						<Input
							id="email"
							name="email"
							type="email"
							required
							value={form?.values?.email ?? ''}
							placeholder={placeholders.email}
							class="w-full"
						/>
					</Field.Content>
				</Field.Field>
			</div>
			<p class="text-xs text-muted-foreground">
				Used for moderation and follow-up about this submission. Contact details are not published
				unless they become part of the approved listing.
			</p>
		</div>

		<!-- Form Actions -->
		<div class="flex items-center gap-3 pt-8">
			<Button type="submit" disabled={submitting} aria-busy={submitting}>
				{submitting ? 'Submitting…' : 'Submit for review'}
			</Button>
			<Button variant="ghost" href="/toolbox">Cancel</Button>
		</div>
	</form>
</KbFormShell>
