import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { and, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db';
import { sections, subjects } from '#lib/server/db/schema';
import { withSchoolUser } from '#lib/server/db/tenant';
import { actionError } from '#lib/server/http/action';
import { addChapter, publishCourse, publishMaterial } from '#lib/server/workflows/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (
		!locals.permissions.includes('classes.manage') &&
		!locals.permissions.includes('school.teaching.write') &&
		!locals.permissions.includes('school.records.manage')
	) {
		error(403, 'Courses are not available.');
	}
	return withSchoolUser(getDb(), locals.userId!, locals.schoolId!, async (tx) => ({
		sections: await tx.select().from(sections).where(eq(sections.schoolId, locals.schoolId!)),
		subjects: await tx
			.select()
			.from(subjects)
			.where(and(eq(subjects.schoolId, locals.schoolId!)))
	}));
};

export const actions: Actions = {
	course: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await publishCourse(getDb(), locals.userId!, locals.schoolId!, {
				title: String(form.get('title') ?? ''),
				sectionId: String(form.get('sectionId') ?? ''),
				subjectId: String(form.get('subjectId') ?? '')
			});
			return { saved: 'Course published.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	chapter: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await addChapter(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				String(form.get('courseId') ?? ''),
				String(form.get('title') ?? ''),
				Number(form.get('sortOrder') ?? 1)
			);
			return { saved: 'Chapter added.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	material: async ({ request, locals }) => {
		const form = await request.formData();
		const kind = String(form.get('kind') ?? 'note');
		if (kind !== 'note' && kind !== 'pdf' && kind !== 'video' && kind !== 'link') {
			return actionError(new AuthError('Choose a material kind.'));
		}
		try {
			await publishMaterial(getDb(), locals.userId!, locals.schoolId!, {
				courseId: String(form.get('courseId') ?? ''),
				title: String(form.get('title') ?? ''),
				kind,
				externalUrl: String(form.get('externalUrl') ?? '') || null
			});
			return { saved: 'Material published.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
