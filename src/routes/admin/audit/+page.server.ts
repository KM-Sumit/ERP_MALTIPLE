import { listPlatformAudit } from '#lib/server/schools/service';
import { getDb } from '#lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { events: await listPlatformAudit(getDb(), locals.userId!) };
};
