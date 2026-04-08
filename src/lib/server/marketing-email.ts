type MarketingEmailLink = {
	label: string;
	href: string;
};

type MarketingEmailCard = {
	title: string;
	body?: string;
	meta?: string;
	href?: string;
};

type MarketingEmailSection = {
	title: string;
	description?: string;
	items?: MarketingEmailCard[];
};

export type MarketingEmailTemplate = {
	subject: string;
	preheader: string;
	html: string;
	text: string;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderLink(link: MarketingEmailLink, filled = true): string {
	const background = filled ? '#132533' : '#ffffff';
	const color = filled ? '#ffffff' : '#132533';
	const border = filled ? '#132533' : '#d7dfe6';

	return `<a href="${escapeHtml(link.href)}" style="display:inline-block;border:1px solid ${border};background:${background};color:${color};text-decoration:none;font-weight:600;border-radius:999px;padding:12px 18px;margin-right:12px;margin-top:8px;">${escapeHtml(link.label)}</a>`;
}

function renderSections(sections: MarketingEmailSection[]): string {
	return sections
		.map((section) => {
			const description = section.description
				? `<p style="margin:8px 0 0;color:#51606f;font-size:14px;line-height:1.6;">${escapeHtml(section.description)}</p>`
				: '';
			const items = (section.items ?? [])
				.map((item) => {
					const meta = item.meta
						? `<p style="margin:0 0 8px;color:#6a7886;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(item.meta)}</p>`
						: '';
					const title = item.href
						? `<a href="${escapeHtml(item.href)}" style="color:#132533;text-decoration:none;font-weight:700;">${escapeHtml(item.title)}</a>`
						: `<span style="color:#132533;font-weight:700;">${escapeHtml(item.title)}</span>`;
					const body = item.body
						? `<p style="margin:8px 0 0;color:#51606f;font-size:14px;line-height:1.6;">${escapeHtml(item.body)}</p>`
						: '';

					return `<div style="border:1px solid #d7dfe6;border-radius:18px;padding:16px 18px;background:#ffffff;margin-top:12px;">${meta}<div>${title}</div>${body}</div>`;
				})
				.join('');

			return `<section style="margin-top:28px;"><h2 style="margin:0;color:#132533;font-size:20px;line-height:1.3;">${escapeHtml(section.title)}</h2>${description}${items}</section>`;
		})
		.join('');
}

function renderTextSections(sections: MarketingEmailSection[]): string {
	return sections
		.map((section) => {
			const header = [`${section.title}`, section.description].filter(Boolean).join('\n');
			const items = (section.items ?? [])
				.map((item) =>
					[
						`- ${item.title}`,
						item.meta ? `  ${item.meta}` : null,
						item.body ? `  ${item.body}` : null,
						item.href ? `  ${item.href}` : null
					]
						.filter(Boolean)
						.join('\n')
				)
				.join('\n');

			return [header, items].filter(Boolean).join('\n');
		})
		.join('\n\n');
}

export function buildMarketingEmailTemplate(options: {
	subject: string;
	preheader: string;
	eyebrow?: string;
	title: string;
	intro: string;
	sections: MarketingEmailSection[];
	primaryCta?: MarketingEmailLink;
	secondaryCta?: MarketingEmailLink;
	managePreferencesUrl?: string;
	unsubscribeUrl?: string;
	footerNote?: string;
}): MarketingEmailTemplate {
	const footerLinks = [
		options.managePreferencesUrl
			? `<a href="${escapeHtml(options.managePreferencesUrl)}" style="color:#132533;">Manage preferences</a>`
			: null,
		options.unsubscribeUrl
			? `<a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#132533;">Unsubscribe</a>`
			: null
	]
		.filter(Boolean)
		.join(' · ');

	const html = `<!doctype html>
<html lang="en">
	<body style="margin:0;background:#eef3f6;font-family:Georgia, 'Times New Roman', serif;color:#132533;">
		<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
		<div style="margin:0 auto;max-width:680px;padding:32px 16px;">
			<div style="border:1px solid #d7dfe6;border-radius:28px;overflow:hidden;background:#fffdf9;box-shadow:0 18px 42px rgba(19,37,51,0.08);">
				<div style="padding:36px 32px;background:linear-gradient(135deg,#132533 0%,#1e3b4f 100%);color:#ffffff;">
					<p style="margin:0 0 12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;opacity:0.78;">${escapeHtml(options.eyebrow ?? 'Knowledge Basket')}</p>
					<h1 style="margin:0;font-size:34px;line-height:1.1;">${escapeHtml(options.title)}</h1>
					<p style="margin:16px 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.7;opacity:0.9;">${escapeHtml(options.intro)}</p>
				</div>
				<div style="padding:28px 32px 32px;">
					${renderSections(options.sections)}
					<div style="margin-top:28px;">
						${options.primaryCta ? renderLink(options.primaryCta, true) : ''}
						${options.secondaryCta ? renderLink(options.secondaryCta, false) : ''}
					</div>
					<p style="margin:28px 0 0;color:#6a7886;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;">
						${escapeHtml(options.footerNote ?? 'You are receiving this because of your account activity or email preferences in Knowledge Basket.')}
					</p>
					${footerLinks ? `<p style="margin:10px 0 0;color:#6a7886;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;">${footerLinks}</p>` : ''}
				</div>
			</div>
		</div>
	</body>
</html>`;

	const text = [
		options.subject,
		'',
		options.intro,
		'',
		renderTextSections(options.sections),
		options.primaryCta ? `Primary CTA: ${options.primaryCta.label} — ${options.primaryCta.href}` : null,
		options.secondaryCta
			? `Secondary CTA: ${options.secondaryCta.label} — ${options.secondaryCta.href}`
			: null,
		options.footerNote ?? 'You are receiving this because of your account activity or email preferences in Knowledge Basket.',
		options.managePreferencesUrl ? `Manage preferences: ${options.managePreferencesUrl}` : null,
		options.unsubscribeUrl ? `Unsubscribe: ${options.unsubscribeUrl}` : null
	]
		.filter(Boolean)
		.join('\n\n');

	return {
		subject: options.subject,
		preheader: options.preheader,
		html,
		text
	};
}

export function buildFollowDigestEmail(options: {
	recipientName?: string;
	subject?: string;
	organizations: string[];
	items: MarketingEmailCard[];
	managePreferencesUrl?: string;
	unsubscribeUrl?: string;
}): MarketingEmailTemplate {
	const audience = options.organizations.length > 0 ? options.organizations.join(', ') : 'your followed organizations';

	return buildMarketingEmailTemplate({
		subject: options.subject ?? 'Updates from the organizations you follow',
		preheader: `Fresh items from ${audience}.`,
		eyebrow: 'Follow digest',
		title: options.recipientName
			? `New updates for ${options.recipientName}`
			: 'New updates from the organizations you follow',
		intro: `This digest is ready for follow-based campaigns. It groups content from ${audience} so staff can send tailored updates instead of one broad newsletter.`,
		sections: [
			{
				title: 'Fresh from followed organizations',
				description: 'Swap these cards for events, jobs, funding, or resources tied to the user’s follow graph.',
				items: options.items
			}
		],
		managePreferencesUrl: options.managePreferencesUrl,
		unsubscribeUrl: options.unsubscribeUrl
	});
}

export function buildInterestDigestEmail(options: {
	recipientName?: string;
	subject?: string;
	interestLabel: string;
	items: MarketingEmailCard[];
	primaryCta?: MarketingEmailLink;
	managePreferencesUrl?: string;
	unsubscribeUrl?: string;
}): MarketingEmailTemplate {
	return buildMarketingEmailTemplate({
		subject: options.subject ?? `New opportunities for ${options.interestLabel}`,
		preheader: `A tailored update for people interested in ${options.interestLabel}.`,
		eyebrow: 'Interest campaign',
		title: options.recipientName
			? `${options.recipientName}, here’s what matches your interest`
			: `New matches for ${options.interestLabel}`,
		intro: `Use this template for audience segments built from explicit interest events such as job interest tracking.`,
		sections: [
			{
				title: `Because you showed interest in ${options.interestLabel}`,
				description:
					'Each item can map to a job, event, funding opportunity, or resource that matched a saved signal.',
				items: options.items
			}
		],
		primaryCta: options.primaryCta,
		managePreferencesUrl: options.managePreferencesUrl,
		unsubscribeUrl: options.unsubscribeUrl
	});
}

export function buildNewsletterEmail(options: {
	subject: string;
	preheader: string;
	title: string;
	intro: string;
	sections: MarketingEmailSection[];
	primaryCta?: MarketingEmailLink;
	secondaryCta?: MarketingEmailLink;
	managePreferencesUrl?: string;
	unsubscribeUrl?: string;
}): MarketingEmailTemplate {
	return buildMarketingEmailTemplate({
		subject: options.subject,
		preheader: options.preheader,
		eyebrow: 'Newsletter',
		title: options.title,
		intro: options.intro,
		sections: options.sections,
		primaryCta: options.primaryCta,
		secondaryCta: options.secondaryCta,
		managePreferencesUrl: options.managePreferencesUrl,
		unsubscribeUrl: options.unsubscribeUrl
	});
}
