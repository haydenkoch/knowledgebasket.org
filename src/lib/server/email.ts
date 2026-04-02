import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST ?? 'localhost',
	port: parseInt(env.SMTP_PORT ?? '1025', 10),
	secure: false,
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
