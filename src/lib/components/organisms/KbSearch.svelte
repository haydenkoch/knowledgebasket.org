<script lang="ts">
	import { goto } from '$app/navigation';

	let { variant = 'default' }: { variant?: 'default' | 'light' } = $props();

	let query = $state('');
	let results = $state<{ coil: string; title: string; slug: string; href: string }[]>([]);
	let open = $state(false);
	let loading = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	const coilPaths: Record<string, string> = {
		events: '/events',
		funding: '/funding',
		redpages: '/red-pages',
		jobs: '/jobs',
		toolbox: '/toolbox'
	};

	async function search(q: string) {
		if (q.trim().length < 2) {
			results = [];
			open = false;
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
			const data = (await res.json()) as {
				results?: Record<string, { title: string; slug?: string; id?: string }[]>;
			};
			const flat: typeof results = [];
			for (const [coil, items] of Object.entries(data.results ?? {})) {
				for (const item of items.slice(0, 3)) {
					const slug = item.slug ?? item.id ?? '';
					if (!slug) continue;
					flat.push({
						coil,
						title: item.title,
						slug,
						href: `${coilPaths[coil] ?? `/${coil}`}/${slug}`
					});
				}
			}
			results = flat;
			open = flat.length > 0;
		} catch {
			/* ignore */
		}
		loading = false;
	}

	function onInput(e: Event) {
		query = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(timer);
		timer = setTimeout(() => search(query), 280);
	}

	function onSubmit(e: Event) {
		e.preventDefault();
		if (query.trim()) goto(`/events?q=${encodeURIComponent(query)}`);
	}
</script>

<div class="relative">
	<form onsubmit={onSubmit} role="search">
		<label for="kb-global-search" class="sr-only">Search Knowledge Basket</label>
		<div class="relative">
			<svg
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
			</svg>
			<input
				id="kb-global-search"
				type="search"
				placeholder="Search events, funding, businesses, jobs…"
				value={query}
				oninput={onInput}
				onfocus={() => {
					if (results.length) open = true;
				}}
				onblur={() => setTimeout(() => (open = false), 150)}
				class="w-full rounded-lg border border-input bg-background py-2 pr-4 pl-10 text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-none {variant ===
				'light'
					? 'bg-white/90'
					: ''}"
				autocomplete="off"
			/>
		</div>
	</form>

	{#if open && results.length}
		<ul
			id="kb-global-search-results"
			class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
		>
			{#each results as r}
				<li>
					<a
						href={r.href}
						class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
					>
						<span
							class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase"
							>{r.coil}</span
						>
						<span class="truncate">{r.title}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
