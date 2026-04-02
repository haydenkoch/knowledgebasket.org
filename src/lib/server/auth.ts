import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendMail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			await sendMail({
				to: user.email,
				subject: 'Reset your Knowledge Basket password',
				html: `
					<p>Hi ${user.name ?? user.email},</p>
					<p>Click the link below to reset your password. This link expires in 1 hour.</p>
					<p><a href="${url}">${url}</a></p>
					<p>If you didn't request a password reset, you can ignore this email.</p>
				`
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendMail({
				to: user.email,
				subject: 'Verify your Knowledge Basket email',
				html: `
					<p>Hi ${user.name ?? user.email},</p>
					<p>Click the link below to verify your email address.</p>
					<p><a href="${url}">${url}</a></p>
					<p>If you didn't create an account, you can ignore this email.</p>
				`
			});
		}
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'contributor',
				input: false
			}
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
