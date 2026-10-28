import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db';
import { receiveCashfreeWebhook } from '#lib/server/finance/webhook';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const raw = await request.text();
	const result = await receiveCashfreeWebhook(getDb(), {
		secret: process.env.CASHFREE_SECRET_KEY,
		timestamp: request.headers.get('x-webhook-timestamp') ?? '',
		signature: request.headers.get('x-webhook-signature') ?? '',
		raw
	});
	if (result.status === 200) return json({ ok: true, duplicate: result.duplicate });
	return new Response(result.status === 503 ? 'unavailable' : 'rejected', {
		status: result.status
	});
};
