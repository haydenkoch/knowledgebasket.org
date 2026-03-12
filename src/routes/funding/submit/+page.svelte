<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import {
		fundingTypeOptions,
		fundingStatusOptions,
		fundingFocusOptions,
		geographyOptions,
		placeholders,
		suggestedOrganizations
	} from '$lib/data/formSchema';

	type FormResult = { success?: boolean; message?: string; error?: string; values?: Record<string, string> } | null;
	let { data } = $props();
	let form = $derived(($page as unknown as { form?: FormResult }).form ?? (data as { form?: FormResult })?.form ?? null);
	let descriptionHtml = $state('');
</script>

<div style="--kb-accent: var(--gold)">
	<nav class="kb-breadcrumb">
		<a href="/funding">Funding</a>
		<span class="kb-bc-sep">›</span>
		<span>Submit funding opportunity</span>
	</nav>

	<div class="kb-form-wrap">
		{#if form?.success}
			<div class="kb-success-wrap">
				<div class="kb-success-ico">✓</div>
				<h2>Funding opportunity submitted</h2>
				<p>{form.message}</p>
				<a href="/funding" class="kb-back-link">← Back to Funding</a>
			</div>
		{:else}
			<div class="kb-form-header">
				<h1>Submit a funding opportunity</h1>
				<p>Share grants, contracts, fellowships, or funding programs for IFS staff to review and list. All submissions are reviewed before publishing.</p>
			</div>
			<div class="kb-form-notice" style="background: var(--gold-lt); border-left-color: var(--gold); color: var(--gold);">
				📋 <strong>Moderation:</strong> Listings are reviewed within 3–5 business days. You'll receive an email when your opportunity is approved or if we need more information.
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
					<h3>Opportunity details</h3>
					<div class="kb-form-row">
						<label for="opportunity_name">Opportunity name <span class="req">*</span></label>
						<input
							id="opportunity_name"
							name="opportunity_name"
							type="text"
							required
							value={form?.values?.opportunity_name ?? ''}
							placeholder="e.g. California Forest Stewardship Program"
						/>
					</div>
					<div class="kb-form-row">
						<label for="funder">Funder / organization <span class="req">*</span></label>
						<input
							id="funder"
							name="funder"
							type="text"
							required
							value={form?.values?.funder ?? ''}
							placeholder={placeholders.organization}
							list="datalist-organizations"
						/>
						<datalist id="datalist-organizations">
							{#each suggestedOrganizations as org}
								<option value={org}></option>
							{/each}
						</datalist>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="funding_type">Type</label>
							<select id="funding_type" name="funding_type">
								{#each fundingTypeOptions as opt}
									<option value={opt.value} selected={form?.values?.funding_type === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="status">Status <span class="req">*</span></label>
							<select id="status" name="status" required>
								{#each fundingStatusOptions as opt}
									<option value={opt.value} selected={form?.values?.status === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="focus">Focus area</label>
							<select id="focus" name="focus">
								{#each fundingFocusOptions as opt}
									<option value={opt.value} selected={form?.values?.focus === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="geography">Geography</label>
							<select id="geography" name="geography">
								{#each geographyOptions as opt}
									<option value={opt.value} selected={form?.values?.geography === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="amount">Amount / range (optional)</label>
						<input
							id="amount"
							name="amount"
							type="text"
							value={form?.values?.amount ?? ''}
							placeholder="e.g. $25,000 – $500,000"
						/>
					</div>
					<div class="kb-form-row">
						<label for="description">Description <span class="req">*</span></label>
						<p class="kb-form-row" style="margin-bottom: 8px; font-size: 13px; color: var(--muted);">Use the toolbar for <strong>bold</strong>, <em>italic</em>, lists, and links.</p>
						<RichTextEditor
							bind:value={descriptionHtml}
							name="description"
							placeholder="Describe the opportunity, eligibility, and how to apply."
							minHeight="180px"
							initialValue={form?.values?.description ?? ''}
						/>
					</div>
					<div class="kb-form-row">
						<label for="apply_url">Application / more info URL</label>
						<input
							id="apply_url"
							name="apply_url"
							type="url"
							value={form?.values?.apply_url ?? ''}
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
					<span class="hint">Used only to confirm your submission; not published.</span>
				</div>

				<div class="kb-form-actions">
					<button type="submit" class="kb-btn-submit">Submit for review</button>
					<a href="/funding" class="kb-btn-cancel">Cancel</a>
				</div>
			</form>
			<div class="kb-form-footer">
				Submissions are reviewed within 3–5 business days. Listings are free. By submitting you agree to IFS moderation and publishing terms.
			</div>
		{/if}
	</div>
</div>
