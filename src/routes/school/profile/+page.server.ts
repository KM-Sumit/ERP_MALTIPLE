import { error } from '@sveltejs/kit';
import { schoolHome, updateBranding } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.permissions.includes('school.settings.manage'))
		error(403, 'School settings are not available.');
	return schoolHome(getDb(), locals.userId!, locals.schoolId!);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await updateBranding(getDb(), locals.userId!, locals.schoolId!, {
				name: String(form.get('name') ?? ''),
				address: String(form.get('address') ?? ''),
				themeColor: String(form.get('themeColor') ?? ''),
				logoPath: String(form.get('logoPath') ?? '')
			});
			return { saved: 'School profile saved.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
