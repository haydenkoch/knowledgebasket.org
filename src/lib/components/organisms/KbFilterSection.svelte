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
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 65%, transparent);
	}
	.kb-filter-section:last-of-type {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}
	.kb-filter-title {
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin: 0 0 0.7rem;
	}
	.kb-filter-empty {
		font-family: var(--font-sans);
		font-size: 0.83rem;
		color: var(--muted-foreground);
		margin: 0;
		opacity: 0.78;
	}
	.kb-filter-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.kb-filter-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		text-align: left;
		padding: 0.62rem 0.8rem;
		border-radius: calc(var(--radius-md) + 1px);
		border: 1px solid transparent;
		background: color-mix(in srgb, var(--muted) 38%, transparent);
		font-family: var(--font-sans);
		font-size: 0.86rem;
		cursor: pointer;
		color: var(--foreground);
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			color 0.12s ease,
			transform 0.12s ease;
	}
	.kb-filter-btn:hover {
		background: color-mix(in srgb, var(--accent) 78%, white);
		border-color: color-mix(in srgb, var(--border) 90%, transparent);
		transform: translateX(2px);
	}
	.kb-filter-btn:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.kb-filter-btn--active {
		background: color-mix(in srgb, var(--primary) 13%, white);
		border-color: color-mix(in srgb, var(--primary) 22%, transparent);
		font-weight: 600;
		color: var(--foreground);
	}
	.kb-filter-count {
		font-size: 0.68rem;
		line-height: 1;
		color: color-mix(in srgb, var(--muted-foreground) 92%, var(--foreground));
		background: color-mix(in srgb, var(--muted) 88%, white);
		border-radius: 9999px;
		padding: 0.22rem 0.45rem;
		min-width: 1.45rem;
		text-align: center;
		font-weight: 700;
	}
	.kb-filter-count--active {
		background: var(--primary);
		color: var(--primary-foreground);
	}
</style>
