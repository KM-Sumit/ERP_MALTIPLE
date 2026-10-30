import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	if (locals.roleKey === 'school_admin' || locals.roleKey === 'manager_admin') redirect(303, '/school');
	if (!locals.isPlatformAdmin) redirect(303, '/');
	return { fullName: locals.fullName ?? 'Super Admin' };
};
