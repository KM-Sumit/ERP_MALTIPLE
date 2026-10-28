import { error } from '@sveltejs/kit';
import { AuthError } from '#lib/server/auth/service';
import { getDb } from '#lib/server/db';
import { paymentReceipt } from '#lib/server/finance/ledger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.userId || !locals.schoolId) error(401, 'Sign in required.');
	try {
		const pdf = await paymentReceipt(getDb(), locals.userId, locals.schoolId, params.id);
		return new Response(Buffer.from(pdf), {
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': 'attachment; filename="receipt.pdf"',
				'x-content-type-options': 'nosniff'
			}
		});
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};
