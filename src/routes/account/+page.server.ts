import { fail, type Actions } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { getAccountDashboard } from '$lib/server/account';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/auth.schema';
import { uploadImage } from '$lib/server/upload';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuthenticatedUser(locals);
	return getAccountDashboard(user.id);
};

export const actions: Actions = {
	updateProfile: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { profileError: 'Not signed in' });

		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const avatar = formData.get('avatar');
		const removeAvatar = formData.get('removeAvatar') === 'on';

		if (name.length === 0) {
			return fail(400, { profileError: 'Display name is required' });
		}
		if (name.length > 120) {
			return fail(400, { profileError: 'Display name is too long' });
		}

		const updates: { name: string; image?: string | null } = { name };

		if (removeAvatar) {
			updates.image = null;
		} else if (avatar instanceof File && avatar.size > 0) {
			try {
				const url = await uploadImage(avatar, 'avatars');
				updates.image = url;
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Upload failed';
				return fail(400, { profileError: message });
			}
		}

		await db.update(userTable).set(updates).where(eq(userTable.id, locals.user.id));

		return { profileSuccess: 'Profile updated' };
	}
};
