import { error, redirect } from '@sveltejs/kit';
import { hasPermission } from '#lib/permissions';
import { AuthError } from '#lib/server/auth/service';
import {
	addExamSlot,
	approveResults,
	cancelExam,
	createExam,
	examBoard,
	publishExamSchedule,
	publishReportCards,
	reopenReportCard
} from '#lib/server/academics/exams';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.userId || !locals.schoolId) redirect(303, '/login');
	if (
		!hasPermission(locals.permissions, 'exams.manage') &&
		!hasPermission(locals.permissions, 'results.publish')
	) {
		error(403, 'Forbidden');
	}
	return examBoard(getDb(), locals.userId, locals.schoolId);
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		const maxMarks = Number(form.get('maxMarks') ?? '');
		const passingMarks = Number(form.get('passingMarks') ?? '');
		const duration = Number(form.get('durationMinutes') ?? '');
		try {
			await createExam(getDb(), locals.userId, locals.schoolId, {
				sessionId: String(form.get('sessionId') ?? ''),
				name: String(form.get('name') ?? ''),
				examType: String(form.get('examType') ?? 'custom'),
				instructions: String(form.get('instructions') ?? ''),
				maxMarks: Number.isFinite(maxMarks) && maxMarks > 0 ? maxMarks : null,
				passingMarks: Number.isFinite(passingMarks) ? passingMarks : null,
				durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : null
			});
			return { saved: 'Exam draft created.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	slot: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await addExamSlot(getDb(), locals.userId, locals.schoolId, {
				examId: String(form.get('examId') ?? ''),
				subjectId: String(form.get('subjectId') ?? ''),
				sectionId: String(form.get('sectionId') ?? ''),
				startsAt: String(form.get('startsAt') ?? ''),
				endsAt: String(form.get('endsAt') ?? ''),
				room: String(form.get('room') ?? '') || null,
				invigilatorUserId: String(form.get('invigilatorUserId') ?? '') || null,
				seatingPlan: String(form.get('seatingPlan') ?? '') || null
			});
			return { saved: 'Exam slot saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	publish: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await publishExamSchedule(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('examId') ?? '')
			);
			return { saved: 'Exam timetable published.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	cancel: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		if (form.get('confirm') !== 'cancel')
			return actionError(new AuthError('Type cancel to confirm.'));
		try {
			await cancelExam(getDb(), locals.userId, locals.schoolId, String(form.get('examId') ?? ''));
			return { saved: 'Exam cancelled. Affected users are notified when they allow exam notices.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	approve: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await approveResults(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('examId') ?? '')
			);
			return { saved: 'Submitted marks were approved into draft report cards.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	cards: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await publishReportCards(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('examId') ?? '')
			);
			return { saved: 'Report cards published to linked guardians.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	reopen: async ({ request, locals }) => {
		if (!locals.userId || !locals.schoolId) redirect(303, '/login');
		const form = await request.formData();
		try {
			await reopenReportCard(
				getDb(),
				locals.userId,
				locals.schoolId,
				String(form.get('cardId') ?? ''),
				String(form.get('remarks') ?? '')
			);
			return { saved: 'Report card reopened for correction.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
