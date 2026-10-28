import { error } from '@sveltejs/kit';
import { publishNotice, schoolHome } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.permissions.includes('school.settings.manage'))
		error(403, 'Notices are not available.');
	return schoolHome(getDb(), locals.userId!, locals.schoolId!);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await publishNotice(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				String(form.get('title') ?? ''),
				String(form.get('body') ?? '')
			);
			return { saved: 'Notice published.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
