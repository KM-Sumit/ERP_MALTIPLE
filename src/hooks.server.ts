import { DATABASE_URL } from '$app/env/private';
import type { Handle } from '@sveltejs/kit/hooks';
import { clearSessionCookie } from '#lib/server/auth/cookie';
import {
	accountSchools,
	permissionsFor,
	readSession,
	SESSION_COOKIE
} from '#lib/server/auth/session';
import { getDb } from '#lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.userId = null;
	event.locals.schoolId = null;
	event.locals.isPlatformAdmin = false;
	event.locals.roleKey = null;
	event.locals.fullName = null;
	event.locals.permissions = [];

	const token = event.cookies.get(SESSION_COOKIE);
	if (!token || !DATABASE_URL) return resolve(event);

	try {
		const db = getDb();
		const session = await readSession(db, token);
		if (!session) {
			clearSessionCookie(event.cookies);
			return resolve(event);
		}
		event.locals.userId = session.userId;
		event.locals.fullName = session.fullName;
		event.locals.isPlatformAdmin = session.isPlatformAdmin;
		if (session.schoolId && !session.isPlatformAdmin) {
			const schools = await accountSchools(db, token);
			const current = schools.find(
				(school) =>
					school.schoolId === session.schoolId &&
					school.schoolStatus === 'active' &&
					school.membershipStatus === 'active'
			);
			if (current) {
				event.locals.schoolId = current.schoolId;
				event.locals.roleKey = current.roleKey;
				event.locals.permissions = await permissionsFor(db, token, current.schoolId);
			}
		}
	} catch {
		clearSessionCookie(event.cookies);
	}

	return resolve(event);
};
