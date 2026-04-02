<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		label: string;
		value: string | number;
		description?: string;
		href?: string;
		tone?: 'lake' | 'forest' | 'gold' | 'ember' | 'stone';
	}

	let { label, value, description, href, tone = 'lake' }: Props = $props();

	const tones: Record<NonNullable<Props['tone']>, string> = {
		lake: 'border-[color:color-mix(in_srgb,var(--color-lakebed-300)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_84%,white)]',
		forest:
			'border-[color:color-mix(in_srgb,var(--color-pinyon-300)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-pinyon-50)_86%,white)]',
		gold: 'border-[color:color-mix(in_srgb,var(--color-flicker-300)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-flicker-50)_88%,white)]',
		ember:
			'border-[color:color-mix(in_srgb,var(--color-ember-300)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-ember-50)_90%,white)]',
		stone:
			'border-[color:color-mix(in_srgb,var(--color-granite-300)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_88%,white)]'
	};

	const toneClasses = $derived(tones[tone]);
	const content = $derived(
		`${toneClasses} transition-[transform,box-shadow] duration-150 hover:-translate-y-[1px] hover:shadow-[var(--shh)]`
	);
</script>

{#if href}
	<a {href} class="block no-underline hover:no-underline">
		<Card.Root class={content}>
			<Card.Content class="space-y-2 px-5 py-4">
				<p class="text-[12px] font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">
					{label}
				</p>
				<p class="font-display text-[2rem] leading-none text-[var(--dark)]">{value}</p>
				{#if description}
					<p class="text-[13px] leading-5 text-[var(--mid)]">{description}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</a>
{:else}
	<Card.Root class={content}>
		<Card.Content class="space-y-2 px-5 py-4">
			<p class="text-[12px] font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">{label}</p>
			<p class="font-display text-[2rem] leading-none text-[var(--dark)]">{value}</p>
			{#if description}
				<p class="text-[13px] leading-5 text-[var(--mid)]">{description}</p>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
