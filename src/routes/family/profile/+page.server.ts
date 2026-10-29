import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { AuthError } from '#lib/server/auth/service';
import { studentHome } from '#lib/server/academics/student-desk';
import { getDb } from '#lib/server/db';
import { users } from '#lib/server/db/schema';
import { withSchoolUser } from '#lib/server/db/tenant';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		const home = await studentHome(
			getDb(),
			locals.userId ?? '',
			locals.schoolId ?? '',
			url.searchParams.get('student')
		);
		const [user] = await withSchoolUser(getDb(), locals.userId ?? '', locals.schoolId ?? '', (tx) =>
			tx.select({ email: users.email }).from(users).where(eq(users.id, locals.userId ?? ''))
		);
		return { ...home, email: user?.email ?? '' };
	} catch (cause) {
		if (cause instanceof AuthError) error(403, 'Forbidden');
		throw cause;
	}
};
