<script lang="ts">
	type Option = {
		value: string;
		label: string;
		count?: number;
	};

	type Props = {
		title: string;
		options: Option[];
		selected: string[];
		onToggle?: (value: string) => void;
		emptyLabel?: string;
	};

	let { title, options, selected, onToggle, emptyLabel }: Props = $props();

	const fallbackEmpty = $derived(
		emptyLabel ?? `No ${title.toLowerCase()}`
	);
</script>

<div class="kb-fg">
	<div class="kb-flbl">{title}</div>
	{#if options.length > 0}
		{#each options as opt (opt.value)}
			<label class="kb-fopt">
				<input
					type="checkbox"
					checked={selected.includes(opt.value)}
					onchange={() => onToggle?.(opt.value)}
				/>
				<span>{opt.label}</span>
				{#if opt.count != null}
					<span class="kb-fc">{opt.count}</span>
				{/if}
			</label>
		{/each}
	{:else}
		<span class="kb-fopt" style="color: var(--muted)">{fallbackEmpty}</span>
	{/if}
</div>
