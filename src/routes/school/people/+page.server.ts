import { error } from '@sveltejs/kit';
import { studentRoster } from '#lib/server/schools/directory';
import { addStudent, linkGuardian, listPeople } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (
		!locals.permissions.includes('school.records.manage') &&
		!locals.permissions.includes('users.manage')
	) {
		error(403, 'Student records are not available.');
	}
	const [people, roster] = await Promise.all([
		listPeople(getDb(), locals.userId!, locals.schoolId!),
		studentRoster(getDb(), locals.userId!, locals.schoolId!)
	]);
	return { ...people, roster };
};

export const actions: Actions = {
	student: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const created = await addStudent(getDb(), locals.userId!, locals.schoolId!, {
				admissionNo: String(form.get('admissionNo') ?? ''),
				firstName: String(form.get('firstName') ?? ''),
				lastName: String(form.get('lastName') ?? ''),
				email: String(form.get('email') ?? '')
			});
			return { saved: 'Student added.', studentInvitePath: `/invite/${created.token}` };
		} catch (error) {
			return actionError(error);
		}
	},
	guardian: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const token = await linkGuardian(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				String(form.get('studentId') ?? ''),
				String(form.get('email') ?? ''),
				String(form.get('fullName') ?? '')
			);
			return { invitePath: `/invite/${token}` };
		} catch (error) {
			return actionError(error);
		}
	}
};
