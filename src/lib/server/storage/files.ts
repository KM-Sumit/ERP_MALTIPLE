import { TenantAccessError } from '../authz/errors';
import { getStoredFile } from '../repositories/records';
import type { TenantTx } from '../db/tenant';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildStorageKey(schoolId: string, fileId: string): string {
	if (!uuidPattern.test(schoolId) || !uuidPattern.test(fileId)) {
		throw new TenantAccessError('invalid file location');
	}
	return `schools/${schoolId}/files/${fileId}`;
}

export function resolveStoragePath(storageRoot: string, storageKey: string): string {
	if (
		storageKey.includes('..') ||
		storageKey.startsWith('/') ||
		!storageKey.startsWith('schools/')
	) {
		throw new TenantAccessError('invalid file location');
	}
	return `${storageRoot.replace(/\/$/, '')}/${storageKey}`;
}

export async function authorizeStoredFile(tx: TenantTx, schoolId: string, fileId: string) {
	const row = await getStoredFile(tx, schoolId, fileId);
	const expected = buildStorageKey(schoolId, fileId);
	if (row.storageKey !== expected)
		throw new TenantAccessError('file is not available in this school');
	return row;
}
