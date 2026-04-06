<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import KbFormShell from '$lib/components/organisms/KbFormShell.svelte';
	import KbFileDropzone from '$lib/components/molecules/KbFileDropzone.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import {
		jobTypeOptions,
		jobSectorOptions,
		jobLevelOptions,
		workArrangementOptions,
		geographyOptions,
		placeholders,
		suggestedOrganizations,
		suggestedLocations
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

	let jobType = $state('');
	let region = $state('');
	let sector = $state('');
	let level = $state('');
	let workArrangement = $state('');
	let indigenousPriority = $state(false);

	$effect(() => {
		const v = form?.values;
		if (v) {
			if (v.job_type != null) jobType = v.job_type;
			if (v.region != null) region = v.region;
			if (v.sector != null) sector = v.sector;
			if (v.level != null) level = v.level;
			if (v.work_arrangement != null) workArrangement = v.work_arrangement;
		}
	});

	const successData = $derived(
		form?.success
			? {
					heading: 'Job submitted',
					message: form.message ?? '',
					backHref: '/jobs',
					backLabel: 'Back to Job Board'
				}
			: null
	);
</script>

<svelte:head>
	<title>Post a job | Job Board | Knowledge Basket</title>
</svelte:head>

<KbFormShell
	coil="jobs"
	breadcrumbHref="/jobs"
	breadcrumbLabel="Job Board"
	pageTitle="Post a job"
	pageDescription="List a role with a Tribal entity, Indigenous-serving organization, or employer committed to Indigenous hiring. All submissions are reviewed by IFS staff before publishing. Listings are free."
	noticeLabel="Moderation"
	noticeText="Listings are reviewed within 3–5 business days. You'll receive an email when your job is approved or if we need more information."
	success={successData}
>
	{#snippet footerContent()}
		Listings are free. By submitting you agree to the
		<a href="/terms" class="underline underline-offset-2">Terms of Service</a> and
		<a href="/privacy" class="underline underline-offset-2">Privacy Policy</a>. Your contact details
		are not shown on the public listing.
	{/snippet}
	<form
		method="POST"
		action="?/default"
		enctype="multipart/form-data"
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

		<!-- Job Basics -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Job basics</h3>

			<Field.Field>
				<Field.Label for="job_title">Job title <span class="text-destructive">*</span></Field.Label>
				<Field.Content>
					<Input
						id="job_title"
						name="job_title"
						type="text"
						required
						value={form?.values?.job_title ?? ''}
						placeholder="e.g. Cultural Resources Coordinator"
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="employer"
						>Hiring organization <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<Input
							id="employer"
							name="employer"
							type="text"
							required
							value={form?.values?.employer ?? ''}
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
					<Field.Label for="job_type">Job type <span class="text-destructive">*</span></Field.Label>
					<Field.Content>
						<input type="hidden" name="job_type" value={jobType} />
						<Select.Root type="single" bind:value={jobType}>
							<Select.Trigger class="w-full">
								{jobTypeOptions.find((o) => o.value === jobType)?.label ?? 'Choose job type'}
							</Select.Trigger>
							<Select.Content>
								{#each jobTypeOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="location">Location</Field.Label>
					<Field.Content>
						<Input
							id="location"
							name="location"
							type="text"
							value={form?.values?.location ?? ''}
							placeholder={placeholders.location}
							list="datalist-locations"
							class="w-full"
						/>
						<datalist id="datalist-locations">
							{#each suggestedLocations as loc}
								<option value={loc}></option>
							{/each}
						</datalist>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="region">Region</Field.Label>
					<Field.Content>
						<input type="hidden" name="region" value={region} />
						<Select.Root type="single" bind:value={region}>
							<Select.Trigger class="w-full">
								{geographyOptions.find((o) => o.value === region)?.label ?? 'Choose region'}
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

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="sector">Sector <span class="text-destructive">*</span></Field.Label>
					<Field.Content>
						<input type="hidden" name="sector" value={sector} />
						<Select.Root type="single" bind:value={sector}>
							<Select.Trigger class="w-full">
								{jobSectorOptions.find((o) => o.value === sector)?.label ?? 'Choose sector'}
							</Select.Trigger>
							<Select.Content>
								{#each jobSectorOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="level">Level</Field.Label>
					<Field.Content>
						<input type="hidden" name="level" value={level} />
						<Select.Root type="single" bind:value={level}>
							<Select.Trigger class="w-full">
								{jobLevelOptions.find((o) => o.value === level)?.label ?? 'Choose level'}
							</Select.Trigger>
							<Select.Content>
								{#each jobLevelOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="work_arrangement">Work arrangement</Field.Label>
					<Field.Content>
						<input type="hidden" name="work_arrangement" value={workArrangement} />
						<Select.Root type="single" bind:value={workArrangement}>
							<Select.Trigger class="w-full">
								{workArrangementOptions.find((o) => o.value === workArrangement)?.label ??
									'Choose arrangement'}
							</Select.Trigger>
							<Select.Content>
								{#each workArrangementOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="application_deadline">Application deadline</Field.Label>
					<Field.Content>
						<Input
							id="application_deadline"
							name="application_deadline"
							type="date"
							value={form?.values?.application_deadline ?? ''}
							class="w-full"
						/>
					</Field.Content>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="apply_url"
					>Apply or learn more URL <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="apply_url"
						name="apply_url"
						type="url"
						required
						value={form?.values?.apply_url ?? ''}
						placeholder={placeholders.applyUrl}
						class="w-full"
					/>
				</Field.Content>
				<Field.Description>Link to application page or job posting.</Field.Description>
			</Field.Field>
		</div>

		<!-- Position Description -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">
				Position description <span class="text-destructive">*</span>
			</h3>
			<Field.Field>
				<Field.Content>
					<RichTextEditor
						bind:value={descriptionHtml}
						mode="plain"
						name="description"
						placeholder="Describe the role, key responsibilities, qualifications, and what makes this opportunity meaningful…"
						minHeight="220px"
						initialValue={form?.values?.description ?? ''}
					/>
				</Field.Content>
			</Field.Field>
		</div>

		<!-- Compensation & Benefits -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Compensation &amp; benefits</h3>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="compensation">Salary / compensation</Field.Label>
					<Field.Content>
						<Input
							id="compensation"
							name="compensation"
							type="text"
							value={form?.values?.compensation ?? ''}
							placeholder="e.g. $65,000–80,000 DOE or Stipend $3,000/mo"
							class="w-full"
						/>
					</Field.Content>
					<Field.Description
						>Range, DOE, or "Competitive" — helps attract strong candidates.</Field.Description
					>
				</Field.Field>

				<Field.Field>
					<Field.Label for="benefits">Benefits</Field.Label>
					<Field.Content>
						<Input
							id="benefits"
							name="benefits"
							type="text"
							value={form?.values?.benefits ?? ''}
							placeholder="e.g. Health, 401k, PTO, flexible schedule"
							class="w-full"
						/>
					</Field.Content>
				</Field.Field>
			</div>

			<label class="flex cursor-pointer items-start gap-3">
				<Checkbox
					name="indigenous_priority"
					value="yes"
					bind:checked={indigenousPriority}
					class="mt-0.5 shrink-0"
				/>
				<span class="text-sm text-foreground"
					>We prioritize Indigenous hiring for this role (will be highlighted on the listing).</span
				>
			</label>
		</div>

		<!-- Image -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">
				Image <span class="text-sm font-normal text-muted-foreground">(Optional)</span>
			</h3>
			<Field.Field>
				<Field.Label for="image">Company logo or role image</Field.Label>
				<Field.Content>
					<KbFileDropzone
						name="image"
						hint="JPG, PNG, or WebP, max 5 MB. Helps your posting stand out in the list."
					/>
				</Field.Content>
				<Field.Description>
					Uploaded files may be stored and reviewed by staff as part of moderation and publishing.
				</Field.Description>
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
					>Used only by IFS to follow up on your submission; not published.</Field.Description
				>
			</Field.Field>
			<p class="text-xs text-muted-foreground">
				Submission contact details are used for moderation, approval updates, and clarification
				questions.
			</p>
		</div>

		<!-- Form Actions -->
		<div class="flex items-center gap-3 pt-8">
			<Button type="submit" disabled={submitting} aria-busy={submitting}>
				{submitting ? 'Submitting…' : 'Submit for review'}
			</Button>
			<Button variant="ghost" href="/jobs">Cancel</Button>
		</div>
	</form>
</KbFormShell>
