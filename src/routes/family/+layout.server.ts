import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	if (locals.roleKey !== 'parent' || !locals.schoolId) redirect(303, '/');
	return {
		fullName: locals.fullName ?? 'Parent',
		links: [
			{ href: '/family', label: 'Home' },
			{ href: '/account', label: 'Account' }
		]
	};
};
