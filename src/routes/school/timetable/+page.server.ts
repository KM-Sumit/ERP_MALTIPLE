import { error, redirect } from '@sveltejs/kit';
import { hasPermission } from '#lib/permissions';
import {
	openTimetable,
	publishTimetable,
	reviseTimetable,
	saveCalendar,
	saveClassroom,
	saveEntry,
	savePeriod,
	timetableBoard
} from '#lib/server/academics/timetable';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.userId || !locals.schoolId) redirect(303, '/login');
	if (!hasPermission(locals.permissions, 'timetables.manage')) error(403, 'Forbidden');
	const board = await timetableBoard(getDb(), locals.userId, locals.schoolId);
	return { ...board, focus: url.searchParams.get('timetable') };
};

export const actions: Actions = {
	calendar: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		const days = form.getAll('workingDays').map(Number);
		try {
			await saveCalendar(getDb(), locals.userId, locals.schoolId, {
				workingDays: days,
				dayStart: String(form.get('dayStart') ?? ''),
				dayEnd: String(form.get('dayEnd') ?? ''),
				absentCountsAsZero: form.get('absentCountsAsZero') === 'on'
			});
			return { saved: 'Working days saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	period: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		const kind = String(form.get('kind') ?? 'teaching');
		try {
			await savePeriod(getDb(), locals.userId, locals.schoolId, {
				name: String(form.get('name') ?? ''),
				start: String(form.get('start') ?? ''),
				end: String(form.get('end') ?? ''),
				sortOrder: Number(form.get('sortOrder') ?? '1'),
				kind: kind === 'break' ? 'break' : 'teaching'
			});
			return { saved: 'Period saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	room: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		const capacity = Number(form.get('capacity') ?? '');
		try {
			await saveClassroom(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('name') ?? ''),
				Number.isFinite(capacity) ? capacity : null
			);
			return { saved: 'Classroom saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	open: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await openTimetable(getDb(), locals.userId, locals.schoolId, {
				sectionId: String(form.get('sectionId') ?? ''),
				sessionId: String(form.get('sessionId') ?? ''),
				name: String(form.get('name') ?? '')
			});
			return { saved: 'Draft timetable created.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	entry: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		const classroomId = String(form.get('classroomId') ?? '');
		try {
			await saveEntry(getDb(), locals.userId, locals.schoolId, {
				timetableId: String(form.get('timetableId') ?? ''),
				lockVersion: Number(form.get('lockVersion') ?? '0'),
				weekday: Number(form.get('weekday') ?? '1'),
				periodId: String(form.get('periodId') ?? ''),
				subjectId: String(form.get('subjectId') ?? ''),
				teacherUserId: String(form.get('teacherUserId') ?? ''),
				classroomId: classroomId || null
			});
			return { saved: 'Period assigned. Review conflicts, then publish.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	publish: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await publishTimetable(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('timetableId') ?? ''),
				Number(form.get('lockVersion') ?? '0')
			);
			return { saved: 'Timetable published.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	revise: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await reviseTimetable(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('timetableId') ?? '')
			);
			return {
				saved: 'A new draft revision is open. The previous publication is kept in history.'
			};
		} catch (cause) {
			return actionError(cause);
		}
	}
};
