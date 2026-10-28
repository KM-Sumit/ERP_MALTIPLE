import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import {
	parentHome,
	requestDocument,
	setNotificationPreference
} from '#lib/server/academics/portals';
import { startOnlinePayment } from '#lib/server/finance/ledger';
import { raiseComplaint } from '#lib/server/schools/service';
import { storeUpload } from '#lib/server/storage/upload';
import { getDb } from '#lib/server/db';
import { actionError } from '#lib/server/http/action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const student = url.searchParams.get('student');
	try {
		return await parentHome(getDb(), locals.userId ?? '', locals.schoolId ?? '', student);
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};

export const actions: Actions = {
	complaint: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const files: { id: string; kind: 'voice' | 'photo' | 'document' }[] = [];
			for (const [field, kind] of [
				['photo', 'photo'],
				['voice', 'voice'],
				['document', 'document']
			] as const) {
				const entry = form.get(field);
				if (!(entry instanceof File) || entry.size === 0) continue;
				const stored = await storeUpload(getDb(), locals.userId ?? '', locals.schoolId ?? '', {
					bytes: Buffer.from(await entry.arrayBuffer()),
					claimedMime: entry.type
				});
				files.push({ id: stored.id, kind });
			}
			await raiseComplaint(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('studentId') ?? ''),
				String(form.get('subject') ?? ''),
				String(form.get('body') ?? ''),
				{
					category: String(form.get('category') ?? 'general'),
					priority: String(form.get('priority') ?? 'normal'),
					files
				}
			);
			return { saved: 'Complaint submitted.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	document: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await requestDocument(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('studentId') ?? ''),
				String(form.get('docType') ?? '')
			);
			return { saved: 'Document request submitted.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	pay: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const pending = await startOnlinePayment(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('invoiceId') ?? ''),
				Number(form.get('amountPaise') ?? 0)
			);
			return {
				saved: `Payment ${pending.orderId} is pending until the gateway confirms it.`
			};
		} catch (cause) {
			return actionError(cause);
		}
	},
	preference: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await setNotificationPreference(
				getDb(),
				locals.userId ?? '',
				locals.schoolId ?? '',
				String(form.get('kind') ?? ''),
				form.get('enabled') === 'on'
			);
			return { saved: 'Notification preference saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	}
};
