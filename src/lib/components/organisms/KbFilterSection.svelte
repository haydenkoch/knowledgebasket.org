<script lang="ts">
	interface Option {
		value: string;
		label: string;
		count?: number;
	}

	interface Props {
		title: string;
		options: Option[];
		selected: string[];
		onToggle: (value: string) => void;
		emptyLabel?: string;
	}

	let { title, options, selected, onToggle, emptyLabel = 'All' }: Props = $props();
</script>

<div class="kb-filter-section">
	<h3 class="kb-filter-title">{title}</h3>
	{#if options.length === 0}
		<p class="kb-filter-empty">{emptyLabel}</p>
	{:else}
		<ul class="kb-filter-list">
			{#each options as opt}
				{@const isSelected = selected.includes(opt.value)}
				<li>
					<button
						type="button"
						onclick={() => onToggle(opt.value)}
						class="kb-filter-btn {isSelected ? 'kb-filter-btn--active' : ''}"
						aria-pressed={isSelected}
					>
						<span class="kb-filter-label">{opt.label}</span>
						{#if opt.count != null}
							<span class="kb-filter-count {isSelected ? 'kb-filter-count--active' : ''}"
								>{opt.count}</span
							>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.kb-filter-section {
		margin-bottom: 24px;
		padding-bottom: 20px;
		border-bottom: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 60%, transparent);
	}
	.kb-filter-section:last-of-type {
		border-bottom: none;
		margin-bottom: 8px;
		padding-bottom: 0;
	}
	.kb-filter-title {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin: 0 0 10px;
	}
	.kb-filter-empty {
		font-family: var(--font-sans);
		font-size: 13px;
		color: var(--muted-foreground);
		margin: 0;
		opacity: 0.6;
	}
	.kb-filter-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.kb-filter-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		text-align: left;
		padding: 7px 12px;
		border-radius: 6px;
		border: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 13px;
		cursor: pointer;
		color: var(--foreground);
		transition:
			background 0.12s ease,
			color 0.12s ease;
	}
	.kb-filter-btn:hover {
		background: var(--accent);
		color: var(--accent-foreground);
	}
	.kb-filter-btn:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}
	.kb-filter-btn--active {
		background: var(--accent);
		font-weight: 600;
		color: var(--accent-foreground);
	}
	.kb-filter-count {
		font-size: 11px;
		line-height: 1;
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: 9999px;
		padding: 2px 7px;
		min-width: 20px;
		text-align: center;
	}
	.kb-filter-count--active {
		background: var(--primary);
		color: var(--primary-foreground);
	}
</style>
