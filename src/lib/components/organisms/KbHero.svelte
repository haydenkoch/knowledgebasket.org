<script lang="ts">
	type Props = {
		eyebrow?: string;
		title: string;
		description?: string;
		heroClass?: string;
	};

	let { eyebrow, title, description, heroClass = '' }: Props = $props();
</script>

<section class={`kb-hero ${heroClass}`}>
	<div class="kb-hero-bg"></div>
	<svg class="kb-hero-weave" viewBox="0 0 200 400" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
		<slot name="weave" />
	</svg>
	<svg class="kb-hero-mtn" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
		<path
			d="M0,80 L80,30 L160,70 L260,10 L380,60 L480,20 L580,55 L680,5 L800,50 L920,15 L1040,45 L1140,20 L1200,40 L1200,120 L0,120Z"
			fill="white"
		/>
	</svg>
	<div class="kb-hero-c">
		{#if eyebrow}
			<div class="kb-eyebrow">{eyebrow}</div>
		{/if}
		<h1>{title}</h1>
		{#if description}
			<p>{description}</p>
		{/if}
		<div class="kb-hero-stats">
			<slot name="stats" />
		</div>
	</div>
</section>
