<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import KbFormShell from '$lib/components/organisms/KbFormShell.svelte';
	import KbFileDropzone from '$lib/components/molecules/KbFileDropzone.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
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
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

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

	function geoStreetAddress(f: GeoFeature): string {
		const p = f.properties;
		const street = [p.street, p.housenumber].filter(Boolean).join(' ');
		return street || geoDisplayName(f);
	}

	function sortCaliforniaFirst(features: GeoFeature[]): GeoFeature[] {
		return [...features].sort((a, b) => {
			const aCA = a.properties?.state === 'California';
			const bCA = b.properties?.state === 'California';
			if (aCA && !bCA) return -1;
			if (!aCA && bCA) return 1;
			return 0;
		});
	}

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
				eventTypes = s
					? s
							.split(',')
							.map((t) => t.trim())
							.filter(Boolean)
					: [];
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
			: suggestedOrganizations.filter((o) => o.toLowerCase().includes(hostOrg.trim().toLowerCase()))
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
		fetchGeoSuggestions(
			query,
			(f) => (locationSuggestions = f),
			(v) => (locationLoading = v)
		);
	}
	function fetchAddressSuggestions(query: string) {
		fetchGeoSuggestions(
			query,
			(f) => (addressSuggestions = f),
			(v) => (addressLoading = v)
		);
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

	const successData = $derived(
		form?.success
			? {
					heading: 'Event submitted',
					message: form.message ?? '',
					backHref: '/events',
					backLabel: 'Back to Events'
				}
			: null
	);
</script>

<svelte:head>
	<title>Submit an event | Events | Knowledge Basket</title>
	<meta
		name="description"
		content="Submit an Indigenous-led or Indigenous-serving event for the Knowledge Basket. Free listings; reviewed by IFS staff."
	/>
</svelte:head>

<KbFormShell
	coil="events"
	breadcrumbHref="/events"
	breadcrumbLabel="Events"
	pageTitle="Submit an Event"
	pageDescription="List an Indigenous-led or Indigenous-serving event in the Knowledge Basket. All submissions are reviewed by IFS staff before publishing. Listings are free."
	noticeLabel="Moderation Note"
	noticeText="All submissions are reviewed within 3–5 business days. You'll receive an email when your event is approved or if IFS staff need more information."
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
		enctype="multipart/form-data"
		aria-describedby={form?.error ? 'submit-error' : undefined}
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
				id="submit-error"
				role="alert"
				aria-live="assertive"
				class="mb-6 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>
		{/if}

		<!-- Event Information -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Event Information</h3>

			<Field.Field>
				<Field.Label for="event_name"
					>Event Name <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="event_name"
						name="event_name"
						type="text"
						required
						value={form?.values?.event_name ?? ''}
						placeholder="e.g. 31st Annual Big Time Gathering"
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="host_org"
					>Hosting Organization / Entity <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<div class="relative" bind:this={orgWrapEl}>
						<Input
							id="host_org"
							name="host_org"
							type="text"
							required
							bind:value={hostOrg}
							placeholder={placeholders.organization}
							onfocus={() => (orgDropdownOpen = true)}
							autocomplete="off"
							class="w-full"
						/>
						{#if orgDropdownOpen && filteredOrgs.length > 0}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
								role="listbox"
								aria-label="Suggested organizations"
							>
								{#each filteredOrgs as org (org)}
									<button
										type="button"
										role="option"
										aria-selected={hostOrg === org}
										class="w-full cursor-pointer rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
										onclick={() => {
											hostOrg = org;
											orgDropdownOpen = false;
										}}>{org}</button
									>
								{/each}
							</div>
						{:else if orgDropdownOpen && hostOrg.trim() && filteredOrgs.length === 0}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md"
							>
								No suggestions. You can enter any organization name.
							</div>
						{/if}
					</div>
				</Field.Content>
			</Field.Field>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="event_type"
						>Event Type <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<input type="hidden" name="event_type" value={eventTypes.join(', ')} />
						<Popover.Root bind:open={eventTypeOpen}>
							<Popover.Trigger
								id="event_type"
								class="flex min-h-9 w-full items-start justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
								aria-label="Add event type tags"
							>
								<div class="flex flex-wrap gap-1.5">
									{#if eventTypes.length > 0}
										{#each eventTypes as tag (tag)}
											<span
												class="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase"
											>
												{tag}
												<button
													type="button"
													aria-label="Remove {tag}"
													onclick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														removeEventType(tag);
													}}
													class="hover:opacity-70"><XIcon class="size-3" /></button
												>
											</span>
										{/each}
									{/if}
									<span class="text-muted-foreground"
										>{eventTypes.length ? 'Add another…' : 'Search to add types…'}</span
									>
								</div>
							</Popover.Trigger>
							<Popover.Content class="w-[var(--radix-popover-trigger-width)] p-0" align="start">
								<Command.Root>
									<Command.Input placeholder="Search types…" />
									<Command.List>
										<Command.Empty>No type found.</Command.Empty>
										<Command.Group>
											{#each eventTypeTags as tag (tag)}
												<Command.Item value={tag} onSelect={() => toggleEventType(tag)}>
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
					</Field.Content>
					<Field.Description>Select one or more; e.g. Powwow, Big Time.</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="geography"
						>Geography <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<input type="hidden" name="geography" value={geography} />
						<Select.Root type="single" bind:value={geography}>
							<Select.Trigger class="w-full">
								{eventGeographyOptions.find((o) => o.value === geography)?.label ??
									'Choose geography'}
							</Select.Trigger>
							<Select.Content>
								{#each eventGeographyOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="audience"
						>Primary Audience <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<input type="hidden" name="audience" value={audience} />
						<Select.Root type="single" bind:value={audience}>
							<Select.Trigger class="w-full">
								{eventAudienceOptions.find((o) => o.value === audience)?.label ?? 'Choose audience'}
							</Select.Trigger>
							<Select.Content>
								{#each eventAudienceOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="cost">Cost <span class="text-destructive">*</span></Field.Label>
					<Field.Content>
						<input type="hidden" name="cost" value={cost} />
						<Select.Root type="single" bind:value={cost}>
							<Select.Trigger class="w-full">
								{eventCostOptions.find((o) => o.value === cost)?.label ?? 'Choose cost'}
							</Select.Trigger>
							<Select.Content>
								{#each eventCostOptions as opt}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Content>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="description"
					>Event Description <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<RichTextEditor
						bind:value={descriptionHtml}
						mode="plain"
						name="description"
						placeholder="Describe the event. Include what attendees can expect, cultural context, and any important details."
						minHeight="180px"
						initialValue={form?.values?.description ?? ''}
					/>
				</Field.Content>
			</Field.Field>
		</div>

		<!-- Date, Time & Location -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">Date, Time &amp; Location</h3>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="start_date"
						>Start Date <span class="text-destructive">*</span></Field.Label
					>
					<Field.Content>
						<input type="hidden" name="start_date" value={startDateStr} />
						<Popover.Root>
							<Popover.Trigger id="start_date" class="w-full">
								<Button variant="outline" class="w-full justify-start font-normal">
									<CalendarIcon class="mr-2 size-4 text-muted-foreground" />
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
								<Calendar type="single" bind:value={startDate} captionLayout="dropdown" />
							</Popover.Content>
						</Popover.Root>
						{#if startDate}
							<button
								type="button"
								class="mt-1 text-xs text-muted-foreground hover:text-foreground"
								onclick={() => (startDate = undefined)}>Clear</button
							>
						{/if}
					</Field.Content>
				</Field.Field>

				<Field.Field>
					<Field.Label for="end_date">End Date</Field.Label>
					<Field.Content>
						<input type="hidden" name="end_date" value={endDateStr} />
						<Popover.Root>
							<Popover.Trigger id="end_date" class="w-full">
								<Button variant="outline" class="w-full justify-start font-normal">
									<CalendarIcon class="mr-2 size-4 text-muted-foreground" />
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
								<Calendar type="single" bind:value={endDate} captionLayout="dropdown" />
							</Popover.Content>
						</Popover.Root>
						{#if endDate}
							<button
								type="button"
								class="mt-1 text-xs text-muted-foreground hover:text-foreground"
								onclick={() => (endDate = undefined)}>Clear</button
							>
						{/if}
					</Field.Content>
					<Field.Description>Leave blank for single-day events.</Field.Description>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="venue">Venue Name</Field.Label>
				<Field.Content>
					<Input
						id="venue"
						name="venue"
						type="text"
						value={form?.values?.venue ?? ''}
						placeholder={placeholders.venue}
						class="w-full"
					/>
				</Field.Content>
			</Field.Field>

			<Field.Field>
				<Field.Label for="address">Address</Field.Label>
				<Field.Content>
					<div class="relative" bind:this={addressWrapEl}>
						<Input
							id="address"
							name="address"
							type="text"
							bind:value={address}
							placeholder="e.g. 123 Main St"
							onfocus={() => (addressDropdownOpen = true)}
							oninput={() => scheduleAddressGeoFetch()}
							autocomplete="off"
							class="w-full"
						/>
						{#if addressDropdownOpen && addressLoading}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md"
							>
								Searching…
							</div>
						{:else if addressDropdownOpen && addressSuggestions.length > 0}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
								role="listbox"
								aria-label="Suggested addresses"
							>
								{#each addressSuggestions as f (String(f.properties?.osm_id ?? '') + (f.geometry?.coordinates?.join('-') ?? ''))}
									<button
										type="button"
										role="option"
										aria-selected={address === geoStreetAddress(f)}
										class="w-full cursor-pointer rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
										onclick={() => {
											address = geoStreetAddress(f);
											cityState = geoCityState(f);
											const coords = f.geometry?.coordinates;
											if (coords?.length >= 2) {
												lng = coords[0];
												lat = coords[1];
											}
											addressDropdownOpen = false;
										}}>{geoDisplayName(f)}</button
									>
								{/each}
							</div>
						{:else if addressDropdownOpen && address.trim().length >= 2 && !addressLoading && addressSuggestions.length === 0}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md"
							>
								No results. You can keep typing or use the text as-is.
							</div>
						{/if}
					</div>
				</Field.Content>
				<Field.Description
					>Optional. Start typing to search; selecting fills address and City, State for map view.</Field.Description
				>
			</Field.Field>

			<Field.Field>
				<Field.Label for="city_state"
					>City, State <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<input type="hidden" name="city_state" value={cityState} />
					<input type="hidden" name="lat" value={lat ?? ''} />
					<input type="hidden" name="lng" value={lng ?? ''} />
					<div class="relative" bind:this={locationWrapEl}>
						<Input
							id="city_state"
							type="text"
							required
							bind:value={cityState}
							placeholder={placeholders.locationCityState}
							onfocus={() => (locationDropdownOpen = true)}
							oninput={() => scheduleGeoFetch()}
							autocomplete="off"
							aria-describedby="city_state_help"
							class="w-full"
						/>
						{#if locationDropdownOpen && locationLoading}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md"
							>
								Searching…
							</div>
						{:else if locationDropdownOpen && locationSuggestions.length > 0}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
								role="listbox"
								aria-label="Suggested locations"
							>
								{#each locationSuggestions as f (String(f.properties?.osm_id ?? '') + (f.geometry?.coordinates?.join('-') ?? ''))}
									<button
										type="button"
										role="option"
										aria-selected={cityState === geoDisplayName(f)}
										class="w-full cursor-pointer rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
										onclick={() => {
											cityState = geoDisplayName(f);
											const coords = f.geometry?.coordinates;
											if (coords?.length >= 2) {
												lng = coords[0];
												lat = coords[1];
											}
											locationDropdownOpen = false;
										}}>{geoDisplayName(f)}</button
									>
								{/each}
							</div>
						{:else if locationDropdownOpen && cityState.trim().length >= 2 && !locationLoading && locationSuggestions.length === 0}
							<div
								class="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md"
							>
								No results. You can keep typing or use the text as-is.
							</div>
						{/if}
					</div>
				</Field.Content>
				<Field.Description
					>Start typing to search for a place; select one for map view.</Field.Description
				>
			</Field.Field>

			<Field.Field>
				<Field.Label for="event_url"
					>Event Link / Registration URL <span class="text-destructive">*</span></Field.Label
				>
				<Field.Content>
					<Input
						id="event_url"
						name="event_url"
						type="url"
						required
						value={form?.values?.event_url ?? ''}
						placeholder={placeholders.applyUrl}
						class="w-full"
					/>
				</Field.Content>
				<Field.Description>Where attendees can get details or register.</Field.Description>
			</Field.Field>
		</div>

		<!-- Event Image -->
		<div class="space-y-5 border-b border-[var(--border)] py-8">
			<h3 class="font-serif text-lg font-semibold text-foreground">
				Event Image <span class="text-sm font-normal text-muted-foreground">(Optional)</span>
			</h3>
			<KbFileDropzone name="image" label="Drop a flyer or image here or click to upload" />
			<p class="text-xs text-muted-foreground">
				Uploaded files may be stored and reviewed by staff as part of moderation and publishing.
			</p>
		</div>

		<!-- Contact Information -->
		<div class="-mx-4 mt-2 space-y-5 rounded-lg bg-muted/40 px-4 py-8 sm:-mx-6 sm:px-6">
			<h3 class="font-serif text-lg font-semibold text-foreground">Your Contact Information</h3>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="contact_name"
						>Your Name <span class="text-destructive">*</span></Field.Label
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
					<Field.Label for="email">Your Email <span class="text-destructive">*</span></Field.Label>
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
			<Button variant="ghost" href="/events">Cancel</Button>
		</div>
	</form>
</KbFormShell>
