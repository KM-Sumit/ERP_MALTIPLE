import { teacherHome } from '#lib/server/academics/portals';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return teacherHome(getDb(), locals.userId ?? '', locals.schoolId ?? '');
};
