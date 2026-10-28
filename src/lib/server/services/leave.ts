import { and, eq } from 'drizzle-orm';
import { TenantAccessError } from '../authz/errors';
import { assertStatusTransition } from '../domain/transitions';
import { leaveApplications } from '../db/schema';
import type { TenantTx } from '../db/tenant';

export async function updateLeaveStatus(
	tx: TenantTx,
	input: { schoolId: string; leaveId: string; to: 'approved' | 'rejected' | 'cancelled' }
) {
	const rows = await tx
		.select()
		.from(leaveApplications)
		.where(
			and(eq(leaveApplications.id, input.leaveId), eq(leaveApplications.schoolId, input.schoolId))
		);
	const current = rows[0];
	if (!current) return null;
	assertStatusTransition('leave', current.status, input.to);
	const updated = await tx
		.update(leaveApplications)
		.set({ status: input.to })
		.where(
			and(eq(leaveApplications.id, input.leaveId), eq(leaveApplications.schoolId, input.schoolId))
		)
		.returning({ id: leaveApplications.id });
	if (updated.length === 0) throw new TenantAccessError('cross-school access denied');
	return input.to;
}
