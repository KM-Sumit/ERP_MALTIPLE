import { error } from '@sveltejs/kit';
import { schoolAudit } from '#lib/server/schools/service';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (
		!locals.permissions.includes('school.records.manage') &&
		!locals.permissions.includes('reports.export')
	) {
		error(403, 'Audit history is not available.');
	}
	return { events: await schoolAudit(getDb(), locals.userId!, locals.schoolId!) };
};
