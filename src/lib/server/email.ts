import nodemailer from 'nodemailer';
import { readBoolean } from '$lib/config/runtime-config-core';
import { readRuntimeConfigValue } from '$lib/server/runtime-secrets';

const smtpHost = readRuntimeConfigValue('SMTP_HOST') ?? 'localhost';
const smtpPort = Number.parseInt(readRuntimeConfigValue('SMTP_PORT') ?? '1025', 10);
const smtpSecure = readBoolean(readRuntimeConfigValue('SMTP_SECURE'), smtpPort === 465);
const smtpRequireTls = readBoolean(readRuntimeConfigValue('SMTP_REQUIRE_TLS'), false);
const smtpUser = readRuntimeConfigValue('SMTP_USER');
const smtpPass = readRuntimeConfigValue('SMTP_PASS');
const smtpFrom =
	readRuntimeConfigValue('SMTP_FROM') ?? '"Knowledge Basket" <noreply@knowledgebasket.ca>';

const transporter = nodemailer.createTransport({
	host: smtpHost,
	port: Number.isFinite(smtpPort) ? smtpPort : 1025,
	secure: smtpSecure,
	requireTLS: smtpRequireTls,
	auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
});

export async function sendMail({
	to,
	subject,
	html,
	text
}: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}): Promise<void> {
	await transporter.sendMail({
		from: smtpFrom,
		to,
		subject,
		html,
		text
	});
}
