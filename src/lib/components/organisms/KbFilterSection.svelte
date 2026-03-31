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
						<span class="kb-filter-count">{opt.count}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
.kb-filter-section {
	margin-bottom: 20px;
}
.kb-filter-title {
	font-family: var(--font-sans);
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--muted-foreground);
	margin: 0 0 8px;
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
	padding: 5px 8px;
	border-radius: 5px;
	border: none;
	background: transparent;
	font-size: 13px;
	cursor: pointer;
	color: var(--foreground);
	transition: background 0.1s ease;
}
.kb-filter-btn:hover {
	background: var(--accent);
}
.kb-filter-btn--active {
	background: var(--accent);
	font-weight: 600;
}
.kb-filter-count {
	font-size: 11px;
	color: var(--muted-foreground);
	background: var(--muted);
	border-radius: 9999px;
	padding: 0 6px;
}
</style>
