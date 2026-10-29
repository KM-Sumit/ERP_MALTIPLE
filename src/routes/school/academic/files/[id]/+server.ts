import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { AuthError } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import { courseMaterials, sessionTimetableFiles } from '#lib/server/db/schema';
import { withSchoolUser } from '#lib/server/db/tenant';
import { readOwnedFile } from '#lib/server/storage/upload';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.userId || !locals.schoolId) error(401, 'Sign in required.');
	try {
		const linked = await withSchoolUser(getDb(), locals.userId, locals.schoolId, async (tx) => {
			const timetable = await tx
				.select({ id: sessionTimetableFiles.id })
				.from(sessionTimetableFiles)
				.where(
					and(
						eq(sessionTimetableFiles.fileId, params.id),
						eq(sessionTimetableFiles.schoolId, locals.schoolId!)
					)
				);
			if (timetable.length > 0) return timetable;
			return tx
				.select({ id: courseMaterials.id })
				.from(courseMaterials)
				.where(
					and(
						eq(courseMaterials.fileId, params.id),
						eq(courseMaterials.schoolId, locals.schoolId!)
					)
				);
		});
		if (linked.length === 0) error(404, 'File was not found.');
		const file = await readOwnedFile(getDb(), locals.userId, locals.schoolId, params.id);
		const bytes = await readFile(file.path);
		return new Response(bytes, {
			headers: {
				'content-type': file.mimeType,
				'content-disposition': 'inline',
				'cache-control': 'private, no-store',
				'x-content-type-options': 'nosniff'
			}
		});
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};
