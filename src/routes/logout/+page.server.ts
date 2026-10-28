import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '#lib/server/auth/cookie';
import { revokeToken, SESSION_COOKIE } from '#lib/server/auth/session';
import { getDb } from '#lib/server/db';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			try {
				await revokeToken(getDb(), token);
			} catch {
				// Clearing the cookie still ends the browser session.
			}
		}
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
};
