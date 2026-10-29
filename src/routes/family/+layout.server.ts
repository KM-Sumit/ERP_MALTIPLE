import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { studentHome } from '#lib/server/academics/student-desk';
import { getDb } from '#lib/server/db';
import { schools } from '#lib/server/db/schema';
import { withSchoolUser } from '#lib/server/db/tenant';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.userId) redirect(303, '/login');
	if ((locals.roleKey !== 'parent' && locals.roleKey !== 'student') || !locals.schoolId) {
		redirect(303, '/');
	}
	const home = await studentHome(getDb(), locals.userId, locals.schoolId, url.searchParams.get('student'));
	const [school] = await withSchoolUser(getDb(), locals.userId, locals.schoolId, (tx) =>
		tx.select({ name: schools.name }).from(schools).where(eq(schools.id, locals.schoolId!))
	);
	const selected = home.selected;
	return {
		fullName: locals.fullName ?? (locals.roleKey === 'student' ? 'Student' : 'Parent'),
		title: locals.roleKey === 'student' ? 'Student' : 'Parent',
		schoolName: school?.name ?? 'School',
		studentId: selected?.id ?? '',
		studentName: selected ? `${selected.firstName} ${selected.lastName}` : locals.fullName ?? 'Student',
		classLine: home.placement
			? `Class ${home.placement.className} · ${home.placement.sectionName}${home.placement.rollNumber ? ` · Roll ${home.placement.rollNumber}` : ''}`
			: '',
		links: [
			{ href: '/family', label: 'Home' },
			{ href: '/account', label: 'Account' }
		]
	};
};
