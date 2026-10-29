import { error } from '@sveltejs/kit';
import { teacherRoster } from '#lib/server/schools/directory';
import { ASSIGNABLE_PERMISSIONS } from '#lib/permissions';
import {
	assignManagerPermissions,
	inviteStaff,
	listStaff,
	setMembershipStatus
} from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const allowed = ['users.manage', 'school.members.manage', 'roles.assign'];
	if (!allowed.some((key) => locals.permissions.includes(key)))
		error(403, 'Staff management is not available.');
	const [staff, teachers] = await Promise.all([
		listStaff(getDb(), locals.userId!, locals.schoolId!),
		teacherRoster(getDb(), locals.userId!, locals.schoolId!)
	]);
	return { ...staff, teachers, permissions: ASSIGNABLE_PERMISSIONS };
};

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const token = await inviteStaff(getDb(), locals.userId!, locals.schoolId!, {
				email: String(form.get('email') ?? ''),
				fullName: String(form.get('fullName') ?? ''),
				roleKey: String(form.get('roleKey') ?? '')
			});
			return { invitePath: `/invite/${token}` };
		} catch (error) {
			return actionError(error);
		}
	},
	permissions: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await assignManagerPermissions(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				String(form.get('membershipId') ?? ''),
				form.getAll('permission').map(String)
			);
			return { saved: 'Permissions updated.' };
		} catch (error) {
			return actionError(error);
		}
	},
	status: async ({ request, locals }) => {
		const form = await request.formData();
		const status = String(form.get('status') ?? '');
		if (status !== 'active' && status !== 'suspended') return actionError(new Error('status'));
		try {
			await setMembershipStatus(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				String(form.get('membershipId') ?? ''),
				status
			);
			return { saved: 'Membership updated. Suspended accounts lose their sessions.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
