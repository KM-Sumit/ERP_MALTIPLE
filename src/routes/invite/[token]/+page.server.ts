import { error, redirect } from '@sveltejs/kit';
import { acceptInvitation, previewInvitation } from '#lib/server/auth/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const invitation = await previewInvitation(getDb(), params.token);
	if (!invitation) error(404, 'This invitation is invalid or expired.');
	return { invitation };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const form = await request.formData();
		try {
			await acceptInvitation(getDb(), params.token, {
				fullName: String(form.get('fullName') ?? ''),
				password: String(form.get('password') ?? '')
			});
		} catch (caught) {
			return actionError(caught);
		}
		redirect(303, '/login');
	}
};
