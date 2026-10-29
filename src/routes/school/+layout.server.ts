import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hasPermission } from '#lib/permissions';
import { getDb } from '#lib/server/db';
import { schools } from '#lib/server/db/schema';
import { withSchoolUser } from '#lib/server/db/tenant';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	if (!locals.schoolId) redirect(303, '/select-school');
	if (locals.roleKey === 'teacher') redirect(303, '/teach');
	if (locals.roleKey === 'parent' || locals.roleKey === 'student') redirect(303, '/family');
	if (locals.roleKey !== 'school_admin' && locals.roleKey !== 'manager_admin') redirect(303, '/');
	const [school] = await withSchoolUser(getDb(), locals.userId, locals.schoolId, (tx) =>
		tx
			.select({ name: schools.name })
			.from(schools)
			.where(eq(schools.id, locals.schoolId!))
	);
	const permissions = locals.permissions;
	return {
		schoolName: school?.name ?? 'School',
		fullName: locals.fullName ?? 'School user',
		permissions,
		links: [
			{ href: '/school', label: 'Overview' },
			...(hasPermission(permissions, 'school.settings.manage')
				? [{ href: '/school/setup', label: 'Onboarding' }]
				: []),
			...(hasPermission(permissions, 'school.settings.manage')
				? [
						{ href: '/school/profile', label: 'Profile' },
						{ href: '/school/policies', label: 'Policies' },
						{ href: '/school/notices', label: 'Notices' }
					]
				: []),
			...(hasPermission(permissions, 'classes.manage') ||
			hasPermission(permissions, 'school.records.manage')
				? [{ href: '/school/academic', label: 'Academics' }]
				: []),
			...(hasPermission(permissions, 'timetables.manage')
				? [{ href: '/school/timetable', label: 'Timetable' }]
				: []),
			...(hasPermission(permissions, 'exams.manage') ||
			hasPermission(permissions, 'results.publish')
				? [{ href: '/school/exams', label: 'Exams' }]
				: []),
			...(hasPermission(permissions, 'fees.configure') ||
			hasPermission(permissions, 'payments.record') ||
			hasPermission(permissions, 'school.fees.manage')
				? [{ href: '/school/fees', label: 'Fees' }]
				: []),
			...(hasPermission(permissions, 'classes.manage') ||
			hasPermission(permissions, 'school.teaching.write')
				? [{ href: '/school/courses', label: 'Courses' }]
				: []),
			...(hasPermission(permissions, 'complaints.resolve') ||
			hasPermission(permissions, 'school.complaints.manage')
				? [{ href: '/school/complaints', label: 'Complaints' }]
				: []),
			...(hasPermission(permissions, 'documents.approve') ||
			hasPermission(permissions, 'school.documents.manage')
				? [{ href: '/school/documents', label: 'Documents' }]
				: []),
			...(hasPermission(permissions, 'users.manage') ||
			hasPermission(permissions, 'school.members.manage')
				? [
						{ href: '/school/staff', label: 'Staff' },
						{ href: '/school/people', label: 'Students' }
					]
				: []),
			...(hasPermission(permissions, 'reports.export') ||
			hasPermission(permissions, 'school.records.manage')
				? [
						{ href: '/school/reports', label: 'Reports' },
						{ href: '/school/audit', label: 'Audit' }
					]
				: []),
			{ href: '/account', label: 'Account' }
		]
	};
};
