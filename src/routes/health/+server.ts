import { sql } from 'drizzle-orm';
import { getDb } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await getDb().execute(sql`select 1 as ok`);
		return new Response(JSON.stringify({ ok: true }), {
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
		});
	} catch {
		return new Response(JSON.stringify({ ok: false }), {
			status: 503,
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
		});
	}
};
