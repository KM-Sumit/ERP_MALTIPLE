import { redirect } from '@sveltejs/kit';
import { createSchool, listSchools } from '#lib/server/schools/service';
import { actionError, readPage } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const query = readPage(url);
	const result = await listSchools(getDb(), locals.userId!, query);
	return { ...result, query };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const schoolId = await createSchool(
				getDb(),
				locals.userId!,
				String(form.get('name') ?? ''),
				String(form.get('code') ?? '')
			);
			redirect(303, `/admin/schools/${schoolId}`);
		} catch (error) {
			return actionError(error);
		}
	}
};
