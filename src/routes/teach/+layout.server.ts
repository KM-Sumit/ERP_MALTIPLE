import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db';
import { schools } from '#lib/server/db/schema';
import { withSchoolUser } from '#lib/server/db/tenant';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	if (locals.roleKey !== 'teacher' || !locals.schoolId) redirect(303, '/');
	const [school] = await withSchoolUser(getDb(), locals.userId, locals.schoolId, (tx) =>
		tx.select({ name: schools.name }).from(schools).where(eq(schools.id, locals.schoolId!))
	);
	return {
		fullName: locals.fullName ?? 'Teacher',
		schoolName: school?.name ?? 'School',
		links: [
			{ href: '/teach', label: 'Today' },
			{ href: '/teach/attendance', label: 'Attendance' },
			{ href: '/teach/marks', label: 'Marks' },
			{ href: '/teach/homework', label: 'Homework' },
			{ href: '/account', label: 'Account' }
		]
	};
};
