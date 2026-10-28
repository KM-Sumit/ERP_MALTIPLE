import { notifications } from '../db/schema';
import type { TenantTx } from '../db/tenant';

export async function createNotification(
	tx: TenantTx,
	input: { schoolId: string; userId: string; title: string; body: string; eventKey?: string }
) {
	await tx.insert(notifications).values(input).onConflictDoNothing();
}
