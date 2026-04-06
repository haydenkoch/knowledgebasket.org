import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

function readBoolean(value: string | undefined, fallback = false): boolean {
	if (!value) return fallback;

	switch (value.trim().toLowerCase()) {
		case '1':
		case 'true':
		case 'yes':
		case 'on':
			return true;
		case '0':
		case 'false':
		case 'no':
		case 'off':
			return false;
		default:
			return fallback;
	}
}

const smtpPort = Number.parseInt(env.SMTP_PORT ?? '1025', 10);
const smtpSecure = readBoolean(env.SMTP_SECURE, smtpPort === 465);
const smtpRequireTls = readBoolean(env.SMTP_REQUIRE_TLS, false);

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST ?? 'localhost',
	port: Number.isFinite(smtpPort) ? smtpPort : 1025,
	secure: smtpSecure,
	requireTLS: smtpRequireTls,
	auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

export async function sendMail({
	to,
	subject,
	html
}: {
	to: string;
	subject: string;
	html: string;
}): Promise<void> {
	await transporter.sendMail({
		from: env.SMTP_FROM ?? '"Knowledge Basket" <noreply@knowledgebasket.ca>',
		to,
		subject,
		html
	});
}
