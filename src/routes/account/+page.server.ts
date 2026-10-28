import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '#lib/server/auth/cookie';
import {
	changePassword,
	confirmTotp,
	signOutEverywhere,
	startTotp
} from '#lib/server/auth/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	const home = locals.isPlatformAdmin
		? '/admin'
		: locals.roleKey === 'parent'
			? '/family'
			: locals.roleKey === 'teacher'
				? '/teach'
				: '/school';
	return {
		fullName: locals.fullName,
		home,
		privileged:
			locals.isPlatformAdmin ||
			locals.roleKey === 'school_admin' ||
			locals.roleKey === 'manager_admin'
	};
};

export const actions: Actions = {
	password: async ({ request, locals, cookies }) => {
		if (!locals.userId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await changePassword(
				getDb(),
				locals.userId,
				String(form.get('current') ?? ''),
				String(form.get('next') ?? '')
			);
			clearSessionCookie(cookies);
		} catch (error) {
			return actionError(error);
		}
		redirect(303, '/login');
	},
	revoke: async ({ locals, cookies }) => {
		if (!locals.userId) redirect(303, '/login');
		await signOutEverywhere(getDb(), locals.userId);
		clearSessionCookie(cookies);
		redirect(303, '/login');
	},
	totp: async ({ locals }) => {
		if (!locals.userId) redirect(303, '/login');
		try {
			const uri = await startTotp(getDb(), locals.userId, locals.roleKey, locals.isPlatformAdmin);
			return { uri };
		} catch (error) {
			return actionError(error);
		}
	},
	confirm: async ({ request, locals }) => {
		if (!locals.userId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await confirmTotp(getDb(), locals.userId, String(form.get('code') ?? ''));
			return { saved: 'Multi-factor authentication is on. The next login will ask for a code.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
