<script lang="ts">
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import Slider from '$lib/components/ui/slider/slider.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { CalendarDate } from '@internationalized/date';
	import {
		tsToDateStr,
		dateStrToTs,
		endOfDayTs,
		tsToCalendarDate,
		calendarDateToStartTs,
		calendarDateToEndTs
	} from '$lib/utils/date.js';

	type DateBucket = { start: number; end: number; count: number; label: string };
	type DateBuckets = { buckets: DateBucket[]; maxCount: number };

	type Props = {
		dateBuckets: DateBuckets;
		numBuckets: number;
		sliderMinIx: number;
		sliderMaxIx: number;
		rangeStart: number;
		rangeEnd: number;
		startDateOpen?: boolean;
		endDateOpen?: boolean;
		startDateDisplay?: CalendarDate | undefined;
		endDateDisplay?: CalendarDate | undefined;
		onSliderChange: (vals: number[]) => void;
		onSliderCommit: (vals: number[]) => void;
		onRangeStartChange: (ts: number) => void;
		onRangeEndChange: (ts: number) => void;
		onStartDateOpenChange: (open: boolean) => void;
		onEndDateOpenChange: (open: boolean) => void;
	};

	let {
		dateBuckets,
		numBuckets,
		sliderMinIx,
		sliderMaxIx,
		rangeStart,
		rangeEnd,
		startDateOpen = $bindable(false),
		endDateOpen = $bindable(false),
		startDateDisplay = $bindable(undefined as CalendarDate | undefined),
		endDateDisplay = $bindable(undefined as CalendarDate | undefined),
		onSliderChange,
		onSliderCommit,
		onRangeStartChange,
		onRangeEndChange,
		onStartDateOpenChange,
		onEndDateOpenChange
	}: Props = $props();

	/** Throttle bar highlight updates to one per frame so drag stays smooth. */
	let displayMinIx = $state(0);
	let displayMaxIx = $state(0);
	let initialSync = false;
	$effect(() => {
		const min = sliderMinIx;
		const max = sliderMaxIx;
		if (!initialSync) {
			initialSync = true;
			displayMinIx = min;
			displayMaxIx = max;
		}
		const id = requestAnimationFrame(() => {
			displayMinIx = min;
			displayMaxIx = max;
		});
		return () => cancelAnimationFrame(id);
	});
</script>

<div class="kb-refine-block kb-refine-date-graph" role="group" aria-label="Filter by date">
	{#if dateBuckets.buckets.length > 0}
		<div class="kb-date-graph">
			<p class="kb-date-graph__label">Date range</p>
			<div class="kb-date-graph__chart" role="img" aria-label="Event count by month">
				{#each dateBuckets.buckets as bucket, i}
					{@const pct = dateBuckets.maxCount > 0 ? (bucket.count / dateBuckets.maxCount) * 100 : 0}
					<span
						class="kb-date-graph__bar"
						class:kb-date-graph__bar--in-range={i >= displayMinIx && i <= Math.min(displayMaxIx, numBuckets - 1)}
						style="height: {pct}%"
						data-min={bucket.start}
						data-max={bucket.end}
						data-count={bucket.count}
						aria-label="Month {bucket.label}. Events: {bucket.count}."
					></span>
				{/each}
			</div>
			<div class="kb-date-graph__controls">
				<Slider
					min={0}
					max={Math.max(0, numBuckets - 1)}
					step={1}
					value={[sliderMinIx, sliderMaxIx]}
					onValueChange={onSliderChange}
					onValueCommit={onSliderCommit}
					type="multiple"
					class="kb-date-slider"
					aria-label="Date range"
				/>
				<div class="kb-date-graph__labels">
					<div class="kb-date-input-wrap">
						<span class="kb-date-input-label">From</span>
						<Popover.Root bind:open={startDateOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<input
										{...props}
										type="date"
										class="kb-date-input kb-date-input--calendar-trigger"
										aria-label="Start date"
										value={tsToDateStr(rangeStart)}
										oninput={(e) => {
											const v = (e.currentTarget as HTMLInputElement).value;
											const ts = dateStrToTs(v);
											if (ts) {
												onRangeStartChange(ts);
												if (rangeStart > rangeEnd) onRangeEndChange(ts);
											}
										}}
										onclick={(e) => {
											e.preventDefault();
											onStartDateOpenChange(true);
										}}
										min={tsToDateStr(dateBuckets.buckets[0]?.start ?? rangeStart)}
										max={tsToDateStr(rangeEnd)}
									/>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto overflow-hidden p-0" align="start">
								<Calendar
									type="single"
									bind:value={startDateDisplay}
									onValueChange={(v) => {
										if (v != null) {
											const ts = calendarDateToStartTs(v);
											onRangeStartChange(ts);
											if (rangeStart > rangeEnd) onRangeEndChange(ts);
											onStartDateOpenChange(false);
										}
									}}
									captionLayout="dropdown"
									minValue={tsToCalendarDate(dateBuckets.buckets[0]?.start ?? rangeStart)}
									maxValue={tsToCalendarDate(rangeEnd)}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
					<div class="kb-date-input-wrap">
						<span class="kb-date-input-label">To</span>
						<Popover.Root bind:open={endDateOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<input
										{...props}
										type="date"
										class="kb-date-input kb-date-input--calendar-trigger"
										aria-label="End date"
										value={tsToDateStr(rangeEnd)}
										oninput={(e) => {
											const v = (e.currentTarget as HTMLInputElement).value;
											const ts = endOfDayTs(v);
											if (ts) {
												onRangeEndChange(ts);
												if (rangeEnd < rangeStart) onRangeStartChange(dateStrToTs(v));
											}
										}}
										onclick={(e) => {
											e.preventDefault();
											onEndDateOpenChange(true);
										}}
										min={tsToDateStr(rangeStart)}
										max={tsToDateStr(dateBuckets.buckets[dateBuckets.buckets.length - 1]?.end ?? rangeEnd)}
									/>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto overflow-hidden p-0" align="start">
								<Calendar
									type="single"
									bind:value={endDateDisplay}
									onValueChange={(v) => {
										if (v != null) {
											const ts = calendarDateToEndTs(v);
											onRangeEndChange(ts);
											if (rangeEnd < rangeStart) onRangeStartChange(calendarDateToStartTs(v));
											onEndDateOpenChange(false);
										}
									}}
									captionLayout="dropdown"
									minValue={tsToCalendarDate(rangeStart)}
									maxValue={tsToCalendarDate(dateBuckets.buckets[dateBuckets.buckets.length - 1]?.end ?? rangeEnd)}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<p class="kb-date-graph__hint">No events in range.</p>
	{/if}
</div>

<style>
	.kb-refine-block {
		margin-bottom: 18px;
	}
	.kb-date-graph__label {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin: 0 0 8px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--rule);
		margin-top: 4px;
		margin-bottom: 22px;
	}
	.kb-date-graph__chart {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 56px;
		margin-bottom: 12px;
	}
	.kb-date-graph__bar {
		flex: 1;
		min-width: 4px;
		border-radius: 999px;
		background-color: var(--color-granite-500);
		opacity: 0.85;
	}
	.kb-date-graph__bar--in-range {
		background-color: var(--primary);
		opacity: 1;
	}
	.kb-date-slider {
		margin-top: 4px;
	}
	.kb-date-graph__labels {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--muted-foreground);
		margin-top: 4px;
		gap: 8px;
	}
	.kb-date-input-wrap {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.kb-date-input-label {
		font-family: var(--font-sans);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}
	.kb-date-input {
		font-family: var(--font-sans);
		font-size: 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		padding: 4px 6px;
		background: var(--card);
		color: var(--foreground);
	}
	.kb-date-input--calendar-trigger {
		width: 100%;
		min-width: 0;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
	}
	.kb-date-input--calendar-trigger::-webkit-calendar-picker-indicator,
	.kb-date-input--calendar-trigger::-webkit-inner-spin-button {
		opacity: 0;
		pointer-events: none;
		position: absolute;
		right: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		cursor: pointer;
	}
	.kb-date-input--calendar-trigger::-webkit-calendar-picker-indicator {
		left: 0;
	}
	.kb-date-graph__hint {
		font-size: 12px;
		color: var(--muted-foreground);
		margin: 0;
	}
	@media (max-width: 640px) {
		.kb-date-graph__labels {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
