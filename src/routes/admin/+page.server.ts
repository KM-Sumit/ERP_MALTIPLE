import { listSchoolBasics, openSchoolForPrincipal } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const schools = await listSchoolBasics(getDb(), locals.userId!);
	return { total: schools.length };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const created = await openSchoolForPrincipal(getDb(), locals.userId!, {
				name: String(form.get('name') ?? ''),
				seats: String(form.get('seats') ?? ''),
				email: String(form.get('email') ?? '')
			});
			return { saved: 'School created.', invitePath: `/invite/${created.token}` };
		} catch (error) {
			return actionError(error);
		}
	}
};
