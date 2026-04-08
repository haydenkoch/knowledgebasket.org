import { describe, expect, it } from 'vitest';

describe('authenticated page actions', () => {
	it('returns 401 for unauthenticated personal calendar token rotation', async () => {
		const mod = await import('../src/routes/account/calendar/+page.server');

		await expect(
			mod.actions.rotateToken({
				locals: {}
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 401 for unauthenticated notification actions', async () => {
		const mod = await import('../src/routes/account/notifications/+page.server');

		await expect(
			mod.actions.markAllRead({
				locals: {}
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('returns 401 for unauthenticated organization invite acceptance', async () => {
		const mod = await import('../src/routes/org-invites/[token]/+page.server');

		await expect(
			mod.actions.accept({
				locals: {},
				params: { token: 'invite-token' }
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});
});
