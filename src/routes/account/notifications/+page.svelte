<script lang="ts">
	import { enhance } from '$app/forms';
	import { trackNotificationPreferencesSaved } from '$lib/insights/events';
	import { updateAnalyticsPersonProperties } from '$lib/insights/provider.client';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

	let { data, form } = $props();

	const preferenceSections = [
		{
			label: 'Email',
			desc: 'Updates delivered to your inbox.',
			fields: [
				[
					'emailSubmissionUpdates',
					'Submission updates',
					'When your submitted content is reviewed.'
				],
				[
					'emailOrgActivity',
					'Organization activity',
					'When organizations you manage receive activity.'
				],
				[
					'emailFollowedOrgs',
					'Followed organizations',
					'When organizations you follow publish new items.'
				],
				[
					'emailBookmarkReminders',
					'Bookmark reminders',
					'Deadline and date reminders for saved items.'
				],
				['emailNewsletter', 'Newsletter', 'Periodic digests from Knowledge Basket.']
			]
		},
		{
			label: 'In-app',
			desc: 'Alerts in your notification center.',
			fields: [
				['inAppSubmissionUpdates', 'Submission updates', 'Status changes on your submissions.'],
				['inAppOrgActivity', 'Organization activity', 'Events inside organizations you manage.'],
				['inAppFollowedOrgs', 'Followed organizations', 'Updates from orgs you follow.'],
				['inAppBookmarkReminders', 'Bookmark reminders', 'Upcoming deadlines for saved items.']
			]
		}
	] as const;

	type PreferenceKey = (typeof preferenceSections)[number]['fields'][number][0];
	type NotificationPreferenceState = Record<PreferenceKey, boolean>;

	function notificationPreferenceState(
		source: Partial<Record<PreferenceKey, boolean | null | undefined>>
	): NotificationPreferenceState {
		return {
			emailSubmissionUpdates: Boolean(source.emailSubmissionUpdates),
			emailOrgActivity: Boolean(source.emailOrgActivity),
			emailFollowedOrgs: Boolean(source.emailFollowedOrgs),
			emailBookmarkReminders: Boolean(source.emailBookmarkReminders),
			emailNewsletter: Boolean(source.emailNewsletter),
			inAppSubmissionUpdates: Boolean(source.inAppSubmissionUpdates),
			inAppOrgActivity: Boolean(source.inAppOrgActivity),
			inAppFollowedOrgs: Boolean(source.inAppFollowedOrgs),
			inAppBookmarkReminders: Boolean(source.inAppBookmarkReminders)
		};
	}

	let preferences = $state(notificationPreferenceState({}));

	$effect(() => {
		preferences = notificationPreferenceState(data.preferences);
	});

	function notificationPreferencesSnapshot(formData: FormData) {
		return {
			emailSubmissionUpdates: formData.has('emailSubmissionUpdates'),
			emailOrgActivity: formData.has('emailOrgActivity'),
			emailFollowedOrgs: formData.has('emailFollowedOrgs'),
			emailBookmarkReminders: formData.has('emailBookmarkReminders'),
			emailNewsletter: formData.has('emailNewsletter'),
			inAppSubmissionUpdates: formData.has('inAppSubmissionUpdates'),
			inAppOrgActivity: formData.has('inAppOrgActivity'),
			inAppFollowedOrgs: formData.has('inAppFollowedOrgs'),
			inAppBookmarkReminders: formData.has('inAppBookmarkReminders')
		};
	}
</script>

<div class="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header>
			<Card.Title>Delivery preferences</Card.Title>
			<Card.Description>Choose which updates should reach you by email or in-app.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form
				method="POST"
				action="?/savePreferences"
				class="space-y-6"
				use:enhance={({ formData }) => {
					const nextPreferences = notificationPreferencesSnapshot(formData);
					return async ({ result, update }) => {
						if (result.type === 'success') {
							trackNotificationPreferencesSaved(nextPreferences);
							updateAnalyticsPersonProperties({
								email_submission_updates: nextPreferences.emailSubmissionUpdates,
								email_org_activity: nextPreferences.emailOrgActivity,
								email_followed_orgs: nextPreferences.emailFollowedOrgs,
								email_bookmark_reminders: nextPreferences.emailBookmarkReminders,
								email_newsletter: nextPreferences.emailNewsletter,
								in_app_submission_updates: nextPreferences.inAppSubmissionUpdates,
								in_app_org_activity: nextPreferences.inAppOrgActivity,
								in_app_followed_orgs: nextPreferences.inAppFollowedOrgs,
								in_app_bookmark_reminders: nextPreferences.inAppBookmarkReminders
							});
						}
						await update();
					};
				}}
			>
				{#each preferenceSections as section, si}
					{#if si > 0}
						<Separator />
					{/if}
					<div class="space-y-1">
						<p class="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
							{section.label}
						</p>
						<p class="text-xs text-muted-foreground">{section.desc}</p>
					</div>
					<div class="divide-y divide-border/60">
						{#each section.fields as [key, title, hint]}
							<label
								class="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
								for={`pref-${key}`}
							>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium">{title}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">{hint}</p>
								</div>
								<Switch id={`pref-${key}`} name={key} value="on" bind:checked={preferences[key]} />
							</label>
						{/each}
					</div>
				{/each}
				<div class="pt-2">
					<Button type="submit">Save preferences</Button>
				</div>
			</form>
			<div class="space-y-1">
				{#if form?.preferencesSuccess}
					<p class="text-sm text-emerald-700 dark:text-emerald-400">
						{form.preferencesSuccess}
					</p>
				{/if}
				<p class="text-xs text-muted-foreground">
					Current preference snapshot updated
					{new Date(form?.preferencesSavedAt ?? data.preferences.updatedAt).toLocaleString()}.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="border-border/70 bg-card/90">
		<Card.Header class="flex flex-row items-start justify-between gap-3 space-y-0">
			<div class="space-y-1.5">
				<Card.Title>Recent notifications</Card.Title>
				<Card.Description>
					{#if data.unreadCount > 0}
						<Badge class="mr-1.5 text-[10px] tracking-wider uppercase">
							{data.unreadCount} unread
						</Badge>
					{/if}
					Everything delivered to your notification center.
				</Card.Description>
			</div>
			{#if data.unreadCount > 0}
				<form method="POST" action="?/markAllRead">
					<Button type="submit" size="sm" variant="outline">Mark all read</Button>
				</form>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if data.notifications.length === 0}
				<p
					class="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground"
				>
					No notifications yet.
				</p>
			{:else}
				<ul class="divide-y divide-border/60">
					{#each data.notifications as notification}
						<li class="flex gap-3 py-4 first:pt-0 last:pb-0">
							<div class="pt-1.5">
								{#if !notification.read}
									<span class="block size-2 rounded-full bg-primary" aria-label="Unread"></span>
								{:else}
									<span class="block size-2 rounded-full bg-border" aria-hidden="true"></span>
								{/if}
							</div>
							<div class="min-w-0 flex-1 space-y-1">
								<p class="text-sm font-medium">{notification.title}</p>
								{#if notification.message}
									<p class="text-sm leading-6 text-muted-foreground">{notification.message}</p>
								{/if}
								<p class="text-xs text-muted-foreground">
									{new Date(notification.createdAt).toLocaleString()}
								</p>
								{#if notification.link || !notification.read}
									<div class="flex items-center gap-2 pt-1">
										{#if notification.link}
											<Button href={notification.link} size="sm" variant="outline">Open</Button>
										{/if}
										{#if !notification.read}
											<form method="POST" action="?/markRead">
												<input type="hidden" name="notificationId" value={notification.id} />
												<Button type="submit" size="sm" variant="ghost">Mark read</Button>
											</form>
										{/if}
									</div>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
