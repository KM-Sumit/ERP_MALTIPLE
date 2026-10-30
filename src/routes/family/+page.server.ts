import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { studentHome, studentNotices } from '#lib/server/academics/student-desk';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const studentId = url.searchParams.get('student');
	const db = getDb();
	const userId = locals.userId ?? '';
	const schoolId = locals.schoolId ?? '';
	try {
		const [home, notices] = await Promise.all([
			studentHome(db, userId, schoolId, studentId),
			studentNotices(db, userId, schoolId, studentId)
		]);
		return {
			...home,
			notices: notices.notices.slice(0, 5)
		};
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};
