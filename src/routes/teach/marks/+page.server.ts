import { examBoard, saveMark, submitMarks } from '#lib/server/academics/exams';
import { teacherDesk } from '#lib/server/schools/service';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [desk, board] = await Promise.all([
		teacherDesk(getDb(), locals.userId ?? '', locals.schoolId ?? ''),
		examBoard(getDb(), locals.userId ?? '', locals.schoolId ?? '')
	]);
	return { ...desk, exams: board.exams, subjects: board.subjects };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const form = await request.formData();
		const outcome = String(form.get('outcome') ?? 'scored');
		const numberOrNull = (name: string) => {
			const value = String(form.get(name) ?? '');
			if (value === '') return null;
			return Number(value);
		};
		try {
			await saveMark(getDb(), locals.userId ?? '', locals.schoolId ?? '', {
				examId: String(form.get('examId') ?? ''),
				studentId: String(form.get('studentId') ?? ''),
				subjectId: String(form.get('subjectId') ?? ''),
				outcome:
					outcome === 'absent' || outcome === 'exempt' || outcome === 'not_assessed'
						? outcome
						: 'scored',
				marksObtained: numberOrNull('marksObtained'),
				maxMarks: numberOrNull('maxMarks'),
				theoryObtained: numberOrNull('theoryObtained'),
				theoryMax: numberOrNull('theoryMax'),
				practicalObtained: numberOrNull('practicalObtained'),
				practicalMax: numberOrNull('practicalMax'),
				internalObtained: numberOrNull('internalObtained'),
				internalMax: numberOrNull('internalMax'),
				remark: String(form.get('remark') ?? '') || null
			});
			return { saved: 'Mark saved as a draft. Submit when the set is complete.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	submit: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await submitMarks(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('examId') ?? ''),
				String(form.get('subjectId') ?? '')
			);
			return {
				saved: 'Marks submitted for review. Publication stays with an authorized reviewer.'
			};
		} catch (cause) {
			return actionError(cause);
		}
	}
};
