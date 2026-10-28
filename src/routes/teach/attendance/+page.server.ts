import {
	attendanceHistory,
	requestAttendanceCorrection,
	saveAttendance
} from '#lib/server/academics/portals';
import { teacherDesk } from '#lib/server/schools/service';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

const statuses = ['present', 'absent', 'late', 'excused'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const desk = await teacherDesk(getDb(), locals.userId ?? '', locals.schoolId ?? '');
	const sectionId = url.searchParams.get('section') ?? desk.assignments[0]?.sectionId ?? '';
	const history = sectionId
		? await attendanceHistory(getDb(), locals.userId ?? '', locals.schoolId ?? '', sectionId)
		: [];
	return {
		...desk,
		sectionId,
		history,
		date: url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const form = await request.formData();
		const status = String(form.get('status') ?? '');
		if (!statuses.includes(status as (typeof statuses)[number]))
			return actionError(new Error('status'));
		try {
			await saveAttendance(getDb(), locals.userId ?? '', locals.schoolId ?? '', {
				studentId: String(form.get('studentId') ?? ''),
				sectionId: String(form.get('sectionId') ?? ''),
				date: String(form.get('date') ?? ''),
				status: status as (typeof statuses)[number],
				submit: form.get('submit') === 'yes'
			});
			return {
				saved: form.get('submit') === 'yes' ? 'Attendance submitted.' : 'Attendance draft saved.'
			};
		} catch (cause) {
			return actionError(cause);
		}
	},
	correct: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await requestAttendanceCorrection(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('attendanceId') ?? ''),
				String(form.get('note') ?? '')
			);
			return { saved: 'Correction requested.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
