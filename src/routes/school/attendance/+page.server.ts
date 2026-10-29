import { error } from '@sveltejs/kit';
import { attendanceDesk } from '#lib/server/schools/directory';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

function today() {
	return new Date(Date.now() + (5 * 60 + 30) * 60 * 1000).toISOString().slice(0, 10);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (
		!locals.permissions.includes('school.records.manage') &&
		!locals.permissions.includes('classes.manage') &&
		!locals.permissions.includes('attendance.mark')
	) {
		error(403, 'Attendance is not available.');
	}
	const date = url.searchParams.get('date') || today();
	return attendanceDesk(
		getDb(),
		locals.userId!,
		locals.schoolId!,
		url.searchParams.get('section'),
		/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today()
	);
};
