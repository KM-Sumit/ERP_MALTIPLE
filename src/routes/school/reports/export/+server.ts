import { error } from '@sveltejs/kit';
import { TenantAccessError } from '#lib/server/authz/errors';
import { exportSchoolReport } from '#lib/server/schools/service';
import { getDb } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.userId || !locals.schoolId) error(401, 'Sign in to a school first.');
	try {
		const csv = await exportSchoolReport(getDb(), locals.userId, locals.schoolId);
		return new Response(csv, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': 'attachment; filename="roster.csv"'
			}
		});
	} catch (caught) {
		if (caught instanceof TenantAccessError) error(403, 'You cannot export this report.');
		error(400, 'The report could not be created.');
	}
};
