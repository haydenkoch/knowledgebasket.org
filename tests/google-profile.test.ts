import { describe, expect, it, vi } from 'vitest';
import { backfillGoogleProfile } from '../src/lib/server/google-profile';

const headers = new Headers();

describe('backfillGoogleProfile', () => {
	it('fills only the missing Google profile fields', async () => {
		const updateUserProfile = vi.fn(async () => {});

		const result = await backfillGoogleProfile('user-1', headers, {
			findLinkedGoogleAccount: async () => ({ accountId: 'google-account-1' }),
			getUserProfile: async () => ({ name: 'Existing Name', image: null }),
			getGoogleAccountInfo: async () => ({
				user: {
					name: 'Google Name',
					image: 'https://example.com/google-avatar.png'
				}
			}),
			updateUserProfile
		});

		expect(result).toEqual({ linked: true, updated: true });
		expect(updateUserProfile).toHaveBeenCalledWith('user-1', {
			image: 'https://example.com/google-avatar.png'
		});
	});

	it('does not overwrite an existing local profile', async () => {
		const updateUserProfile = vi.fn(async () => {});

		const result = await backfillGoogleProfile('user-1', headers, {
			findLinkedGoogleAccount: async () => ({ accountId: 'google-account-1' }),
			getUserProfile: async () => ({
				name: 'Local Name',
				image: 'https://example.com/local-avatar.png'
			}),
			getGoogleAccountInfo: async () => ({
				user: {
					name: 'Google Name',
					image: 'https://example.com/google-avatar.png'
				}
			}),
			updateUserProfile
		});

		expect(result).toEqual({ linked: true, updated: false });
		expect(updateUserProfile).not.toHaveBeenCalled();
	});

	it('skips backfill when no Google account is linked', async () => {
		const updateUserProfile = vi.fn(async () => {});

		const result = await backfillGoogleProfile('user-1', headers, {
			findLinkedGoogleAccount: async () => null,
			getUserProfile: async () => ({ name: '', image: null }),
			getGoogleAccountInfo: async () => ({
				user: {
					name: 'Google Name',
					image: 'https://example.com/google-avatar.png'
				}
			}),
			updateUserProfile
		});

		expect(result).toEqual({ linked: false, updated: false });
		expect(updateUserProfile).not.toHaveBeenCalled();
	});
});
