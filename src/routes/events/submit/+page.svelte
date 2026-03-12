<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { CalendarDate, getLocalTimeZone } from '@internationalized/date';
	import {
		eventTypeTags,
		eventGeographyOptions,
		eventAudienceOptions,
		eventCostOptions,
		placeholders,
		suggestedOrganizations
	} from '$lib/data/formSchema';
	import * as Command from '$lib/components/ui/command/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';

	/** Photon API feature (GeoJSON) */
	type GeoFeature = {
		type: 'Feature';
		geometry: { type: 'Point'; coordinates: [number, number] };
		properties: Record<string, string | number | undefined>;
	};

	function geoDisplayName(f: GeoFeature): string {
		const p = f.properties;
		const street = [p.street, p.housenumber].filter(Boolean).join(' ');
		const parts = [street, p.name, p.city, p.state].filter(Boolean);
		return parts.length > 0 ? parts.join(', ') : String(p.name ?? '');
	}

	function geoCityState(f: GeoFeature): string {
		const p = f.properties;
		const city = p.city ?? p.name;
		const state = p.state ?? p.country;
		if (city && state) return `${city}, ${state}`;
		return city ? String(city) : String(state ?? '');
	}

	/** Street line for address field (street + housenumber) */
	function geoStreetAddress(f: GeoFeature): string {
		const p = f.properties;
		const street = [p.street, p.housenumber].filter(Boolean).join(' ');
		return street || geoDisplayName(f);
	}

	/** Sort suggestions so California results appear first; do not exclude others */
	function sortCaliforniaFirst(features: GeoFeature[]): GeoFeature[] {
		return [...features].sort((a, b) => {
			const aCA = a.properties?.state === 'California';
			const bCA = b.properties?.state === 'California';
			if (aCA && !bCA) return -1;
			if (!aCA && bCA) return 1;
			return 0;
		});
	}

	type FormResult = { success?: boolean; message?: string; error?: string; values?: Record<string, string> } | null;
	let { data } = $props();
	let form = $derived(($page as unknown as { form?: FormResult }).form ?? (data as { form?: FormResult })?.form ?? null);
	let submitting = $state(false);
	let descriptionHtml = $state('');
	let eventTypes = $state<string[]>([]);
	let eventTypeOpen = $state(false);
	let geography = $state('');
	let audience = $state('');
	let cost = $state('');

	$effect(() => {
		const v = form?.values;
		if (v) {
			if (v.event_type != null) {
				const s = String(v.event_type).trim();
				eventTypes = s ? s.split(',').map((t) => t.trim()).filter(Boolean) : [];
			}
			if (v.geography != null) geography = v.geography;
			if (v.audience != null) audience = v.audience;
			if (v.cost != null) cost = v.cost;
		}
	});

	function toggleEventType(tag: string) {
		if (eventTypes.includes(tag)) {
			eventTypes = eventTypes.filter((t) => t !== tag);
		} else {
			eventTypes = [...eventTypes, tag];
		}
	}
	function removeEventType(tag: string) {
		eventTypes = eventTypes.filter((t) => t !== tag);
	}

	function parseYmd(str: string | undefined): CalendarDate | undefined {
		if (!str) return undefined;
		const [y, m, d] = str.split('-').map(Number);
		if (!y || !m || !d) return undefined;
		return new CalendarDate(y, m, d);
	}

	function toYmd(date: CalendarDate | undefined): string {
		if (!date) return '';
		const js = date.toDate(getLocalTimeZone());
		const y = js.getFullYear();
		const m = String(js.getMonth() + 1).padStart(2, '0');
		const d = String(js.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	const today = new Date();
	const windowStart = new CalendarDate(today.getFullYear(), today.getMonth() - 11, 1);
	const windowEnd = new CalendarDate(today.getFullYear(), today.getMonth() + 12, today.getDate());

	let startDate = $state<CalendarDate | undefined>(undefined);
	let endDate = $state<CalendarDate | undefined>(undefined);

	const startDateStr = $derived(toYmd(startDate));
	const endDateStr = $derived(toYmd(endDate));

	let hostOrg = $state('');
	let address = $state('');
	let cityState = $state('');
	let lat = $state<number | undefined>(undefined);
	let lng = $state<number | undefined>(undefined);
	let orgDropdownOpen = $state(false);
	let addressDropdownOpen = $state(false);
	let locationDropdownOpen = $state(false);
	let addressSuggestions = $state<GeoFeature[]>([]);
	let addressLoading = $state(false);
	let locationSuggestions = $state<GeoFeature[]>([]);
	let locationLoading = $state(false);
	let orgWrapEl = $state<HTMLDivElement | undefined>(undefined);
	let addressWrapEl = $state<HTMLDivElement | undefined>(undefined);
	let locationWrapEl = $state<HTMLDivElement | undefined>(undefined);

	const formValues = $derived(form?.values);
	$effect(() => {
		const v = formValues;
		if (v) {
			if (v.host_org != null) hostOrg = v.host_org;
			if (v.address != null) address = v.address;
			if (v.city_state != null) cityState = v.city_state;
			const latNum = v.lat != null && v.lat !== '' ? parseFloat(String(v.lat)) : undefined;
			const lngNum = v.lng != null && v.lng !== '' ? parseFloat(String(v.lng)) : undefined;
			if (Number.isFinite(latNum)) lat = latNum;
			if (Number.isFinite(lngNum)) lng = lngNum;
			const start = parseYmd(v.start_date);
			if (start != null) startDate = start;
			const end = parseYmd(v.end_date);
			if (end != null) endDate = end;
		}
	});

	const filteredOrgs = $derived(
		hostOrg.trim() === ''
			? suggestedOrganizations
			: suggestedOrganizations.filter((o) =>
					o.toLowerCase().includes(hostOrg.trim().toLowerCase())
			  )
	);

	let geoTimeout: ReturnType<typeof setTimeout> | undefined;
	let addressGeoTimeout: ReturnType<typeof setTimeout> | undefined;

	async function fetchGeoSuggestions(
		query: string,
		setResults: (f: GeoFeature[]) => void,
		setLoading: (v: boolean) => void
	) {
		const q = query.trim();
		if (q.length < 2) {
			setResults([]);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`/events/submit/geo?q=${encodeURIComponent(q)}&limit=12`);
			const data = await res.json();
			const features = (data.features ?? []) as GeoFeature[];
			setResults(sortCaliforniaFirst(features));
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}

	function fetchLocationSuggestions(query: string) {
		fetchGeoSuggestions(query, (f) => (locationSuggestions = f), (v) => (locationLoading = v));
	}
	function fetchAddressSuggestions(query: string) {
		fetchGeoSuggestions(query, (f) => (addressSuggestions = f), (v) => (addressLoading = v));
	}

	function scheduleGeoFetch() {
		if (geoTimeout) clearTimeout(geoTimeout);
		const q = cityState.trim();
		if (q.length < 2) {
			locationSuggestions = [];
			return;
		}
		geoTimeout = setTimeout(() => fetchLocationSuggestions(q), 300);
	}
	function scheduleAddressGeoFetch() {
		if (addressGeoTimeout) clearTimeout(addressGeoTimeout);
		const q = address.trim();
		if (q.length < 2) {
			addressSuggestions = [];
			return;
		}
		addressGeoTimeout = setTimeout(() => fetchAddressSuggestions(q), 300);
	}

	function handleClickOutside(e: MouseEvent) {
		if (orgWrapEl && !orgWrapEl.contains(e.target as Node)) orgDropdownOpen = false;
		if (addressWrapEl && !addressWrapEl.contains(e.target as Node)) addressDropdownOpen = false;
		if (locationWrapEl && !locationWrapEl.contains(e.target as Node)) locationDropdownOpen = false;
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<svelte:head>
	<title>Submit an event | Events | Knowledge Basket</title>
	<meta name="description" content="Submit an Indigenous-led or Indigenous-serving event for the Knowledge Basket. Free listings; reviewed by IFS staff." />
</svelte:head>

<div style="--kb-accent: var(--teal)">
	<nav class="kb-breadcrumb">
		<a href="/events">Events</a>
		<span class="kb-bc-sep">›</span>
		<span>Submit an Event</span>
	</nav>

	<div class="kb-form-wrap">
		{#if form?.success}
			<div class="kb-success-wrap" role="status" aria-live="polite">
				<div class="kb-success-ico">✓</div>
				<h2>Event submitted</h2>
				<p>{form.message}</p>
				<a href="/events" class="kb-back-link">← Back to Events</a>
			</div>
		{:else}
			<div class="kb-form-header">
				<h1>Submit an Event</h1>
				<p>List an Indigenous-led or Indigenous-serving event in the Knowledge Basket. All submissions are reviewed by IFS staff before publishing. Listings are free.</p>
			</div>
			<div class="kb-form-notice">
				📋 <strong>Moderation Note:</strong> All submissions are reviewed within 3–5 business days. You'll receive an email when your event is approved or if IFS staff need more information.
			</div>

			<form method="POST" action="?/default" enctype="multipart/form-data" aria-describedby={form?.error ? 'submit-error' : undefined} use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					try {
						if (result.type === 'success' || result.type === 'failure') await update();
					} finally {
						submitting = false;
					}
				};
			}}>
				{#if form?.error}
					<div id="submit-error" class="kb-form-row" role="alert" aria-live="assertive" style="color: var(--red); margin-bottom: 16px">{form.error}</div>
				{/if}

				<div class="kb-form-section">
					<h3>Event Information</h3>
					<div class="kb-form-row">
						<label for="event_name">Event Name <span class="req">*</span></label>
						<input
							id="event_name"
							name="event_name"
							type="text"
							required
							value={form?.values?.event_name ?? ''}
							placeholder="e.g. 31st Annual Big Time Gathering"
						/>
					</div>
					<div class="kb-form-row">
						<label for="host_org">Hosting Organization / Entity <span class="req">*</span></label>
						<div class="kb-form-search-container" bind:this={orgWrapEl}>
							<input
								id="host_org"
								name="host_org"
								type="text"
								required
								bind:value={hostOrg}
								placeholder={placeholders.organization}
								onfocus={() => (orgDropdownOpen = true)}
								autocomplete="off"
							/>
							{#if orgDropdownOpen && filteredOrgs.length > 0}
								<div
									class="kb-form-search-dropdown"
									role="listbox"
									aria-label="Suggested organizations"
								>
									<ul class="kb-form-search-dropdown-list">
										{#each filteredOrgs as org (org)}
											<li role="option" aria-selected={hostOrg === org}>
												<button
													type="button"
													class="kb-form-search-dropdown-item"
													onclick={() => {
														hostOrg = org;
														orgDropdownOpen = false;
													}}
												>
													{org}
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{:else if orgDropdownOpen && hostOrg.trim() && filteredOrgs.length === 0}
								<div class="kb-form-search-dropdown kb-form-search-dropdown--empty">
									No suggestions. You can enter any organization name.
								</div>
							{/if}
						</div>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="event_type">Event Type <span class="req">*</span></label>
							<input type="hidden" name="event_type" value={eventTypes.join(', ')} />
							<Popover.Root bind:open={eventTypeOpen}>
								<Popover.Trigger id="event_type" class="kb-form-type-trigger-wrap" aria-label="Add event type tags">
									<div class="kb-form-type-trigger" class:empty={eventTypes.length === 0}>
										{#if eventTypes.length > 0}
											<span class="kb-form-type-chips">
												{#each eventTypes as tag (tag)}
													<span class="kb-form-type-chip">
														{tag}
														<button
															type="button"
															class="kb-form-type-chip-remove"
															aria-label="Remove {tag}"
															onclick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																removeEventType(tag);
															}}
														>
															<XIcon class="size-3" />
														</button>
													</span>
												{/each}
											</span>
										{/if}
										<span class="kb-form-type-placeholder">{eventTypes.length ? 'Add another…' : 'Search to add types…'}</span>
									</div>
								</Popover.Trigger>
								<Popover.Content class="w-[var(--radix-popover-trigger-width)] p-0" align="start">
									<Command.Root>
										<Command.Input placeholder="Search types…" />
										<Command.List>
											<Command.Empty>No type found.</Command.Empty>
											<Command.Group>
												{#each eventTypeTags as tag (tag)}
													<Command.Item
														value={tag}
														onSelect={() => toggleEventType(tag)}
													>
														<span class:invisible={!eventTypes.includes(tag)}>
															<CheckIcon class="size-4 shrink-0" />
														</span>
														{tag}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
							<span class="hint">Select one or more; e.g. Powwow, Big Time.</span>
						</div>
						<div>
							<label for="geography">Geography <span class="req">*</span></label>
							<input type="hidden" name="geography" value={geography} />
							<Select.Root type="single" bind:value={geography}>
								<Select.Trigger class="kb-form-select">
									{eventGeographyOptions.find((o) => o.value === geography)?.label ?? 'Choose geography'}
								</Select.Trigger>
								<Select.Content>
									{#each eventGeographyOptions as opt}
										<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>
					<div class="kb-form-row half">
						<div>
							<label for="audience">Primary Audience <span class="req">*</span></label>
							<input type="hidden" name="audience" value={audience} />
							<Select.Root type="single" bind:value={audience}>
								<Select.Trigger class="kb-form-select">
									{eventAudienceOptions.find((o) => o.value === audience)?.label ?? 'Choose audience'}
								</Select.Trigger>
								<Select.Content>
									{#each eventAudienceOptions as opt}
										<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<div>
							<label for="cost">Cost <span class="req">*</span></label>
							<input type="hidden" name="cost" value={cost} />
							<Select.Root type="single" bind:value={cost}>
								<Select.Trigger class="kb-form-select">
									{eventCostOptions.find((o) => o.value === cost)?.label ?? 'Choose cost'}
								</Select.Trigger>
								<Select.Content>
									{#each eventCostOptions as opt}
										<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="description">Event Description <span class="req">*</span></label>
						<RichTextEditor
							bind:value={descriptionHtml}
							name="description"
							placeholder="Describe the event. Include what attendees can expect, cultural context, and any important details."
							minHeight="180px"
							initialValue={form?.values?.description ?? ''}
						/>
						<span class="hint">Your contact info is not published.</span>
					</div>
				</div>

				<div class="kb-form-section">
					<h3>Date, Time &amp; Location</h3>
					<div class="kb-form-row half">
						<div>
							<label for="start_date">Start Date <span class="req">*</span></label>
							<div class="kb-date-row">
								<input type="hidden" name="start_date" value={startDateStr} />
								<Popover.Root>
									<Popover.Trigger id="start_date">
										<Button
											variant="outline"
											class="kb-date-btn"
										>
											{startDate
												? startDate.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
														month: '2-digit',
														day: '2-digit',
														year: 'numeric'
												  })
												: 'MM/DD/YYYY'}
										</Button>
									</Popover.Trigger>
									<Popover.Content class="w-auto overflow-hidden p-0" align="start">
										<Calendar
											type="single"
											bind:value={startDate}
											captionLayout="dropdown"
										/>
									</Popover.Content>
								</Popover.Root>
								{#if startDate}
									<button type="button" class="kb-date-clear" onclick={() => (startDate = undefined)}>Clear</button>
								{/if}
							</div>
						</div>
						<div>
							<label for="end_date">End Date</label>
							<div class="kb-date-row">
								<input type="hidden" name="end_date" value={endDateStr} />
								<Popover.Root>
									<Popover.Trigger id="end_date">
										<Button
											variant="outline"
											class="kb-date-btn"
										>
											{endDate
												? endDate.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
														month: '2-digit',
														day: '2-digit',
														year: 'numeric'
												  })
												: 'MM/DD/YYYY'}
										</Button>
									</Popover.Trigger>
									<Popover.Content class="w-auto overflow-hidden p-0" align="start">
										<Calendar
											type="single"
											bind:value={endDate}
											captionLayout="dropdown"
										/>
									</Popover.Content>
								</Popover.Root>
								{#if endDate}
									<button type="button" class="kb-date-clear" onclick={() => (endDate = undefined)}>Clear</button>
								{/if}
							</div>
							<span class="hint">Leave blank for single-day events.</span>
						</div>
					</div>
					<div class="kb-form-row">
						<label for="venue">Venue Name</label>
						<input
							id="venue"
							name="venue"
							type="text"
							value={form?.values?.venue ?? ''}
							placeholder={placeholders.venue}
						/>
					</div>
					<div class="kb-form-row">
						<label for="address">Address</label>
						<div class="kb-form-search-container" bind:this={addressWrapEl}>
							<input
								id="address"
								name="address"
								type="text"
								bind:value={address}
								placeholder="e.g. 123 Main St"
								onfocus={() => (addressDropdownOpen = true)}
								oninput={() => scheduleAddressGeoFetch()}
								autocomplete="off"
							/>
							{#if addressDropdownOpen && addressLoading}
								<div class="kb-form-search-dropdown kb-form-search-dropdown--empty">
									Searching…
								</div>
							{:else if addressDropdownOpen && addressSuggestions.length > 0}
								<div
									class="kb-form-search-dropdown"
									role="listbox"
									aria-label="Suggested addresses"
								>
									<ul class="kb-form-search-dropdown-list">
										{#each addressSuggestions as f (String(f.properties?.osm_id ?? '') + (f.geometry?.coordinates?.join('-') ?? ''))}
											<li role="option" aria-selected={address === geoStreetAddress(f)}>
												<button
													type="button"
													class="kb-form-search-dropdown-item"
													onclick={() => {
														address = geoStreetAddress(f);
														cityState = geoCityState(f);
														const coords = f.geometry?.coordinates;
														if (coords?.length >= 2) {
															lng = coords[0];
															lat = coords[1];
														}
														addressDropdownOpen = false;
													}}
												>
													{geoDisplayName(f)}
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{:else if addressDropdownOpen && address.trim().length >= 2 && !addressLoading && addressSuggestions.length === 0}
								<div class="kb-form-search-dropdown kb-form-search-dropdown--empty">
									No results. You can keep typing or use the text as-is.
								</div>
							{/if}
						</div>
						<span class="hint">Optional. Start typing to search; selecting fills address and City, State for map view.</span>
					</div>
					<div class="kb-form-row">
						<label for="city_state">City, State <span class="req">*</span></label>
						<div class="kb-form-search-container" bind:this={locationWrapEl}>
							<input type="hidden" name="city_state" value={cityState} />
							<input type="hidden" name="lat" value={lat ?? ''} />
							<input type="hidden" name="lng" value={lng ?? ''} />
							<input
								id="city_state"
								type="text"
								required
								bind:value={cityState}
								placeholder={placeholders.locationCityState}
								onfocus={() => (locationDropdownOpen = true)}
								oninput={() => scheduleGeoFetch()}
								autocomplete="off"
								aria-describedby="city_state_help"
							/>
							{#if locationDropdownOpen && locationLoading}
								<div class="kb-form-search-dropdown kb-form-search-dropdown--empty">
									Searching…
								</div>
							{:else if locationDropdownOpen && locationSuggestions.length > 0}
								<div
									class="kb-form-search-dropdown"
									role="listbox"
									aria-label="Suggested locations"
								>
									<ul class="kb-form-search-dropdown-list">
										{#each locationSuggestions as f (String(f.properties?.osm_id ?? '') + (f.geometry?.coordinates?.join('-') ?? ''))}
											<li role="option" aria-selected={cityState === geoDisplayName(f)}>
												<button
													type="button"
													class="kb-form-search-dropdown-item"
													onclick={() => {
														cityState = geoDisplayName(f);
														const coords = f.geometry?.coordinates;
														if (coords?.length >= 2) {
															lng = coords[0];
															lat = coords[1];
														}
														locationDropdownOpen = false;
													}}
												>
													{geoDisplayName(f)}
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{:else if locationDropdownOpen && cityState.trim().length >= 2 && !locationLoading && locationSuggestions.length === 0}
								<div class="kb-form-search-dropdown kb-form-search-dropdown--empty">
									No results. You can keep typing or use the text as-is.
								</div>
							{/if}
						</div>
						<span id="city_state_help" class="hint">Start typing to search for a place; select one for map view.</span>
					</div>
					<div class="kb-form-row">
						<label for="event_url">Event Link / Registration URL <span class="req">*</span></label>
						<input
							id="event_url"
							name="event_url"
							type="url"
							required
							value={form?.values?.event_url ?? ''}
							placeholder={placeholders.applyUrl}
						/>
						<span class="hint">Where attendees can get details or register.</span>
					</div>
				</div>

				<div class="kb-form-section">
					<h3>Event Image (Optional)</h3>
					<div class="kb-form-row">
						<label for="image">Upload a flyer or image</label>
						<div class="kb-dropzone">
							<input
								id="image"
								name="image"
								type="file"
								accept="image/jpeg,image/png,image/webp"
								class="kb-dropzone-input"
							/>
							<div class="kb-dropzone-inner">
								<div class="kb-dropzone-title">Drop image here or click to upload</div>
								<div class="kb-dropzone-sub">JPG, PNG, or WebP · max 5 MB</div>
							</div>
						</div>
					</div>
				</div>

				<div class="kb-form-section kb-form-section--contact">
					<h3>Your Contact Information</h3>
					<div class="kb-form-contact-fields">
						<div class="kb-form-row">
							<label for="contact_name">Your Name <span class="req">*</span></label>
							<input
								id="contact_name"
								name="contact_name"
								type="text"
								required
								value={form?.values?.contact_name ?? ''}
								placeholder="First Last"
							/>
						</div>
						<div class="kb-form-row">
							<label for="email">Your Email <span class="req">*</span></label>
							<input
								id="email"
								name="email"
								type="email"
								required
								value={form?.values?.email ?? ''}
								placeholder={placeholders.email}
							/>
						</div>
						<p class="kb-form-contact-hint">Used only to confirm your submission; not published.</p>
					</div>
				</div>

				<div class="kb-form-actions">
					<button type="submit" class="kb-btn-submit" disabled={submitting} aria-busy={submitting}>
						{submitting ? 'Submitting…' : 'Submit for review'}
					</button>
					<a href="/events" class="kb-btn-cancel">Cancel</a>
				</div>
			</form>
			<div class="kb-form-footer">
				Submissions are reviewed within 3–5 business days. Listings are free. By submitting you agree to IFS moderation and publishing terms.
			</div>
		{/if}
	</div>
</div>
