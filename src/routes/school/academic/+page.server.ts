import { error } from '@sveltejs/kit';
import { academicCatalog, addAcademicStructure } from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (
		!locals.permissions.includes('classes.manage') &&
		!locals.permissions.includes('school.records.manage')
	) {
		error(403, 'Academic setup is not available.');
	}
	return academicCatalog(getDb(), locals.userId!, locals.schoolId!);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await addAcademicStructure(getDb(), locals.userId!, locals.schoolId!, {
				sessionName: String(form.get('sessionName') ?? ''),
				startDate: String(form.get('startDate') ?? ''),
				endDate: String(form.get('endDate') ?? ''),
				className: String(form.get('className') ?? ''),
				gradeLevel: Number(form.get('gradeLevel') ?? ''),
				sectionName: String(form.get('sectionName') ?? ''),
				subjectName: String(form.get('subjectName') ?? ''),
				subjectCode: String(form.get('subjectCode') ?? '')
			});
			return { saved: 'Academic structure saved.' };
		} catch (error) {
			return actionError(error);
		}
	}
};
