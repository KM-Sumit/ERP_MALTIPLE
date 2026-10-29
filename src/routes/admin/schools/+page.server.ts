import { fail } from '@sveltejs/kit';
import { listSchoolBasics, updateSchoolBasics } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const schools = await listSchoolBasics(getDb(), locals.userId!);
	return { schools, total: schools.length };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const form = await request.formData();
		const schoolId = String(form.get('schoolId') ?? '');
		try {
			await updateSchoolBasics(getDb(), locals.userId!, schoolId, {
				name: String(form.get('name') ?? ''),
				seats: String(form.get('seats') ?? '')
			});
			return { saved: 'School updated.', schoolId };
		} catch (error) {
			const result = actionError(error);
			if (result.status >= 500) return result;
			return fail(result.status, { ...result.data, schoolId });
		}
	}
};
