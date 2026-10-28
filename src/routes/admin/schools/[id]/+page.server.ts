import { error } from '@sveltejs/kit';
import {
	getSchoolAdminView,
	provisionSchoolAdmin,
	setSchoolLimits,
	setSchoolStatus
} from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const school = await getSchoolAdminView(getDb(), locals.userId!, params.id);
	if (!school) error(404, 'School not found.');
	return { school };
};

export const actions: Actions = {
	status: async ({ request, locals, params }) => {
		const form = await request.formData();
		const status = String(form.get('status') ?? '');
		if (status !== 'active' && status !== 'suspended' && status !== 'archived') {
			return actionError(new Error('unsupported'));
		}
		try {
			await setSchoolStatus(
				getDb(),
				locals.userId!,
				params.id,
				status,
				String(form.get('confirmation') ?? '')
			);
			return { saved: 'School status updated.' };
		} catch (caught) {
			return actionError(caught);
		}
	},
	admin: async ({ request, locals, params }) => {
		const form = await request.formData();
		try {
			const token = await provisionSchoolAdmin(
				getDb(),
				locals.userId!,
				params.id,
				String(form.get('email') ?? ''),
				String(form.get('fullName') ?? '')
			);
			return { invitePath: `/invite/${token}` };
		} catch (caught) {
			return actionError(caught);
		}
	},
	limits: async ({ request, locals, params }) => {
		const form = await request.formData();
		const raw = String(form.get('studentLimit') ?? '').trim();
		try {
			await setSchoolLimits(
				getDb(),
				locals.userId!,
				params.id,
				String(form.get('planKey') ?? ''),
				raw === '' ? null : Number(raw)
			);
			return { saved: 'Plan and student limit saved.' };
		} catch (caught) {
			return actionError(caught);
		}
	}
};
