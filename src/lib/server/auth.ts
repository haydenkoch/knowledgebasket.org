import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendMail } from '$lib/server/email';
import { resolveRuntimeOrigin } from '$lib/server/runtime-config';

const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
const runtimeOrigin = resolveRuntimeOrigin() ?? 'http://localhost:5173';

export const googleAuthEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
	baseURL: runtimeOrigin,
	trustedOrigins: [runtimeOrigin],
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google'],
			allowDifferentEmails: false
		}
	},
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
	socialProviders: googleAuthEnabled
		? {
				google: {
					clientId: googleClientId!,
					clientSecret: googleClientSecret!,
					scope: ['email', 'profile'],
					prompt: 'select_account',
					overrideUserInfoOnSignIn: false
				}
			}
		: undefined,
	user: {
		changeEmail: {
			enabled: true,
			sendChangeEmailVerification: async ({ user, newEmail, url }) => {
				await sendMail({
					to: user.email,
					subject: 'Confirm your new Knowledge Basket email',
					html: `
						<p>Hi ${user.name ?? user.email},</p>
						<p>We received a request to change the email on your Knowledge Basket account to <strong>${newEmail}</strong>.</p>
						<p>To confirm this change, click the link below. This link expires in 1 hour.</p>
						<p><a href="${url}">${url}</a></p>
						<p>If you didn't request this, you can safely ignore this email — your account will stay on the current address.</p>
					`
				});
			}
		},
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
