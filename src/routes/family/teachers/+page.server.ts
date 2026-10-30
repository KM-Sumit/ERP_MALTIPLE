import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { studentTeachers } from '#lib/server/academics/student-desk';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		return await studentTeachers(
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
