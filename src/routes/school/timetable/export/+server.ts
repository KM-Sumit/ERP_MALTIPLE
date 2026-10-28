import { error } from '@sveltejs/kit';
import { exportTimetable } from '#lib/server/academics/timetable';
import { getDb } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.userId || !locals.schoolId) error(401, 'Sign in required');
	const id = url.searchParams.get('id') ?? '';
	try {
		const csv = await exportTimetable(getDb(), locals.userId, locals.schoolId, id);
		return new Response(csv, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': 'inline; filename="timetable.csv"'
			}
		});
	} catch {
		error(403, 'Forbidden');
	}
};
