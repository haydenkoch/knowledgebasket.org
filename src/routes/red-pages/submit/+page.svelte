<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		trackSubmissionCompleted,
		trackSubmissionStarted,
		trackSubmissionSubmitted
	} from '$lib/analytics/events';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import KbFormShell from '$lib/components/organisms/KbFormShell.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		redPagesServiceTypeOptions,
		redPagesAreaOptions,
		placeholders
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

	let serviceType = $state('');
	let serviceArea = $state('');

	$effect(() => {
		const v = form?.values;
		if (v) {
			if (v.service_type != null) serviceType = v.service_type;
			if (v.service_area != null) serviceArea = v.service_area;
		}
	});

	const successData = $derived(
		form?.success
			? {
					heading: 'Listing submitted',
					message: form.message ?? '',
					backHref: '/red-pages',
					backLabel: 'Back to Red Pages'
				}
			: null
	);

	onMount(() => {
		trackSubmissionStarted('redpage');
	});
</script>

<svelte:head>
	<title>Add your business | Red Pages | Knowledge Basket</title>
</svelte:head>

<KbFormShell
	coil="redpages"
	breadcrumbHref="/red-pages"
	breadcrumbLabel="Red Pages"
	pageTitle="Add your business"
	pageDescription="Native-owned businesses, artists, and organizations: submit your listing for IFS staff review. Listings must be Native/Indigenous-owned or led."
	noticeLabel="Eligibility"
	noticeText="Listings must be Native/Indigenous-owned or led. Submissions are reviewed within 3–5 business days."
	success={successData}
>
	{#snippet footerContent()}
		Listings are free. By submitting you confirm the business is Native/Indigenous-owned or led and
		agree to the <a href="/terms" class="underline underline-offset-2">Terms of Service</a> and
		<a href="/privacy" class="underline underline-offset-2">Privacy Policy</a>.
	{/snippet}
	<form
		method="POST"
		action="?/default"
		use:enhance={() => {
			trackSubmissionSubmitted('redpage');
			submitting = true;
			return async ({ result, update }) => {
				try {
					if (result.type === 'success') {
						trackSubmissionCompleted('redpage');
						await update();
						return;
					}
					if (result.type === 'failure') await update();
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

		<!-- Business Information -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Business information</h3>

			<Field.Field>
				<Field.Label for="business_name"
					>Business / organization name <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="business_name"
						name="business_name"
						type="text"
						required
						value={form?.values?.business_name ?? ''}
						placeholder="e.g. Numa Designs"
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="tribal_affiliation"
					>Tribal affiliation <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="tribal_affiliation"
						name="tribal_affiliation"
						type="text"
						required
						value={form?.values?.tribal_affiliation ?? ''}
						placeholder="e.g. Paiute Nation, Paiute / Washoe Nation"
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="service_type"
						>Service type <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<input type="hidden" name="service_type" value={serviceType} />
						<Select.Root type="single" bind:value={serviceType}>
							<Select.Trigger class="w-full">
								{redPagesServiceTypeOptions.find((o) => o.value === serviceType)?.label ??
									'Choose service type'}
							</Select.Trigger>
							<Select.Content>
								{#each redPagesServiceTypeOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="service_area">Service area</Field.Label>
					<Field.Content>
						<input type="hidden" name="service_area" value={serviceArea} />
						<Select.Root type="single" bind:value={serviceArea}>
							<Select.Trigger class="w-full">
								{redPagesAreaOptions.find((o) => o.value === serviceArea)?.label ??
									'Choose service area'}
							</Select.Trigger>
							<Select.Content>
								{#each redPagesAreaOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="description"
					>Description <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<RichTextEditor
						bind:value={descriptionHtml}
						mode="plain"
						name="description"
						placeholder="Describe your business, services, and who you serve."
						minHeight="180px"
						initialValue={form?.values?.description ?? ''}
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="website">Website</Field.Label>
				<Field.Content>
					<Input
						id="website"
						name="website"
						type="url"
						value={form?.values?.website ?? ''}
						placeholder={placeholders.applyUrl}
						class="w-full"
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
			<Field.Field>
				<Field.Label for="contact_phone">Phone</Field.Label>
				<Field.Content>
					<Input
						id="contact_phone"
						name="contact_phone"
						type="tel"
						value={form?.values?.contact_phone ?? ''}
						placeholder={placeholders.phone}
						class="w-full sm:max-w-xs"
					/>
				</Field.Content>
				<Field.Description
					>Used only by IFS to follow up; not published unless you request it.</Field.Description
				>
			</Field.Field>
			<p class="text-xs text-muted-foreground">
				Submission contact details are used for moderation and review communication.
			</p>
		</div>

		<!-- Form Actions -->
		<div class="flex items-center gap-3 pt-8">
			<Button type="submit" disabled={submitting} aria-busy={submitting}>
				{submitting ? 'Submitting…' : 'Submit for review'}
			</Button>
			<Button variant="ghost" href="/red-pages">Cancel</Button>
		</div>
	</form>
</KbFormShell>
