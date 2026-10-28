import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	if (!locals.isPlatformAdmin) redirect(303, '/');
	return { fullName: locals.fullName ?? 'Super Admin' };
};
