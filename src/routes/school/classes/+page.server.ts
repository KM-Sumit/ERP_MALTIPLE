import { AuthError } from '#lib/server/auth/service';
import {
	addClassCourse,
	addClassStudent,
	addClassTimetable,
	addSchoolClass,
	classBoard,
	publishNotice,
	schoolHome
} from '#lib/server/schools/service';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import { storeUpload } from '#lib/server/storage/upload';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [home, board] = await Promise.all([
		schoolHome(getDb(), locals.userId!, locals.schoolId!),
		classBoard(getDb(), locals.userId!, locals.schoolId!)
	]);
	return { ...home, ...board };
};

export const actions: Actions = {
	class: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const created = await addSchoolClass(getDb(), locals.userId!, locals.schoolId!, {
				name: String(form.get('name') ?? ''),
				feeRupees: String(form.get('feeRupees') ?? ''),
				teacherEmail: String(form.get('teacherEmail') ?? ''),
				sessionId: String(form.get('sessionId') ?? ''),
				sessionName: String(form.get('sessionName') ?? '')
			});
			return {
				saved: `Class added in ${created.sessionName}. Section ${created.sectionName} is ready.`,
				sessionId: created.sessionId,
				classId: created.classId,
				invitePath: created.token ? `/invite/${created.token}` : undefined
			};
		} catch (cause) {
			return actionError(cause);
		}
	},
	student: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '');
		try {
			const token = await addClassStudent(getDb(), locals.userId!, locals.schoolId!, {
				classId,
				admissionNo: String(form.get('admissionNo') ?? ''),
				firstName: String(form.get('firstName') ?? ''),
				lastName: String(form.get('lastName') ?? ''),
				email: String(form.get('email') ?? '')
			});
			return { saved: 'Student added.', classId, studentInvitePath: `/invite/${token}` };
		} catch (cause) {
			return actionError(cause);
		}
	},
	timetable: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '');
		const file = form.get('timetable');
		try {
			if (!(file instanceof File) || file.size === 0) throw new AuthError('Choose a timetable file.');
			const stored = await storeUpload(getDb(), locals.userId!, locals.schoolId!, {
				bytes: Buffer.from(await file.arrayBuffer()),
				claimedMime: file.type,
				purpose: 'document'
			});
			await addClassTimetable(getDb(), locals.userId!, locals.schoolId!, {
				classId,
				fileId: stored.id
			});
			return { saved: 'Timetable uploaded.', classId };
		} catch (cause) {
			return actionError(cause);
		}
	},
	course: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '');
		const file = form.get('course');
		try {
			if (!(file instanceof File) || file.size === 0) throw new AuthError('Choose a course file.');
			const stored = await storeUpload(getDb(), locals.userId!, locals.schoolId!, {
				bytes: Buffer.from(await file.arrayBuffer()),
				claimedMime: file.type,
				purpose: 'document'
			});
			await addClassCourse(getDb(), locals.userId!, locals.schoolId!, {
				classId,
				title: file.name.replace(/\.[^.]+$/, '') || 'Course',
				fileId: stored.id,
				kind: stored.mimeType === 'application/pdf' ? 'pdf' : 'note'
			});
			return { saved: 'Course uploaded.', classId };
		} catch (cause) {
			return actionError(cause);
		}
	},
	news: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await publishNotice(
				getDb(),
				locals.userId!,
				locals.schoolId!,
				String(form.get('title') ?? ''),
				String(form.get('body') ?? '')
			);
			return { saved: 'School news published.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
