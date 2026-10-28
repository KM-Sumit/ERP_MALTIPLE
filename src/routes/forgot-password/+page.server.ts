import { requestPasswordReset } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		await requestPasswordReset(getDb(), String(form.get('email') ?? ''));
		return { sent: true };
	}
};
