import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.permissions.includes('reports.export')) error(403, 'Reports are not available.');
	return {};
};
