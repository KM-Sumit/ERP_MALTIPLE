import { withSchoolUser, type AppDb, type TenantTx } from '../db/tenant';

/**
 * In-process job runner. There is no separate worker service.
 * The job payload cannot widen access: RLS still checks the user id.
 */
export function runSchoolJob<T>(
	db: AppDb,
	job: { userId: string; schoolId: string; run: (tx: TenantTx) => Promise<T> }
): Promise<T> {
	return withSchoolUser(db, job.userId, job.schoolId, job.run);
}
