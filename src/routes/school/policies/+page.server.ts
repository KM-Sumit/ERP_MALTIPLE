import { error } from '@sveltejs/kit';
import { savePolicies, schoolHome } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.permissions.includes('school.settings.manage'))
		error(403, 'Policies are not available.');
	return schoolHome(getDb(), locals.userId!, locals.schoolId!);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await savePolicies(getDb(), locals.userId!, locals.schoolId!, {
				attendancePolicy: String(form.get('attendancePolicy') ?? ''),
				gradingPolicy: String(form.get('gradingPolicy') ?? ''),
				lateFeeGraceDays: Number(form.get('lateFeeGraceDays') ?? 0)
			});
			return { saved: 'Policies saved.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
