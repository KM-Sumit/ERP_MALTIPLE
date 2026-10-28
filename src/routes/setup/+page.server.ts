import { redirect } from '@sveltejs/kit';
import { bootstrapPlatformAdmin, platformAdminExists } from '#lib/server/auth/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (await platformAdminExists(getDb())) redirect(303, '/login');
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		try {
			await bootstrapPlatformAdmin(getDb(), {
				email: String(form.get('email') ?? ''),
				fullName: String(form.get('fullName') ?? ''),
				password: String(form.get('password') ?? '')
			});
		} catch (error) {
			return actionError(error);
		}
		redirect(303, '/login');
	}
};
