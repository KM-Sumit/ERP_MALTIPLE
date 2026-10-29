import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { studentComplaints } from '#lib/server/academics/student-desk';
import { raiseComplaint } from '#lib/server/schools/service';
import { storeUpload } from '#lib/server/storage/upload';
import { actionError } from '#lib/server/http/action';
import { getDb } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		return studentComplaints(
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
	default: async ({ request, locals }) => {
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
	}
};
