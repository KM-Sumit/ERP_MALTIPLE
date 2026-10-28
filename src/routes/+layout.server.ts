import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.userId
			? {
					fullName: locals.fullName,
					isPlatformAdmin: locals.isPlatformAdmin,
					schoolId: locals.schoolId,
					roleKey: locals.roleKey,
					permissions: locals.permissions
				}
			: null
	};
};
