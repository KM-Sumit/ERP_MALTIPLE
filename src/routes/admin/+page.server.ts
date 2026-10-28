import { openSchool, platformBoard, setSchoolBill } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const schools = await platformBoard(getDb(), locals.userId!);
	return { schools };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await openSchool(getDb(), locals.userId!, {
				name: String(form.get('name') ?? ''),
				seats: String(form.get('seats') ?? ''),
				bill: String(form.get('bill') ?? '')
			});
		} catch (error) {
			return actionError(error);
		}
		return { saved: 'School created.' };
	},
	bill: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await setSchoolBill(
				getDb(),
				locals.userId!,
				String(form.get('schoolId') ?? ''),
				String(form.get('bill') ?? '')
			);
		} catch (error) {
			return actionError(error);
		}
		return { saved: 'Bill status updated.' };
	}
};
