<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Heart from '@lucide/svelte/icons/heart';
	import Bell from '@lucide/svelte/icons/bell';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Upload from '@lucide/svelte/icons/upload';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Settings from '@lucide/svelte/icons/settings';

	let { data, form } = $props();

	const userImage = $derived((data.user as { image?: string | null } | undefined)?.image ?? null);
	const name = $derived(data.user?.name ?? '');
	const initial = $derived((name || data.user?.email || 'A').charAt(0).toUpperCase());

	let fileInput: HTMLInputElement | null = $state(null);
	let previewUrl = $state<string | null>(null);
	let submitting = $state(false);

	function onFileChange() {
		const file = fileInput?.files?.[0];
		if (!file) {
			previewUrl = null;
			return;
		}
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = URL.createObjectURL(file);
	}

	const displayedImage = $derived(previewUrl ?? userImage);

	const stats = $derived([
		{
			label: 'Organizations',
			value: data.organizations.length,
			href: '/account/organizations',
			icon: Building2
		},
		{
			label: 'Saved items',
			value: data.counts.bookmarks,
			href: '/account/saved',
			icon: Bookmark
		},
		{
			label: 'Following',
			value: data.counts.follows,
			href: '/account/following',
			icon: Heart
		},
		{
			label: 'Unread alerts',
			value: data.unreadCount,
			href: '/account/notifications',
			icon: Bell
		}
	] as const);

	const quickLinks = [
		{
			href: '/account/settings',
			label: 'Account settings',
			desc: 'Change email, password, sessions',
			icon: Settings
		},
		{
			href: '/account/saved',
			label: 'Saved items',
			desc: 'Your bookmarks across the basket',
			icon: Bookmark
		},
		{
			href: '/account/following',
			label: 'Followed orgs',
			desc: 'Manage who you hear from',
			icon: Heart
		},
		{
			href: '/account/notifications',
			label: 'Notifications',
			desc: 'Email and in-app preferences',
			icon: Bell
		},
		{
			href: '/account/calendar',
			label: 'Calendar feed',
			desc: 'Subscribe from your calendar app',
			icon: CalendarDays
		},
		{
			href: '/account/privacy',
			label: 'Privacy & data',
			desc: 'Export, correct, or delete',
			icon: ShieldCheck
		}
	];
</script>

<Card.Root class="border-border/70 bg-card/90">
	<Card.Header>
		<Card.Title>Profile</Card.Title>
		<Card.Description>
			Update your display name and avatar. JPG, PNG, or WebP up to 5 MB.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			method="POST"
			action="?/updateProfile"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
					if (previewUrl) URL.revokeObjectURL(previewUrl);
					previewUrl = null;
					if (fileInput) fileInput.value = '';
				};
			}}
			class="flex flex-col gap-6 sm:flex-row sm:items-start"
		>
			<div class="flex flex-col items-center gap-3">
				<Avatar.Root class="size-24 border border-border/70">
					{#if displayedImage}
						<Avatar.Image src={displayedImage} alt={name} class="object-cover" />
					{/if}
					<Avatar.Fallback class="bg-muted text-3xl font-semibold">
						{initial}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="flex gap-2">
					<Button type="button" variant="outline" size="sm" onclick={() => fileInput?.click()}>
						<Upload class="size-4" />
						Upload
					</Button>
					{#if userImage || previewUrl}
						<Button
							type="submit"
							variant="ghost"
							size="sm"
							name="removeAvatar"
							value="on"
							formnovalidate
							class="text-muted-foreground hover:text-destructive"
						>
							<Trash2 class="size-4" />
							Remove
						</Button>
					{/if}
				</div>
				<input
					bind:this={fileInput}
					id="profile-avatar"
					type="file"
					name="avatar"
					accept="image/jpeg,image/png,image/webp"
					aria-label="Upload profile image"
					onchange={onFileChange}
					class="sr-only"
				/>
			</div>

			<div class="flex-1 space-y-4">
				<Field.Field>
					<Field.Label for="profile-name">Display name</Field.Label>
					<Field.Content>
						<Input id="profile-name" name="name" value={name} maxlength={120} required />
					</Field.Content>
					<Field.Description>
						Shown on your profile and anywhere you submit content.
					</Field.Description>
				</Field.Field>
				{#if form?.profileError}
					<p class="text-sm text-destructive">{form.profileError}</p>
				{:else if form?.profileSuccess}
					<p class="text-sm text-emerald-700 dark:text-emerald-400">{form.profileSuccess}</p>
				{/if}
				<div class="flex items-center gap-2">
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Saving…' : 'Save changes'}
					</Button>
				</div>
			</div>
		</form>
	</Card.Content>
</Card.Root>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
	{#each stats as stat}
		<a
			href={stat.href}
			class="group rounded-xl border border-border/70 bg-card/90 p-5 transition-colors hover:border-border hover:bg-card"
		>
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
					{stat.label}
				</span>
				<stat.icon class="size-4 text-muted-foreground group-hover:text-foreground" />
			</div>
			<div class="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</div>
		</a>
	{/each}
</div>

<div class="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header class="flex flex-row items-start justify-between gap-3 space-y-0">
			<div class="space-y-1.5">
				<Card.Title>Your organizations</Card.Title>
				<Card.Description>Approved memberships you can manage.</Card.Description>
			</div>
			<Button href="/account/organizations" variant="ghost" size="sm">View all</Button>
		</Card.Header>
		<Card.Content>
			{#if data.organizations.length === 0}
				<p
					class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground"
				>
					You don't manage any organizations yet. Claim one from its public organization page.
				</p>
			{:else}
				<ul class="divide-y divide-border/60">
					{#each data.organizations.slice(0, 5) as membership}
						<li class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
							<div class="min-w-0">
								<p class="truncate font-medium">{membership.organization.name}</p>
								<p class="text-xs text-muted-foreground">
									<Badge variant="secondary" class="text-[10px] tracking-wider uppercase">
										{membership.role}
									</Badge>
								</p>
							</div>
							<Button href={`/orgs/${membership.organization.slug}`} size="sm" variant="outline">
								Open
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<Card.Title>Claim activity</Card.Title>
			<Card.Description>Recent organization claim requests.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.claims.length === 0}
				<p
					class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground"
				>
					No organization claims yet.
				</p>
			{:else}
				<ul class="divide-y divide-border/60">
					{#each data.claims.slice(0, 5) as claim}
						<li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{claim.organization.name}</p>
								{#if claim.emailDomain}
									<p class="text-xs text-muted-foreground">domain · {claim.emailDomain}</p>
								{/if}
							</div>
							<Badge variant="secondary" class="text-[10px] tracking-wider uppercase">
								{claim.status}
							</Badge>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<Card.Root class="border-border/70 bg-card/90">
	<Card.Header>
		<Card.Title>Jump back in</Card.Title>
		<Card.Description>Quick access to the sections you use most.</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each quickLinks as link}
				<a
					href={link.href}
					class="group flex items-start gap-3 rounded-lg border border-border/70 bg-background p-4 transition-colors hover:border-border hover:bg-muted/40"
				>
					<div
						class="rounded-md border border-border/70 bg-muted p-2 text-muted-foreground group-hover:text-foreground"
					>
						<link.icon class="size-4" />
					</div>
					<div class="min-w-0">
						<p class="font-medium">{link.label}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{link.desc}</p>
					</div>
				</a>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
