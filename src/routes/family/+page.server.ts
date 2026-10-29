import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import {
	studentAttendance,
	studentFees,
	studentHome,
	studentNotices,
	studentNotes,
	studentResults,
	studentSchedule
} from '#lib/server/academics/student-desk';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const studentId = url.searchParams.get('student');
	const db = getDb();
	const userId = locals.userId ?? '';
	const schoolId = locals.schoolId ?? '';
	try {
		const [home, attendance, fees, schedule, notices, notes, results] = await Promise.all([
			studentHome(db, userId, schoolId, studentId),
			studentAttendance(db, userId, schoolId, studentId),
			studentFees(db, userId, schoolId, studentId),
			studentSchedule(db, userId, schoolId, studentId),
			studentNotices(db, userId, schoolId, studentId),
			studentNotes(db, userId, schoolId, studentId),
			studentResults(db, userId, schoolId, studentId)
		]);
		return {
			...home,
			viewer: locals.roleKey === 'student' ? 'student' : 'parent',
			attendance: attendance.rows,
			invoices: fees.invoices,
			periods: schedule.periods,
			dayName: schedule.dayName,
			notices: notices.notices.slice(0, 4),
			notes: notes.items.length,
			exams: results.cards.length
		};
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};
