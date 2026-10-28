import { fail } from '@sveltejs/kit';
import { AuthError, resetPassword } from '#lib/server/auth/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return { token: url.searchParams.get('token') ?? '' };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		try {
			await resetPassword(
				getDb(),
				String(form.get('token') ?? ''),
				String(form.get('password') ?? '')
			);
			return { reset: true };
		} catch (error) {
			if (error instanceof AuthError) return fail(400, { message: error.message });
			return actionError(error);
		}
	}
};
