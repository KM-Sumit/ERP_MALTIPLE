import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { rowsOf } from '../auth/session';
import { storedFiles } from '../db/schema';
import { withSchoolUser, type AppDb } from '../db/tenant';
import { buildStorageKey, resolveStoragePath } from './files';
import { TenantAccessError } from '../authz/errors';

const MAX_BYTES = 5_000_000;

const allowed = [
	{
		mime: 'image/jpeg',
		purpose: 'complaint_photo',
		test: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8
	},
	{
		mime: 'image/png',
		purpose: 'complaint_photo',
		test: (bytes: Buffer) => bytes.subarray(0, 4).toString('hex') === '89504e47'
	},
	{
		mime: 'application/pdf',
		purpose: 'document',
		test: (bytes: Buffer) => bytes.subarray(0, 4).toString() === '%PDF'
	},
	{
		mime: 'audio/webm',
		purpose: 'complaint_voice',
		test: (bytes: Buffer) => bytes[0] === 0x1a && bytes[1] === 0x45
	},
	{
		mime: 'audio/wav',
		purpose: 'complaint_voice',
		test: (bytes: Buffer) => bytes.subarray(0, 4).toString() === 'RIFF'
	}
] as const;

export function inspectUpload(bytes: Buffer, claimedMime = '') {
	if (bytes.length === 0 || bytes.length > MAX_BYTES)
		throw new AuthError('That file is empty or too large.');
	const match = allowed.find((kind) => kind.test(bytes));
	if (!match) throw new AuthError('That file type is not allowed.');
	if (claimedMime && claimedMime !== 'application/octet-stream' && claimedMime !== match.mime) {
		throw new AuthError('That file type is not allowed.');
	}
	return match;
}

export async function storeUpload(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { bytes: Buffer; claimedMime: string; purpose?: string }
) {
	const kind = inspectUpload(input.bytes, input.claimedMime);
	const purpose = input.purpose ?? kind.purpose;
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const recent = await tx.execute(sql`
			select count(*)::int as count from stored_files
			where school_id = ${schoolId}::uuid and uploaded_by = ${userId}::uuid
				and created_at > now() - interval '1 hour' and deleted_at is null
		`);
		if (Number(rowsOf(recent)[0]?.count ?? 0) >= 20)
			throw new AuthError('Upload limit reached. Try again later.');
		const id = randomUUID();
		const storageKey = buildStorageKey(schoolId, id);
		const root = process.env.FILE_STORAGE_PATH || `${process.cwd()}/.local/uploads`;
		const path = resolveStoragePath(root, storageKey);
		await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
		await writeFile(path, input.bytes);
		await tx.insert(storedFiles).values({
			id,
			schoolId,
			storageKey,
			mimeType: kind.mime,
			byteSize: input.bytes.length,
			purpose,
			uploadedBy: userId
		});
		return { id, mimeType: kind.mime };
	});
}

export async function readOwnedFile(db: AppDb, userId: string, schoolId: string, fileId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const [file] = await tx
			.select()
			.from(storedFiles)
			.where(and(eq(storedFiles.id, fileId), eq(storedFiles.schoolId, schoolId)));
		if (!file || file.deletedAt) throw new AuthError('That file is not available.');
		if (file.storageKey !== buildStorageKey(schoolId, fileId)) {
			throw new TenantAccessError('file is not available in this school');
		}
		const root = process.env.FILE_STORAGE_PATH || `${process.cwd()}/.local/uploads`;
		return { path: resolveStoragePath(root, file.storageKey), mimeType: file.mimeType };
	});
}
