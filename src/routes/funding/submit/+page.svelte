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
		fundingTypeOptions,
		fundingStatusOptions,
		fundingFocusOptions,
		geographyOptions,
		placeholders,
		suggestedOrganizations
	} from '$lib/data/formSchema';

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

	let fundingType = $state('');
	let status = $state('');
	let focus = $state('');
	let geography = $state('');

	$effect(() => {
		const v = form?.values;
		if (v) {
			if (v.funding_type != null) fundingType = v.funding_type;
			if (v.status != null) status = v.status;
			if (v.focus != null) focus = v.focus;
			if (v.geography != null) geography = v.geography;
		}
	});

	const successData = $derived(
		form?.success
			? {
					heading: 'Funding opportunity submitted',
					message: form.message ?? '',
					backHref: '/funding',
					backLabel: 'Back to Funding'
				}
			: null
	);

	onMount(() => {
		trackSubmissionStarted('funding');
	});
</script>

<svelte:head>
	<title>Submit a funding opportunity | Funding | Knowledge Basket</title>
</svelte:head>

<KbFormShell
	coil="funding"
	breadcrumbHref="/funding"
	breadcrumbLabel="Funding"
	pageTitle="Submit a funding opportunity"
	pageDescription="Share grants, contracts, fellowships, or funding programs for IFS staff to review and list. All submissions are reviewed before publishing."
	noticeLabel="Moderation"
	noticeText="Listings are reviewed within 3–5 business days. You'll receive an email when your opportunity is approved or if we need more information."
	success={successData}
>
	{#snippet footerContent()}
		Submissions are reviewed within 3–5 business days. Listings are free. By submitting you agree to
		the <a href="/terms" class="underline underline-offset-2">Terms of Service</a> and
		<a href="/privacy" class="underline underline-offset-2">Privacy Policy</a>.
	{/snippet}
	<form
		method="POST"
		action="?/default"
		use:enhance={() => {
			trackSubmissionSubmitted('funding');
			submitting = true;
			return async ({ result, update }) => {
				try {
					if (result.type === 'success') {
						trackSubmissionCompleted('funding');
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

		<!-- Opportunity Details -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Opportunity details</h3>

			<Field.Field>
				<Field.Label for="opportunity_name"
					>Opportunity name <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="opportunity_name"
						name="opportunity_name"
						type="text"
						required
						value={form?.values?.opportunity_name ?? ''}
						placeholder="e.g. California Forest Stewardship Program"
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="funder"
					>Funder / organization <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="funder"
						name="funder"
						type="text"
						required
						value={form?.values?.funder ?? ''}
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

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="funding_type">Type</Field.Label>
					<Field.Content>
						<input type="hidden" name="funding_type" value={fundingType} />
						<Select.Root type="single" bind:value={fundingType}>
							<Select.Trigger class="w-full">
								{fundingTypeOptions.find((o) => o.value === fundingType)?.label ?? 'Choose type'}
							</Select.Trigger>
							<Select.Content>
								{#each fundingTypeOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="status">Status <span class="text-destructive">*</span></Field.Label>
					<Field.Content>
						<input type="hidden" name="status" value={status} />
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger class="w-full">
								{fundingStatusOptions.find((o) => o.value === status)?.label ?? 'Choose status'}
							</Select.Trigger>
							<Select.Content>
								{#each fundingStatusOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="focus">Focus area</Field.Label>
					<Field.Content>
						<input type="hidden" name="focus" value={focus} />
						<Select.Root type="single" bind:value={focus}>
							<Select.Trigger class="w-full">
								{fundingFocusOptions.find((o) => o.value === focus)?.label ?? 'Choose focus'}
							</Select.Trigger>
							<Select.Content>
								{#each fundingFocusOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="geography">Geography</Field.Label>
					<Field.Content>
						<input type="hidden" name="geography" value={geography} />
						<Select.Root type="single" bind:value={geography}>
							<Select.Trigger class="w-full">
								{geographyOptions.find((o) => o.value === geography)?.label ?? 'Choose geography'}
							</Select.Trigger>
							<Select.Content>
								{#each geographyOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="amount">Amount / range</Field.Label>
				<Field.Content>
					<Input
						id="amount"
						name="amount"
						type="text"
						value={form?.values?.amount ?? ''}
						placeholder="e.g. $25,000 – $500,000"
						class="w-full"
					/>
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
						placeholder="Describe the opportunity, eligibility, and how to apply."
						minHeight="180px"
						initialValue={form?.values?.description ?? ''}
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="apply_url">Application / more info URL</Field.Label>
				<Field.Content>
					<Input
						id="apply_url"
						name="apply_url"
						type="url"
						value={form?.values?.apply_url ?? ''}
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
			<Button variant="ghost" href="/funding">Cancel</Button>
		</div>
	</form>
</KbFormShell>
