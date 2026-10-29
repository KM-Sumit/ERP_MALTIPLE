import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { studentFees } from '#lib/server/academics/student-desk';
import { startOnlinePayment } from '#lib/server/finance/ledger';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		return studentFees(
			getDb(),
			locals.userId ?? '',
			locals.schoolId ?? '',
			url.searchParams.get('student')
		);
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};

export const actions: Actions = {
	pay: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const rupees = Number(form.get('amountRupees') ?? 0);
			const pending = await startOnlinePayment(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('invoiceId') ?? ''),
				Math.round(rupees * 100)
			);
			return { saved: `Payment ${pending.orderId} is pending until the gateway confirms it.` };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
