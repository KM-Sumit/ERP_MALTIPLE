import { and, eq, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { rowsOf } from '../auth/session';
import { guardianStudents } from '../db/schema';
import type { TenantTx } from '../db/tenant';
import { TenantAccessError } from '../authz/errors';

export function clean(value: unknown) {
	return String(value ?? '').trim();
}

export async function allow(tx: TenantTx, schoolId: string, keys: string[]) {
	if (keys.some((key) => !/^[a-z0-9.]+$/.test(key))) throw new AuthError('Unknown permission.');
	const result = await tx.execute(
		sql`select app.has_any_permission(${schoolId}::uuid, ${`{${keys.join(',')}}`}::text[]) as ok`
	);
	if (rowsOf(result)[0]?.ok !== true) throw new TenantAccessError('permission denied');
}

export async function linkedStudent(
	tx: TenantTx,
	schoolId: string,
	userId: string,
	studentId: string
) {
	const link = await tx
		.select()
		.from(guardianStudents)
		.where(
			and(
				eq(guardianStudents.schoolId, schoolId),
				eq(guardianStudents.guardianUserId, userId),
				eq(guardianStudents.studentId, studentId)
			)
		);
	if (link.length === 0) throw new TenantAccessError('permission denied');
}
