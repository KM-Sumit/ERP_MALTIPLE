import { schoolDashboard } from '#lib/server/schools/dashboard';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) =>
	schoolDashboard(getDb(), locals.userId!, locals.schoolId!, url.searchParams.get('session'));
