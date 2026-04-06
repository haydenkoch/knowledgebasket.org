<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Check, ChevronDown, X } from '@lucide/svelte';

	type Option = {
		value: string;
		label: string;
	};

	interface Props {
		name: string;
		label: string;
		options: Option[];
		selected?: string[];
		placeholder?: string;
		description?: string;
		emptyLabel?: string;
	}

	let {
		name,
		label,
		options,
		selected = [],
		placeholder = 'Select options',
		description = '',
		emptyLabel = 'No options found.'
	}: Props = $props();

	const initialSelectedValues = () => [...selected];
	let open = $state(false);
	let selectedValues = $state(initialSelectedValues());

	$effect(() => {
		selectedValues = [...selected];
	});

	const selectedOptions = $derived(
		selectedValues
			.map((value) => options.find((option) => option.value === value))
			.filter((option): option is Option => Boolean(option))
	);

	function toggleValue(value: string) {
		selectedValues = selectedValues.includes(value)
			? selectedValues.filter((entry) => entry !== value)
			: [...selectedValues, value];
	}

	function removeValue(value: string) {
		selectedValues = selectedValues.filter((entry) => entry !== value);
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between gap-3">
		<Label>{label}</Label>
		<input type="hidden" {name} value={selectedValues.join('\n')} />
		<Popover.Root bind:open>
			<Popover.Trigger
				class="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
			>
				<span class="truncate">
					{selectedOptions.length > 0 ? `${selectedOptions.length} selected` : placeholder}
				</span>
				<ChevronDown class="h-4 w-4 opacity-60" />
			</Popover.Trigger>
			<Popover.Content class="w-[320px] p-0" align="end" sideOffset={6}>
				<Command.Root>
					<Command.Input placeholder={`Search ${label.toLowerCase()}…`} />
					<Command.List>
						<Command.Empty>{emptyLabel}</Command.Empty>
						{#each options as option}
							{@const selectedOption = selectedValues.includes(option.value)}
							<Command.Item
								value={`${option.label} ${option.value}`}
								onSelect={() => toggleValue(option.value)}
								class={`flex items-center gap-2 ${selectedOption ? 'bg-[var(--color-alpine-snow-100)]/70' : ''}`}
							>
								<Check class={`h-4 w-4 ${selectedOption ? 'opacity-100' : 'opacity-0'}`} />
								<span>{option.label}</span>
							</Command.Item>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	{#if description}
		<p class="text-xs text-[var(--mid)]">{description}</p>
	{/if}

	{#if selectedOptions.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each selectedOptions as option}
				<Badge variant="secondary" class="gap-1.5 rounded-full px-3 py-1">
					{option.label}
					<button
						type="button"
						class="inline-flex h-4 w-4 items-center justify-center rounded-full"
						onclick={() => removeValue(option.value)}
						aria-label={`Remove ${option.label}`}
					>
						<X class="h-3 w-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}
</div>
