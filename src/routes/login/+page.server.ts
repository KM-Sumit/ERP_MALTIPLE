import { fail, redirect } from '@sveltejs/kit';
import { setSessionCookie } from '#lib/server/auth/cookie';
import { completeMfa, login } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const messages = {
	invalid: 'Email or password is not correct.',
	locked: 'This account is temporarily locked. Try again in 15 minutes.',
	disabled: 'This account is disabled.',
	unverified: 'Accept the invitation before signing in.'
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.userId) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const db = getDb();
		const challenge = String(form.get('challenge') ?? '');
		if (challenge) {
			const result = await completeMfa(db, challenge, String(form.get('code') ?? ''));
			if (result.status !== 'session') return fail(400, { message: messages.invalid });
			setSessionCookie(cookies, result.token);
			redirect(303, '/');
		}
		const email = String(form.get('email') ?? '');
		const result = await login(db, email, String(form.get('password') ?? ''));
		if (result.status === 'mfa') return { challenge: result.challenge, email };
		if (result.status !== 'session') return fail(400, { message: messages[result.status] });
		setSessionCookie(cookies, result.token);
		redirect(303, '/');
	}
};
