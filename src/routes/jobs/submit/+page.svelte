<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
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

	type FormResult = {
		success?: boolean;
		message?: string;
		error?: string;
		values?: Record<string, string>;
	} | null;
	let { data } = $props();
	let form = $derived(
		($page as unknown as { form?: FormResult }).form ?? (data as { form?: FormResult })?.form ?? null
	);
	let descriptionHtml = $state('');
</script>

<div style="--kb-accent: var(--forest)">
	<nav class="kb-breadcrumb">
		<a href="/jobs">Job Board</a>
		<span class="kb-bc-sep">›</span>
		<span>Post a job</span>
	</nav>

	<div class="kb-form-wrap">
		{#if form?.success}
			<div class="kb-success-wrap">
				<div class="kb-success-ico">✓</div>
				<h2>Job submitted</h2>
				<p>{form.message}</p>
				<a href="/jobs" class="kb-back-link">← Back to Job Board</a>
			</div>
		{:else}
			<div class="kb-form-header">
				<h1>Post a job</h1>
				<p>
					List a role with a Tribal entity, Indigenous-serving organization, or employer committed to Indigenous hiring. Make your posting stand out with a clear description, compensation details, and an image. All submissions are reviewed by IFS staff before publishing.
				</p>
			</div>
			<div class="kb-form-notice" style="background: var(--forest-lt); border-left-color: var(--forest); color: var(--forest);">
				📋 <strong>Moderation:</strong> Listings are reviewed within 3–5 business days. You'll receive an email when your job is approved or if we need more information.
			</div>

			<form
				method="POST"
				action="?/default"
				enctype="multipart/form-data"
				use:enhance={() => {
					return ({ result, update }) => {
						if (result.type === 'success' || result.type === 'failure') update();
					};
				}}
			>
				{#if form?.error}
					<p class="kb-form-row" style="color: var(--red); margin-bottom: 16px">{form.error}</p>
				{/if}

				<div class="kb-form-section">
					<h3>Job basics</h3>
					<div class="kb-form-row">
						<label for="job_title">Job title <span class="req">*</span></label>
						<input
							id="job_title"
							name="job_title"
							type="text"
							required
							value={form?.values?.job_title ?? ''}
							placeholder="e.g. Cultural Resources Coordinator"
						/>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="employer">Hiring organization <span class="req">*</span></label>
							<input
								id="employer"
								name="employer"
								type="text"
								required
								value={form?.values?.employer ?? ''}
								placeholder={placeholders.organization}
								list="datalist-organizations"
							/>
							<datalist id="datalist-organizations">
								{#each suggestedOrganizations as org}
									<option value={org}></option>
								{/each}
							</datalist>
						</div>
						<div>
							<label for="job_type">Job type <span class="req">*</span></label>
							<select id="job_type" name="job_type" required>
								{#each jobTypeOptions as opt}
									<option value={opt.value} selected={form?.values?.job_type === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="location">Location</label>
							<input
								id="location"
								name="location"
								type="text"
								value={form?.values?.location ?? ''}
								placeholder={placeholders.location}
								list="datalist-locations"
							/>
							<datalist id="datalist-locations">
								{#each suggestedLocations as loc}
									<option value={loc}></option>
								{/each}
							</datalist>
						</div>
						<div>
							<label for="region">Region</label>
							<select id="region" name="region">
								{#each geographyOptions as opt}
									<option value={opt.value} selected={form?.values?.region === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="sector">Sector <span class="req">*</span></label>
							<select id="sector" name="sector" required>
								{#each jobSectorOptions as opt}
									<option value={opt.value} selected={form?.values?.sector === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="level">Level</label>
							<select id="level" name="level">
								{#each jobLevelOptions as opt}
									<option value={opt.value} selected={form?.values?.level === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="work_arrangement">Work arrangement</label>
						<select id="work_arrangement" name="work_arrangement">
							{#each workArrangementOptions as opt}
								<option value={opt.value} selected={form?.values?.work_arrangement === opt.value}>{opt.label}</option>
							{/each}
						</select>
						<span class="hint">In-Office, Hybrid, or Remote.</span>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="application_deadline">Application deadline</label>
							<input
								id="application_deadline"
								name="application_deadline"
								type="date"
								value={form?.values?.application_deadline ?? ''}
							/>
						</div>
						<div>
							<label for="apply_url">Apply or learn more URL <span class="req">*</span></label>
							<input
								id="apply_url"
								name="apply_url"
								type="url"
								required
								value={form?.values?.apply_url ?? ''}
								placeholder={placeholders.applyUrl}
							/>
							<span class="hint">Link to application page or job posting.</span>
						</div>
					</div>
				</div>

				<div class="kb-form-section">
					<h3>Position description <span class="req">*</span></h3>
					<p class="kb-form-row" style="margin-bottom: 10px; font-size: 13px; color: var(--muted);">
						Use the toolbar for <strong>bold</strong>, <em>italic</em>, lists, and links. Write a clear overview of the role, responsibilities, and who you're looking for.
					</p>
					<div class="kb-form-row">
						<RichTextEditor
							bind:value={descriptionHtml}
							name="description"
							placeholder="Describe the role, key responsibilities, qualifications, and what makes this opportunity meaningful…"
							minHeight="220px"
							initialValue={form?.values?.description ?? ''}
						/>
					</div>
				</div>

				<div class="kb-form-section">
					<h3>Compensation &amp; benefits</h3>
					<div class="kb-form-row half">
						<div>
							<label for="compensation">Salary / compensation</label>
							<input
								id="compensation"
								name="compensation"
								type="text"
								value={form?.values?.compensation ?? ''}
								placeholder="e.g. $65,000–80,000 DOE or Stipend $3,000/mo"
							/>
							<span class="hint">Range, DOE, or “Competitive” — helps attract strong candidates.</span>
						</div>
						<div>
							<label for="benefits">Benefits (optional)</label>
							<input
								id="benefits"
								name="benefits"
								type="text"
								value={form?.values?.benefits ?? ''}
								placeholder="e.g. Health, 401k, PTO, flexible schedule"
							/>
						</div>
					</div>
					<div class="kb-form-row">
						<label class="kb-form-checkbox">
							<input type="checkbox" name="indigenous_priority" value="yes" />
							<span>We prioritize Indigenous hiring for this role (will be highlighted on the listing).</span>
						</label>
					</div>
				</div>

				<div class="kb-form-section">
					<h3>Image (optional)</h3>
					<div class="kb-form-row">
						<label for="image">Company logo or role image</label>
						<input
							id="image"
							name="image"
							type="file"
							accept="image/jpeg,image/png,image/webp"
						/>
						<span class="hint">JPG, PNG, or WebP, max 5 MB. Helps your posting stand out in the list.</span>
					</div>
				</div>

				<div class="kb-form-section">
					<h3>Your contact information</h3>
					<div class="kb-form-row half">
						<div>
							<label for="contact_name">Your name <span class="req">*</span></label>
							<input
								id="contact_name"
								name="contact_name"
								type="text"
								required
								value={form?.values?.contact_name ?? ''}
								placeholder="First Last"
							/>
						</div>
						<div>
							<label for="email">Your email <span class="req">*</span></label>
							<input
								id="email"
								name="email"
								type="email"
								required
								value={form?.values?.email ?? ''}
								placeholder={placeholders.email}
							/>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="contact_phone">Phone (optional)</label>
						<input
							id="contact_phone"
							name="contact_phone"
							type="tel"
							value={form?.values?.contact_phone ?? ''}
							placeholder={placeholders.phone}
						/>
						<span class="hint">Used only by IFS to follow up on your submission; not published.</span>
					</div>
				</div>

				<div class="kb-form-actions">
					<button type="submit" class="kb-btn-submit">Submit for review</button>
					<a href="/jobs" class="kb-btn-cancel">Cancel</a>
				</div>
			</form>
			<div class="kb-form-footer">
				Listings are free. By submitting you agree to IFS moderation and publishing terms. Your contact details are not shown on the public listing.
			</div>
		{/if}
	</div>
</div>
