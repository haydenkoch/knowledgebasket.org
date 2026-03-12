import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async () => {
		return fail(503, {
			error: 'Red Pages submissions are temporarily closed. This section is being updated. Please check back later.',
			values: {}
		});
	}
};
