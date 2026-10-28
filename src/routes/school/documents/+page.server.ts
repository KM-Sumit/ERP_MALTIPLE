import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import { listDocuments, reviewDocument } from '#lib/server/workflows/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (
		!locals.permissions.includes('documents.approve') &&
		!locals.permissions.includes('school.documents.manage')
	) {
		error(403, 'Documents are not available.');
	}
	return { requests: await listDocuments(getDb(), locals.userId!, locals.schoolId!) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const status = String(form.get('status') ?? '');
		if (status !== 'ready' && status !== 'rejected') {
			return actionError(new AuthError('Choose ready or rejected.'));
		}
		try {
			await reviewDocument(getDb(), locals.userId!, locals.schoolId!, {
				requestId: String(form.get('requestId') ?? ''),
				status,
				note: String(form.get('note') ?? '')
			});
			return { saved: 'Document request updated.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
