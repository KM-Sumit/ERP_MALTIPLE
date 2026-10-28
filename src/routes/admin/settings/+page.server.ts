import { readOperations, saveOperations } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { operations: await readOperations(getDb(), locals.userId!) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await saveOperations(getDb(), locals.userId!, {
				status: String(form.get('status') ?? ''),
				message: String(form.get('message') ?? '')
			});
			return { saved: 'Operational status saved.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
