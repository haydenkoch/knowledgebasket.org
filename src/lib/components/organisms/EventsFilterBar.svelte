<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import XIcon from '@lucide/svelte/icons/x';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { cn } from '$lib/utils.js';

	type EventTypeGroup = { label: string; tags: readonly string[] };
	type EventTypeGroupReadonly = ReadonlyArray<EventTypeGroup>;

	type Props = {
		costFilter: string[];
		regionSelect: string[];
		typeSelect: string[];
		costOpen?: boolean;
		regionOpen?: boolean;
		typeOpen?: boolean;
		costValuesVisible: string[];
		regionValuesVisible: string[];
		typeTagsVisible: string[];
		costCountsInRange: Record<string, number>;
		regionCountsInRange: Record<string, number>;
		typeGroupCountsInRange: Record<string, number>;
		eventTypeGroups: EventTypeGroupReadonly;
		formatCostLabel: () => string;
		regionTriggerLabel: string;
		onCostChange: (value: string) => void;
		onRegionChange: (value: string) => void;
		onTypeChange: (value: string) => void;
		onTypeRemove: (label: string) => void;
		onClear: () => void;
	};

	let {
		costFilter,
		regionSelect,
		typeSelect,
		costOpen = $bindable(false),
		regionOpen = $bindable(false),
		typeOpen = $bindable(false),
		costValuesVisible,
		regionValuesVisible,
		typeTagsVisible,
		costCountsInRange,
		regionCountsInRange,
		typeGroupCountsInRange,
		eventTypeGroups,
		formatCostLabel,
		regionTriggerLabel,
		onCostChange,
		onRegionChange,
		onTypeChange,
		onTypeRemove,
		onClear
	}: Props = $props();
</script>

<div class="kb-fg kb-fg--filters">
	<div class="kb-flbl">Filter</div>
	<div class="kb-filter-bar" aria-label="Filter events">
		<div class="kb-filter-row">
			<Popover.Root bind:open={costOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							class="kb-refine-select w-full justify-between"
							role="combobox"
							aria-expanded={costOpen}
						>
							{formatCostLabel()}
							<ChevronDownIcon class="size-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="kb-filter-popover-content p-0" align="start">
					<Command.Root>
						<Command.Input placeholder="Search cost…" />
						<Command.List>
							<Command.Empty>No cost found.</Command.Empty>
							<Command.Group>
								{#each costValuesVisible as c (c)}
									<Command.Item
										value={c}
										onSelect={() => onCostChange(c)}
										class={cn('kb-filter-item', costFilter.includes(c) && 'kb-filter-item--checked')}
									>
										<CheckIcon class={cn('size-4', !costFilter.includes(c) && 'text-transparent')} />
										<span class="kb-filter-item__label">{c}</span>
										<Badge variant="secondary" class="kb-filter-item__badge">{costCountsInRange[c] ?? 0}</Badge>
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<Popover.Root bind:open={regionOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							class="kb-refine-select w-full justify-between"
							role="combobox"
							aria-expanded={regionOpen}
						>
							{regionTriggerLabel}
							<ChevronDownIcon class="size-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="kb-filter-popover-content p-0" align="start">
					<Command.Root>
						<Command.Input placeholder="Search geography…" />
						<Command.List>
							<Command.Empty>No geography found.</Command.Empty>
							<Command.Group>
								{#each regionValuesVisible as r (r)}
									<Command.Item
										value={r}
										onSelect={() => onRegionChange(r)}
										class={cn('kb-filter-item', regionSelect.includes(r) && 'kb-filter-item--checked')}
									>
										<CheckIcon class={cn('size-4', !regionSelect.includes(r) && 'text-transparent')} />
										<span class="kb-filter-item__label">{r}</span>
										<Badge variant="secondary" class="kb-filter-item__badge">{regionCountsInRange[r] ?? 0}</Badge>
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<div class="kb-refine-type-row">
				<div class="kb-flbl">Type</div>
				<Popover.Root bind:open={typeOpen}>
					<Popover.Trigger class="kb-form-type-trigger-wrap" aria-label="Filter by event type">
						<div class="kb-form-type-trigger" class:empty={typeSelect.length === 0}>
							{#if typeSelect.length > 0}
								<span class="kb-form-type-chips">
									{#each typeSelect as label (label)}
										<span class="kb-form-type-chip">
											{label}
											<button
												type="button"
												class="kb-form-type-chip-remove"
												aria-label="Remove {label}"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													onTypeRemove(label);
												}}
											>
												<XIcon class="size-3" />
											</button>
										</span>
									{/each}
								</span>
							{/if}
							<span class="kb-form-type-placeholder">{typeSelect.length ? 'Add another…' : 'Search to add types…'}</span>
						</div>
					</Popover.Trigger>
					<Popover.Content class="kb-filter-popover-content p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search types…" />
							<Command.List>
								<Command.Empty>No type found.</Command.Empty>
								<Command.Group>
									{#each typeTagsVisible as tag (tag)}
										{@const groupForTag = eventTypeGroups.find((g) => (g.tags as readonly string[]).includes(tag))}
										<Command.Item
											value={tag}
											onSelect={() => onTypeChange(tag)}
											class={cn('kb-filter-item', typeSelect.includes(tag) && 'kb-filter-item--checked')}
										>
											<CheckIcon class={cn('size-4', !typeSelect.includes(tag) && 'text-transparent')} />
											<span class="kb-filter-item__label">{tag}</span>
											<Badge variant="secondary" class="kb-filter-item__badge">{groupForTag ? (typeGroupCountsInRange[groupForTag.label] ?? 0) : 0}</Badge>
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>
		<button
			type="button"
			class="kb-filter-clear"
			onclick={onClear}
		>
			Clear filters &amp; search
		</button>
	</div>
</div>

<style>
	/* Popover content is portaled; filter-item/popover-content styles remain in kb.css */
	.kb-filter-bar {
		margin-top: 8px;
		padding: 0;
		border-radius: 0;
		background: transparent;
		border: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		max-width: var(--kb-filter-dropdown-width, 100%);
	}
	.kb-filter-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		min-width: 0;
	}
	.kb-filter-bar :global(button.kb-refine-select) {
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		gap: 0.5rem;
		width: 100% !important;
		min-width: 0;
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		color: var(--foreground) !important;
		background: var(--card) !important;
		border-color: var(--border) !important;
	}
	.kb-filter-bar :global(button.kb-refine-select > :first-child) {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
	}
	.kb-filter-bar :global(button.kb-refine-select > svg:last-child) {
		flex-shrink: 0;
		margin-left: auto;
		max-width: 24px;
	}
	.kb-refine-type-row {
		width: 100%;
		min-width: 0;
	}
	.kb-refine-type-row :global(.kb-form-type-trigger-wrap) {
		width: 100%;
	}
	.kb-filter-clear {
		align-self: flex-start;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border: none;
		background: none;
		color: var(--teal);
		cursor: pointer;
		min-height: 44px;
		min-width: 44px;
		padding: 12px 16px 12px 0;
		display: inline-flex;
		align-items: center;
	}
	.kb-form-type-trigger-wrap {
		width: 100%;
		display: block;
	}
	.kb-form-type-trigger {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		width: 100%;
		min-height: 38px;
		padding: 6px 10px;
		font-family: var(--font-sans);
		font-size: 14px;
		line-height: 22px;
		border-radius: 6px;
		border: 1px solid var(--rule);
		background: #ffffff;
		cursor: pointer;
		text-align: left;
	}
	.kb-form-type-trigger:hover {
		border-color: var(--rule);
	}
	.kb-form-type-trigger[data-state="open"],
	.kb-form-type-trigger:focus {
		outline: none;
		border-color: var(--teal);
		box-shadow: 0 0 0 1px var(--teal);
	}
	.kb-form-type-trigger.empty .kb-form-type-placeholder {
		color: var(--muted-foreground);
	}
	.kb-form-type-chips {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		min-height: 22px;
	}
	.kb-form-type-chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 0 5px;
		height: 22px;
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-lakebed-950) 15%, transparent);
		color: var(--dark);
		font-size: 12px;
		line-height: 22px;
		box-sizing: border-box;
	}
	.kb-form-type-chip-remove {
		display: inline-flex;
		padding: 0;
		border: none;
		background: none;
		color: var(--muted-foreground);
		cursor: pointer;
		border-radius: 2px;
	}
	.kb-form-type-chip-remove:hover {
		color: var(--teal);
	}
	.kb-form-type-placeholder {
		flex: 1;
		min-width: 80px;
		min-height: 22px;
		line-height: 22px;
		color: var(--muted-foreground);
	}
	@media (max-width: 960px) {
		.kb-filter-bar {
			margin-top: 10px;
			gap: 6px;
		}
		.kb-filter-row {
			flex-direction: column;
		}
	}
</style>
