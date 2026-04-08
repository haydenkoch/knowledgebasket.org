<script lang="ts">
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import AdminSectionCard from '$lib/components/organisms/admin/AdminSectionCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		ShieldAlert,
		ShieldCheck,
		Search,
		KeyRound,
		Ban,
		RefreshCcw,
		Users
	} from '@lucide/svelte';

	let { data, form } = $props();

	function formatDate(value: string | Date | null | undefined) {
		if (!value) return '—';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	function roleBadgeVariant(role: string | null | undefined): BadgeVariant {
		if (role === 'admin') return 'default';
		if (role === 'moderator') return 'secondary';
		return 'outline';
	}
</script>

<svelte:head>
	<title>Users | KB Admin</title>
</svelte:head>

<AdminPageHeader
	eyebrow="Administration"
	title="User management"
	description="Manage site-wide permissions, send password reset links, revoke sessions, and disable or restore accounts."
>
	{#snippet meta()}
		<span>{data.total} total users</span>
		<span>{data.adminCount} admins in current scope</span>
		<span>{data.bannedCount} disabled accounts in current scope</span>
	{/snippet}
</AdminPageHeader>

<div class="space-y-6 pb-8">
	{#if form?.error}
		<Alert.Root variant="destructive">
			<Alert.Title>Action failed</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{:else if form?.success}
		<Alert.Root>
			<Alert.Title>Update complete</Alert.Title>
			<Alert.Description>{form.success}</Alert.Description>
		</Alert.Root>
	{/if}

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-2xl border border-[color:var(--rule)] bg-white/92 p-4 shadow-[var(--sh)]">
			<div class="flex items-center gap-3">
				<div class="rounded-2xl bg-[color:var(--color-alpine-snow-100)] p-3 text-[var(--dark)]">
					<Users class="h-5 w-5" />
				</div>
				<div>
					<p class="text-xs font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">
						Directory
					</p>
					<p class="text-2xl font-semibold text-[var(--dark)]">{data.total}</p>
				</div>
			</div>
			<p class="mt-3 text-sm text-[var(--mid)]">
				Showing {data.rangeStart} to {data.rangeEnd} on this page.
			</p>
		</div>

		<div class="rounded-2xl border border-[color:var(--rule)] bg-white/92 p-4 shadow-[var(--sh)]">
			<div class="flex items-center gap-3">
				<div class="rounded-2xl bg-[color:var(--color-alpine-snow-100)] p-3 text-[var(--dark)]">
					<ShieldCheck class="h-5 w-5" />
				</div>
				<div>
					<p class="text-xs font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">Admins</p>
					<p class="text-2xl font-semibold text-[var(--dark)]">{data.adminCount}</p>
				</div>
			</div>
			<p class="mt-3 text-sm text-[var(--mid)]">
				Site admins can access this workspace and manage other users.
			</p>
		</div>

		<div class="rounded-2xl border border-[color:var(--rule)] bg-white/92 p-4 shadow-[var(--sh)]">
			<div class="flex items-center gap-3">
				<div
					class="rounded-2xl bg-[color:color-mix(in_srgb,var(--color-ember-500)_12%,white)] p-3 text-[var(--color-ember-700)]"
				>
					<ShieldAlert class="h-5 w-5" />
				</div>
				<div>
					<p class="text-xs font-semibold tracking-[0.12em] text-[var(--mid)] uppercase">
						Disabled
					</p>
					<p class="text-2xl font-semibold text-[var(--dark)]">{data.bannedCount}</p>
				</div>
			</div>
			<p class="mt-3 text-sm text-[var(--mid)]">
				Banned accounts are signed out immediately and blocked from creating new sessions.
			</p>
		</div>
	</section>

	<AdminSectionCard
		title="Browse users"
		description="Search by name or email, then manage permissions and account access without leaving the admin workspace."
	>
		<div class="space-y-5 p-4 sm:p-5">
			<form method="GET" class="flex flex-col gap-3 md:flex-row md:items-center">
				<div class="relative flex-1">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input name="q" value={data.search} placeholder="Search by name or email" class="pl-9" />
				</div>
				<Button type="submit">Search</Button>
				<Button href="/admin/users" type="button" variant="ghost">Clear</Button>
			</form>

			{#if data.users.length === 0}
				<div
					class="rounded-2xl border border-dashed border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)] p-8 text-center"
				>
					<p class="text-base font-medium text-[var(--dark)]">No users matched that search.</p>
					<p class="mt-2 text-sm text-[var(--mid)]">
						Try a different email fragment, a first name, or clear the current filter.
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.users as managedUser}
						{@const isCurrentAdmin = managedUser.id === data.currentAdminId}
						<div
							class="rounded-2xl border border-[color:var(--rule)] bg-white/95 shadow-[var(--sh)]"
						>
							<div
								class="flex flex-col gap-4 border-b border-[color:var(--rule)] px-4 py-4 lg:flex-row lg:items-start lg:justify-between"
							>
								<div class="min-w-0 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<h2 class="text-lg font-semibold text-[var(--dark)]">
											{managedUser.name}
										</h2>
										{#if isCurrentAdmin}
											<Badge variant="secondary">You</Badge>
										{/if}
										<Badge variant={roleBadgeVariant(managedUser.role)}>
											{managedUser.role ?? 'contributor'}
										</Badge>
										{#if managedUser.banned}
											<Badge variant="destructive">Disabled</Badge>
										{:else}
											<Badge variant="outline">Active</Badge>
										{/if}
										{#if managedUser.emailVerified}
											<Badge variant="outline">Verified</Badge>
										{/if}
									</div>
									<p class="text-sm text-[var(--mid)]">{managedUser.email}</p>
									<div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--mid)]">
										<span>Created {formatDate(managedUser.createdAt)}</span>
										<span>Updated {formatDate(managedUser.updatedAt)}</span>
										{#if managedUser.banExpires}
											<span>Disabled until {formatDate(managedUser.banExpires)}</span>
										{/if}
									</div>
									{#if managedUser.banned && managedUser.banReason}
										<p class="text-sm text-[var(--dark)]">
											<span class="font-medium">Reason:</span>
											{managedUser.banReason}
										</p>
									{/if}
								</div>
							</div>

							<div class="grid gap-4 px-4 py-4 lg:grid-cols-2 xl:grid-cols-4">
								<form
									method="POST"
									action="?/setRole"
									class="rounded-2xl border border-[color:var(--rule)] p-4"
								>
									<input type="hidden" name="userId" value={managedUser.id} />
									<p class="mb-3 text-sm font-semibold text-[var(--dark)]">Permissions</p>
									<div class="space-y-3">
										<select
											name="role"
											value={managedUser.role ?? 'contributor'}
											disabled={isCurrentAdmin}
											class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="contributor">Contributor</option>
											<option value="moderator">Moderator</option>
											<option value="admin">Admin</option>
										</select>
										<Button type="submit" class="w-full" disabled={isCurrentAdmin}>
											Save role
										</Button>
										{#if isCurrentAdmin}
											<p class="text-xs text-[var(--mid)]">
												Your own admin role is locked from this screen.
											</p>
										{/if}
									</div>
								</form>

								<form
									method="POST"
									action="?/sendPasswordReset"
									class="rounded-2xl border border-[color:var(--rule)] p-4"
								>
									<input type="hidden" name="email" value={managedUser.email} />
									<p class="mb-3 text-sm font-semibold text-[var(--dark)]">Password reset</p>
									<p class="mb-3 text-sm text-[var(--mid)]">
										Send the standard reset email flow to this user.
									</p>
									<Button type="submit" class="w-full" variant="outline">
										<KeyRound class="mr-2 h-4 w-4" />
										Send reset email
									</Button>
								</form>

								<form
									method="POST"
									action="?/revokeSessions"
									class="rounded-2xl border border-[color:var(--rule)] p-4"
								>
									<input type="hidden" name="userId" value={managedUser.id} />
									<p class="mb-3 text-sm font-semibold text-[var(--dark)]">Sessions</p>
									<p class="mb-3 text-sm text-[var(--mid)]">
										Force re-authentication across every active session for this account.
									</p>
									<Button type="submit" class="w-full" variant="outline" disabled={isCurrentAdmin}>
										<RefreshCcw class="mr-2 h-4 w-4" />
										Revoke all sessions
									</Button>
								</form>

								<form
									method="POST"
									action={managedUser.banned ? '?/unban' : '?/ban'}
									class="rounded-2xl border border-[color:var(--rule)] p-4"
								>
									<input type="hidden" name="userId" value={managedUser.id} />
									<p class="mb-3 text-sm font-semibold text-[var(--dark)]">Access status</p>
									{#if managedUser.banned}
										<p class="mb-3 text-sm text-[var(--mid)]">
											Restore access so this account can sign back in again.
										</p>
										<Button type="submit" class="w-full">
											<ShieldCheck class="mr-2 h-4 w-4" />
											Restore access
										</Button>
									{:else}
										<div class="space-y-3">
											<Input name="banReason" placeholder="Optional reason shown to staff" />
											<select
												name="banDuration"
												class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
											>
												<option value="">Disable until manually restored</option>
												<option value="86400">Disable for 1 day</option>
												<option value="604800">Disable for 7 days</option>
												<option value="2592000">Disable for 30 days</option>
											</select>
											<Button
												type="submit"
												class="w-full"
												variant="destructive"
												disabled={isCurrentAdmin}
											>
												<Ban class="mr-2 h-4 w-4" />
												Disable account
											</Button>
										</div>
									{/if}
								</form>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if data.totalPages > 1}
				<div
					class="flex flex-col gap-3 border-t border-[color:var(--rule)] pt-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<p class="text-sm text-[var(--mid)]">
						Page {data.page} of {data.totalPages}
					</p>
					<div class="flex items-center gap-2">
						<Button
							href={data.page > 1
								? `/admin/users?${new URLSearchParams({
										...(data.search ? { q: data.search } : {}),
										page: String(data.page - 1)
									}).toString()}`
								: undefined}
							variant="outline"
							disabled={data.page <= 1}
						>
							Previous
						</Button>
						<Button
							href={data.page < data.totalPages
								? `/admin/users?${new URLSearchParams({
										...(data.search ? { q: data.search } : {}),
										page: String(data.page + 1)
									}).toString()}`
								: undefined}
							variant="outline"
							disabled={data.page >= data.totalPages}
						>
							Next
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</AdminSectionCard>
</div>
