import { auditEvents } from '../db/schema';
import type { TenantTx } from '../db/tenant';

export async function writeAudit(
	tx: TenantTx,
	event: {
		schoolId: string | null;
		actorUserId: string;
		action: string;
		entityType: string;
		entityId?: string | null;
		metadata?: Record<string, unknown>;
	}
) {
	await tx.insert(auditEvents).values({
		schoolId: event.schoolId,
		actorUserId: event.actorUserId,
		action: event.action,
		entityType: event.entityType,
		entityId: event.entityId ?? null,
		metadata: event.metadata ?? {}
	});
}
