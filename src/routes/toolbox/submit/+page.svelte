<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import {
		toolboxMediaTypeOptions,
		toolboxCategoryOptions,
		placeholders,
		suggestedOrganizations
	} from '$lib/data/formSchema';

	type FormResult = { success?: boolean; message?: string; error?: string; values?: Record<string, string> } | null;
	let { data } = $props();
	let form = $derived(($page as unknown as { form?: FormResult }).form ?? (data as { form?: FormResult })?.form ?? null);
	let descriptionHtml = $state('');
</script>

<div style="--kb-accent: var(--slate)">
	<nav class="kb-breadcrumb">
		<a href="/toolbox">Toolbox</a>
		<span class="kb-bc-sep">›</span>
		<span>Submit a resource</span>
	</nav>

	<div class="kb-form-wrap">
		{#if form?.success}
			<div class="kb-success-wrap">
				<div class="kb-success-ico">✓</div>
				<h2>Resource submitted</h2>
				<p>{form.message}</p>
				<a href="/toolbox" class="kb-back-link">← Back to Toolbox</a>
			</div>
		{:else}
			<div class="kb-form-header">
				<h1>Submit a resource</h1>
				<p>Add a link, report, toolkit, video, or other resource. The Toolbox prioritizes resources that support Indigenous sovereignty, cultural economies, land stewardship, and community self-determination. Submissions are reviewed for alignment before publishing.</p>
			</div>
			<div class="kb-form-notice" style="background: var(--slate-lt); border-left-color: var(--slate); color: var(--slate);">
				📋 <strong>Curatorial note:</strong> Resources are reviewed within 3–5 business days. We prioritize content that supports Indigenous sovereignty and self-determination.
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
					<h3>Resource details</h3>
					<div class="kb-form-row">
						<label for="resource_title">Resource title <span class="req">*</span></label>
						<input
							id="resource_title"
							name="resource_title"
							type="text"
							required
							value={form?.values?.resource_title ?? ''}
							placeholder="e.g. NCAI Tribal Economic Development Toolkit"
						/>
					</div>
					<div class="kb-form-row">
						<label for="url">URL / link <span class="req">*</span></label>
						<input
							id="url"
							name="url"
							type="url"
							required
							value={form?.values?.url ?? ''}
							placeholder={placeholders.applyUrl}
						/>
						<span class="hint">Public URL where the resource can be accessed.</span>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="media_type">Resource type</label>
							<select id="media_type" name="media_type">
								{#each toolboxMediaTypeOptions as opt}
									<option value={opt.value} selected={form?.values?.media_type === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="category">Category</label>
							<select id="category" name="category">
								{#each toolboxCategoryOptions as opt}
									<option value={opt.value} selected={form?.values?.category === opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="source">Source / publisher (optional)</label>
						<input
							id="source"
							name="source"
							type="text"
							value={form?.values?.source ?? ''}
							placeholder={placeholders.organization}
							list="datalist-organizations"
						/>
						<datalist id="datalist-organizations">
							{#each suggestedOrganizations as org}
								<option value={org}></option>
							{/each}
						</datalist>
					</div>
					<div class="kb-form-row">
						<label for="description">Description <span class="req">*</span></label>
						<p class="kb-form-row" style="margin-bottom: 8px; font-size: 13px; color: var(--muted);">Use the toolbar for <strong>bold</strong>, <em>italic</em>, lists, and links.</p>
						<RichTextEditor
							bind:value={descriptionHtml}
							name="description"
							placeholder="Briefly describe what this resource is and why it's valuable for Indigenous communities and allies."
							minHeight="180px"
							initialValue={form?.values?.description ?? ''}
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
					<a href="/toolbox" class="kb-btn-cancel">Cancel</a>
				</div>
			</form>
			<div class="kb-form-footer">
				Submissions are reviewed within 3–5 business days. IFS will add the resource to the Toolbox if it aligns with our mission. By submitting you agree to our curation and publishing terms.
			</div>
		{/if}
	</div>
</div>
