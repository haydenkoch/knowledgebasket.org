<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import {
		redPagesServiceTypeOptions,
		redPagesAreaOptions,
		placeholders
	} from '$lib/data/formSchema';

	type FormResult = { success?: boolean; message?: string; error?: string; values?: Record<string, string> } | null;
	let { data } = $props();
	let form = $derived(($page as unknown as { form?: FormResult }).form ?? (data as { form?: FormResult })?.form ?? null);
	let descriptionHtml = $state('');
</script>

<div style="--kb-accent: var(--red)">
	<nav class="kb-breadcrumb">
		<a href="/red-pages">Red Pages</a>
		<span class="kb-bc-sep">›</span>
		<span>Add your business</span>
	</nav>

	<div class="kb-form-wrap">
		{#if form?.success}
			<div class="kb-success-wrap">
				<div class="kb-success-ico">✓</div>
				<h2>Listing submitted</h2>
				<p>{form.message}</p>
				<a href="/red-pages" class="kb-back-link">← Back to Red Pages</a>
			</div>
		{:else}
			<div class="kb-form-header">
				<h1>Add your business</h1>
				<p>Native-owned businesses, artists, and organizations: submit your listing for IFS staff review. Listings must be Native/Indigenous-owned or led.</p>
			</div>
			<div class="kb-form-notice" style="background: var(--red-lt); border-left-color: var(--red); color: var(--red);">
				📋 <strong>Eligibility:</strong> Listings must be Native/Indigenous-owned or led. Submissions are reviewed within 3–5 business days.
			</div>

			<form method="POST" action="?/default" use:enhance={() => {
				return ({ result, update }) => {
					if (result.type === 'success' || result.type === 'failure') update();
				};
			}}>
				{#if form?.error}
					<p class="kb-form-row" style="color: var(--red); margin-bottom: 16px">{form.error}</p>
				{/if}

				<div class="kb-form-section">
					<h3>Business information</h3>
					<div class="kb-form-row">
						<label for="business_name">Business / organization name <span class="req">*</span></label>
						<input
							id="business_name"
							name="business_name"
							type="text"
							required
							value={form?.values?.business_name ?? ''}
							placeholder="e.g. Numa Designs"
						/>
					</div>
					<div class="kb-form-row">
						<label for="tribal_affiliation">Tribal affiliation <span class="req">*</span></label>
						<input
							id="tribal_affiliation"
							name="tribal_affiliation"
							type="text"
							required
							value={form?.values?.tribal_affiliation ?? ''}
							placeholder="e.g. Paiute Nation, Paiute / Washoe Nation"
						/>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="service_type">Service type <span class="req">*</span></label>
							<select id="service_type" name="service_type" required>
								{#each redPagesServiceTypeOptions as opt}
									<option value={opt.value} selected={form?.values?.service_type === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="service_area">Service area</label>
							<select id="service_area" name="service_area">
								{#each redPagesAreaOptions as opt}
									<option value={opt.value} selected={form?.values?.service_area === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="description">Description <span class="req">*</span></label>
						<p class="kb-form-row" style="margin-bottom: 8px; font-size: 13px; color: var(--muted);">Use the toolbar for <strong>bold</strong>, <em>italic</em>, lists, and links.</p>
						<RichTextEditor
							bind:value={descriptionHtml}
							name="description"
							placeholder="Describe your business, services, and who you serve."
							minHeight="180px"
							initialValue={form?.values?.description ?? ''}
						/>
					</div>
					<div class="kb-form-row">
						<label for="website">Website (optional)</label>
						<input
							id="website"
							name="website"
							type="url"
							value={form?.values?.website ?? ''}
							placeholder={placeholders.applyUrl}
						/>
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
						<span class="hint">Used only by IFS to follow up; not published unless you request it.</span>
					</div>
				</div>

				<div class="kb-form-actions">
					<button type="submit" class="kb-btn-submit">Submit for review</button>
					<a href="/red-pages" class="kb-btn-cancel">Cancel</a>
				</div>
			</form>
			<div class="kb-form-footer">
				Listings are free. By submitting you confirm the business is Native/Indigenous-owned or led. IFS reserves the right to decline listings that do not meet eligibility.
			</div>
		{/if}
	</div>
</div>
