import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { requestDocument } from '#lib/server/academics/portals';
import { studentDocuments } from '#lib/server/academics/student-desk';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		return studentDocuments(
			getDb(),
			locals.userId ?? '',
			locals.schoolId ?? '',
			url.searchParams.get('student')
		);
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await requestDocument(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('studentId') ?? ''),
				String(form.get('docType') ?? '')
			);
			return { saved: 'Bonafide request submitted.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
