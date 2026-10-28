import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { AuthError } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import { readOwnedFile } from '#lib/server/storage/upload';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.userId || !locals.schoolId) error(401, 'Sign in required.');
	try {
		const file = await readOwnedFile(getDb(), locals.userId, locals.schoolId, params.id);
		const bytes = await readFile(file.path);
		return new Response(bytes, {
			headers: {
				'content-type': file.mimeType,
				'content-disposition': 'attachment',
				'cache-control': 'private, no-store',
				'x-content-type-options': 'nosniff'
			}
		});
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};
