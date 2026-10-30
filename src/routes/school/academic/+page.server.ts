import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import {
	academicCatalog,
	addAcademicStructure,
	addSessionStudent,
	addSessionTimetable,
	updateAcademicSession
} from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import { storeUpload } from '#lib/server/storage/upload';
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
	structure: async ({ request, locals }) => {
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
		} catch (cause) {
			return actionError(cause);
		}
	},
	session: async ({ request, locals }) => {
		const form = await request.formData();
		const sessionId = String(form.get('sessionId') ?? '');
		try {
			await updateAcademicSession(getDb(), locals.userId!, locals.schoolId!, {
				sessionId,
				name: String(form.get('sessionName') ?? ''),
				startDate: String(form.get('startDate') ?? ''),
				endDate: String(form.get('endDate') ?? ''),
				status: String(form.get('status') ?? '')
			});
			return { saved: 'Session updated.', sessionId };
		} catch (cause) {
			return actionError(cause);
		}
	},
	student: async ({ request, locals }) => {
		const form = await request.formData();
		const sessionId = String(form.get('sessionId') ?? '');
		try {
			const token = await addSessionStudent(getDb(), locals.userId!, locals.schoolId!, {
				sessionId,
				sectionId: String(form.get('sectionId') ?? ''),
				admissionNo: String(form.get('admissionNo') ?? ''),
				firstName: String(form.get('firstName') ?? ''),
				lastName: String(form.get('lastName') ?? ''),
				email: String(form.get('email') ?? '')
			});
			return {
				saved: 'Student added to this session.',
				sessionId,
				studentInvitePath: `/invite/${token}`
			};
		} catch (cause) {
			return actionError(cause);
		}
	},
	timetable: async ({ request, locals }) => {
		const form = await request.formData();
		const sessionId = String(form.get('sessionId') ?? '');
		const file = form.get('timetable');
		try {
			if (!(file instanceof File) || file.size === 0) {
				throw new AuthError('Choose a timetable file.');
			}
			const stored = await storeUpload(getDb(), locals.userId!, locals.schoolId!, {
				bytes: Buffer.from(await file.arrayBuffer()),
				claimedMime: file.type,
				purpose: 'document'
			});
			await addSessionTimetable(getDb(), locals.userId!, locals.schoolId!, {
				sessionId,
				fileId: stored.id
			});
			return { saved: 'Timetable uploaded.', sessionId };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
