import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db';
import {
	feeDesk,
	issueInvoice,
	recordOfflinePayment,
	saveFeePlan
} from '#lib/server/finance/ledger';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const allowed =
		locals.permissions.includes('fees.configure') ||
		locals.permissions.includes('payments.record') ||
		locals.permissions.includes('school.fees.manage');
	if (!allowed) error(403, 'Fees are not available.');
	return feeDesk(getDb(), locals.userId!, locals.schoolId!);
};

export const actions: Actions = {
	plan: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await saveFeePlan(getDb(), locals.userId!, locals.schoolId!, {
				sessionId: String(form.get('sessionId') ?? ''),
				name: String(form.get('name') ?? ''),
				amountPaise: Number(form.get('amountPaise') ?? 0),
				category: String(form.get('category') ?? 'tuition'),
				schedule: String(form.get('schedule') ?? 'annual'),
				classId: String(form.get('classId') ?? '') || null,
				lateKind: String(form.get('lateKind') ?? 'fixed'),
				lateFeePaise: Number(form.get('lateFeePaise') ?? 0),
				latePercent: Number(form.get('latePercent') ?? 0),
				graceDays: Number(form.get('graceDays') ?? 0),
				maxPaise: form.get('maxPaise') ? Number(form.get('maxPaise')) : null
			});
			return { saved: 'Fee plan saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	invoice: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await issueInvoice(getDb(), locals.userId!, locals.schoolId!, {
				studentId: String(form.get('studentId') ?? ''),
				feeStructureId: String(form.get('feeStructureId') ?? ''),
				periodLabel: String(form.get('periodLabel') ?? ''),
				dueOn: String(form.get('dueOn') ?? ''),
				concessionPaise: Number(form.get('concessionPaise') ?? 0),
				lines: [
					{
						label: String(form.get('label') ?? 'Fee'),
						amountPaise: Number(form.get('amountPaise') ?? 0)
					}
				]
			});
			return { saved: 'Invoice issued.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	payment: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await recordOfflinePayment(getDb(), locals.userId!, locals.schoolId!, {
				invoiceId: String(form.get('invoiceId') ?? ''),
				amountPaise: Number(form.get('amountPaise') ?? 0),
				reference: String(form.get('reference') ?? ''),
				asOf: String(form.get('asOf') ?? new Date().toISOString().slice(0, 10))
			});
			return { saved: 'Payment recorded.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
