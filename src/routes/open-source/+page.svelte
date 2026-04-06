<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Open Source Thanks | Knowledge Basket</title>
	<meta
		name="description"
		content="A living thank-you page for the open source libraries and tools that help power Knowledge Basket."
	/>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
	<div class="max-w-3xl space-y-4">
		<p class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
			Open Source
		</p>
		<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
			A thank you to the libraries helping us build this site.
		</h1>
		<p class="text-lg leading-8 text-muted-foreground">
			Knowledge Basket is built with open source software from people who share code, maintain
			tools, review issues, write docs, and keep hard infrastructure moving. This page exists to say
			thank you.
		</p>
		<p class="text-base leading-7 text-muted-foreground">
			It is generated from the project&apos;s current dependency manifest and installed packages, so
			it stays aligned with what the app is actually using right now.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header class="space-y-2">
				<Card.Description class="text-xs font-semibold tracking-[0.16em] uppercase">
					Direct packages
				</Card.Description>
				<Card.Title class="text-3xl">{data.openSource.totalDirectPackages}</Card.Title>
				<Card.Description class="text-sm leading-6">
					Current direct dependencies declared by the project.
				</Card.Description>
			</Card.Header>
		</Card.Root>

		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header class="space-y-2">
				<Card.Description class="text-xs font-semibold tracking-[0.16em] uppercase">
					Runtime libraries
				</Card.Description>
				<Card.Title class="text-3xl">{data.openSource.runtimeCount}</Card.Title>
				<Card.Description class="text-sm leading-6">
					Packages that help run the product experience.
				</Card.Description>
			</Card.Header>
		</Card.Root>

		<Card.Root class="border-border/70 bg-card/90">
			<Card.Header class="space-y-2">
				<Card.Description class="text-xs font-semibold tracking-[0.16em] uppercase">
					Build tools
				</Card.Description>
				<Card.Title class="text-3xl">{data.openSource.developmentCount}</Card.Title>
				<Card.Description class="text-sm leading-6">
					Packages that support development, checks, and delivery.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	</div>

	<Card.Root class="border-border/70 bg-muted/30">
		<Card.Header class="space-y-3">
			<Card.Title>How this page works</Card.Title>
			<Card.Description class="max-w-3xl text-sm leading-6">
				We list the project&apos;s direct runtime dependencies and developer tooling here. Every
				package also depends on wider open source ecosystems, and we&apos;re grateful to those
				maintainers too, even when they are not named individually on this page.
			</Card.Description>
		</Card.Header>
	</Card.Root>

	{#each data.openSource.groups as group}
		<section class="space-y-5">
			<div class="max-w-3xl space-y-2">
				<h2 class="text-2xl font-semibold tracking-tight">{group.title}</h2>
				<p class="text-sm leading-6 text-muted-foreground">{group.description}</p>
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				{#each group.packages as pkg}
					<Card.Root class="flex h-full flex-col border-border/70 bg-card/90">
						<Card.Header class="space-y-3">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 space-y-2">
									<Card.Title class="text-xl break-all">{pkg.name}</Card.Title>
									<Card.Description class="text-sm leading-6">
										{pkg.description ??
											'No package description was available from the installed manifest, but it is still part of the current stack.'}
									</Card.Description>
								</div>
								<div
									class="rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-semibold"
								>
									{pkg.installedVersion ? `v${pkg.installedVersion}` : pkg.versionRange}
								</div>
							</div>
						</Card.Header>

						<Card.Content class="mt-auto space-y-4">
							<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
								<span class="rounded-full border border-border/70 bg-background px-3 py-1">
									Declared {pkg.versionRange}
								</span>
								{#if pkg.license}
									<span class="rounded-full border border-border/70 bg-background px-3 py-1">
										License {pkg.license}
									</span>
								{/if}
							</div>

							<div class="flex flex-wrap gap-3 text-sm font-medium">
								{#if pkg.homepage}
									<a
										href={pkg.homepage}
										target="_blank"
										rel="noreferrer"
										class="text-primary underline-offset-4 hover:underline"
									>
										Project site
									</a>
								{/if}
								{#if pkg.repositoryUrl && pkg.repositoryUrl !== pkg.homepage}
									<a
										href={pkg.repositoryUrl}
										target="_blank"
										rel="noreferrer"
										class="text-primary underline-offset-4 hover:underline"
									>
										Source
									</a>
								{/if}
								<a
									href={pkg.npmUrl}
									target="_blank"
									rel="noreferrer"
									class="text-primary underline-offset-4 hover:underline"
								>
									npm
								</a>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</section>
	{/each}
</section>
