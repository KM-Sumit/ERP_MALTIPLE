import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import {
	schoolHome,
	saveOnboardingStep,
	ONBOARDING_STEPS,
	type OnboardingStep
} from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.permissions.includes('school.settings.manage'))
		error(403, 'School setup is not available.');
	const home = await schoolHome(getDb(), locals.userId!, locals.schoolId!);
	return { home, steps: ONBOARDING_STEPS };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const step = String(form.get('step') ?? '');
		if (!ONBOARDING_STEPS.includes(step as OnboardingStep)) {
			return actionError(new AuthError('That setup step is not available.'));
		}
		const fields = Object.fromEntries(
			[...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string')
		);
		try {
			await saveOnboardingStep(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				step as OnboardingStep,
				fields
			);
			return { saved: 'Progress saved. You can leave and resume this step later.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
