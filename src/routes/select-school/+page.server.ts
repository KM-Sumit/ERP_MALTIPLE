import { redirect } from '@sveltejs/kit';
import { selectSchool } from '#lib/server/auth/service';
import { accountSchools, SESSION_COOKIE } from '#lib/server/auth/session';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.userId) redirect(303, '/login');
	if (locals.roleKey === 'school_admin' || locals.roleKey === 'manager_admin') redirect(303, '/school');
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');
	const schools = await accountSchools(getDb(), token);
	return { schools };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.userId) redirect(303, '/login');
		const token = cookies.get(SESSION_COOKIE);
		if (!token) redirect(303, '/login');
		const form = await request.formData();
		try {
			await selectSchool(getDb(), token, String(form.get('schoolId') ?? ''));
		} catch (error) {
			return actionError(error);
		}
		redirect(303, '/');
	}
};
