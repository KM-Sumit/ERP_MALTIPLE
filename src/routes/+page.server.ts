import { redirect } from '@sveltejs/kit';
import { platformAdminExists } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.isPlatformAdmin) redirect(303, '/admin');
	if (locals.userId && !locals.schoolId) redirect(303, '/select-school');
	if (locals.roleKey === 'teacher') redirect(303, '/teach');
	if (locals.roleKey === 'parent' || locals.roleKey === 'student') redirect(303, '/family');
	if (locals.roleKey === 'school_admin' || locals.roleKey === 'manager_admin')
		redirect(303, '/school');

	let needsSetup: boolean;
	try {
		needsSetup = !(await platformAdminExists(getDb()));
	} catch {
		needsSetup = false;
	}
	return { needsSetup };
};
