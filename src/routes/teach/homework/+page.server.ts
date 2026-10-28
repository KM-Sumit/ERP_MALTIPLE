import { createHomework, requestMeeting, requestStaffLeave } from '#lib/server/academics/portals';
import { teacherDesk } from '#lib/server/schools/service';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return teacherDesk(getDb(), locals.userId ?? '', locals.schoolId ?? '');
};

export const actions: Actions = {
	homework: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await createHomework(getDb(), locals.userId ?? '', locals.schoolId ?? '', {
				sectionId: String(form.get('sectionId') ?? ''),
				subjectId: String(form.get('subjectId') ?? ''),
				title: String(form.get('title') ?? ''),
				instructions: String(form.get('instructions') ?? ''),
				dueAt: String(form.get('dueAt') ?? '') || null
			});
			return { saved: 'Homework published to the class.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	meeting: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await requestMeeting(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('studentId') ?? ''),
				String(form.get('note') ?? '')
			);
			return { saved: 'Meeting request recorded.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	leave: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await requestStaffLeave(getDb(), locals.userId ?? '', locals.schoolId ?? '', {
				startDate: String(form.get('startDate') ?? ''),
				endDate: String(form.get('endDate') ?? ''),
				reason: String(form.get('reason') ?? '')
			});
			return { saved: 'Leave application submitted.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
