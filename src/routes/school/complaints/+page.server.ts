import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import { listComplaints, updateComplaint } from '#lib/server/workflows/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (
		!locals.permissions.includes('complaints.resolve') &&
		!locals.permissions.includes('school.complaints.manage')
	) {
		error(403, 'Complaints are not available.');
	}
	return { complaints: await listComplaints(getDb(), locals.userId!, locals.schoolId!) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await updateComplaint(getDb(), locals.userId!, locals.schoolId!, {
				complaintId: String(form.get('complaintId') ?? ''),
				status: String(form.get('status') ?? ''),
				note: String(form.get('note') ?? '')
			});
			return { saved: 'Complaint updated.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
