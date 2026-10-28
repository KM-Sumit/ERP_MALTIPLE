import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	if (locals.roleKey !== 'teacher' || !locals.schoolId) redirect(303, '/');
	return {
		fullName: locals.fullName ?? 'Teacher',
		links: [
			{ href: '/teach', label: 'Today' },
			{ href: '/teach/attendance', label: 'Attendance' },
			{ href: '/teach/marks', label: 'Marks' },
			{ href: '/teach/homework', label: 'Homework' },
			{ href: '/account', label: 'Account' }
		]
	};
};
