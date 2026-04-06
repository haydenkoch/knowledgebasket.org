<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { legalConfig } from '$lib/legal/config';

	const coils = [
		{
			title: 'Events',
			description:
				'Community gatherings, workshops, conferences, and cultural moments worth showing up for.',
			href: '/events'
		},
		{
			title: 'Funding',
			description:
				'Curated grant and opportunity listings with room to grow into a fuller operations flow.',
			href: '/funding'
		},
		{
			title: 'Red Pages',
			description:
				'Organizations, businesses, and community resources that deserve a clearer, friendlier directory.',
			href: '/red-pages'
		},
		{
			title: 'Jobs',
			description:
				'Work opportunities organized to help people find the right fit without wading through noise.',
			href: '/jobs'
		},
		{
			title: 'Toolbox',
			description:
				'Practical resources, guides, and materials gathered into a more usable knowledge base.',
			href: '/toolbox'
		}
	];
</script>

<svelte:head>
	<title>About Knowledge Basket</title>
	<meta
		name="description"
		content="Knowledge Basket brings events, opportunities, jobs, directory listings, and practical resources into one warmer, easier-to-use community product."
	/>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
	<div class="max-w-3xl space-y-4">
		<p class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">About</p>
		<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
			A warmer way to explore community knowledge.
		</h1>
		<p class="text-lg leading-8 text-muted-foreground">
			Knowledge Basket is a living product for finding what is happening, what is available, and who
			is doing meaningful work across the community. It is growing coil by coil, with Events
			currently the most complete experience and the other surfaces continuing forward as curated
			beta areas.
		</p>
		<p class="text-base leading-7 text-muted-foreground">
			The product is operated by {legalConfig.operatorName}. Knowledge Basket combines curated data,
			moderated community submissions, and staff review workflows so listings can be useful without
			feeling anonymous or opaque.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each coils as coil}
			<Card.Root class="flex h-full flex-col border-border/70 bg-card/90">
				<Card.Header class="space-y-3">
					<Card.Title class="text-xl">{coil.title}</Card.Title>
					<Card.Description class="text-sm leading-6">{coil.description}</Card.Description>
				</Card.Header>
				<Card.Content class="mt-auto">
					<Button href={coil.href} variant="secondary" class="w-full justify-between">
						Explore {coil.title}
					</Button>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<Card.Root class="border-border/70 bg-muted/30">
		<Card.Header class="space-y-3">
			<Card.Title>How we are moving forward</Card.Title>
			<Card.Description class="max-w-3xl text-sm leading-6">
				The current direction is incremental improvement: preserve the strong filter bar and
				shadcn-svelte foundation, clean up broken or inconsistent flows, and keep improving the
				product until every coil feels polished, trustworthy, and easy to use.
			</Card.Description>
		</Card.Header>
	</Card.Root>

	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header class="space-y-3">
				<Card.Title>How submissions work</Card.Title>
				<Card.Description class="text-sm leading-6">
					Community members can submit events, funding, jobs, businesses, and resources. Those
					submissions enter a moderation flow before they appear publicly, and staff may edit for
					clarity, formatting, or policy compliance.
				</Card.Description>
			</Card.Header>
		</Card.Root>

		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header class="space-y-3">
				<Card.Title>Built with open source</Card.Title>
				<Card.Description class="text-sm leading-6">
					Knowledge Basket depends on a growing set of open source libraries and developer tools. We
					keep a public thank-you page that updates with the project.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button href="/open-source" variant="secondary">View open source thanks</Button>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header class="space-y-3">
				<Card.Title>Legal and privacy</Card.Title>
				<Card.Description class="text-sm leading-6">
					About explains who we are and how the product works. It is not the legal record. For
					privacy rights, cookie choices, and site terms, use the dedicated legal pages.
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-3">
				<Button href="/privacy" variant="secondary">Privacy</Button>
				<Button href="/terms" variant="secondary">Terms</Button>
				<Button href="/cookies" variant="secondary">Cookies</Button>
			</Card.Content>
		</Card.Root>
	</div>
</section>
