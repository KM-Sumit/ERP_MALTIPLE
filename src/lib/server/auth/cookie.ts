import { dev } from '$app/env';
import type { Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE, SESSION_MS } from './session';

const options = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev
};

export function setSessionCookie(cookies: Cookies, token: string) {
	cookies.set(SESSION_COOKIE, token, { ...options, maxAge: SESSION_MS / 1000 });
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
