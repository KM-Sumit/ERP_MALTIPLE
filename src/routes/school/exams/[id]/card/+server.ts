import { error } from '@sveltejs/kit';
import { reportCardPdf } from '#lib/server/academics/exams';
import { getDb } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.userId || !locals.schoolId) error(401, 'Sign in required');
	const cardId = url.searchParams.get('card') ?? '';
	try {
		const pdf = await reportCardPdf(getDb(), locals.userId, locals.schoolId, cardId, false);
		return new Response(pdf, {
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': 'inline; filename="report-card.pdf"'
			}
		});
	} catch {
		error(403, 'Forbidden');
	}
};
