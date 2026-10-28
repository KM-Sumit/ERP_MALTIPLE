import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { isRlsDenial, TenantAccessError } from '../authz/errors';
import type * as schema from './schema';

export type AppDb = PostgresJsDatabase<typeof schema>;
export type TenantTx = Parameters<Parameters<AppDb['transaction']>[0]>[0];

function assertUuid(value: string, label: string) {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
		throw new TenantAccessError(`invalid ${label}`);
	}
}

async function flag(tx: TenantTx, query: ReturnType<typeof sql>): Promise<boolean> {
	const rows = await tx.execute(query);
	const first = rows[0] as { ok?: boolean } | undefined;
	return first?.ok === true;
}

/**
 * Opens a transaction, pins the session user for RLS, and rejects the school
 * when that user has no active membership. The school id is never taken from
 * an unchecked request parameter; callers pass the value from bindSchoolRequest.
 * set_config is transaction-local so a pooled connection cannot leak tenant state.
 */
export async function withSchoolUser<T>(
	db: AppDb,
	userId: string,
	schoolId: string,
	fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
	assertUuid(userId, 'user');
	assertUuid(schoolId, 'school');
	await assertAppRole(db);
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
		await tx.execute(sql`select set_config('app.school_id', ${schoolId}, true)`);
		const allowed = await flag(tx, sql`select app.can_access_school(${schoolId}::uuid) as ok`);
		if (!allowed) throw new TenantAccessError('cross-school access denied');
		try {
			return await fn(tx);
		} catch (error) {
			if (isRlsDenial(error)) throw new TenantAccessError('cross-school access denied');
			throw error;
		}
	});
}

export async function withUser<T>(
	db: AppDb,
	userId: string,
	fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
	assertUuid(userId, 'user');
	await assertAppRole(db);
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
		await tx.execute(sql`select set_config('app.school_id', '', true)`);
		try {
			return await fn(tx);
		} catch (error) {
			if (isRlsDenial(error)) throw new TenantAccessError('account access denied');
			throw error;
		}
	});
}

export async function withPlatformAdmin<T>(
	db: AppDb,
	userId: string,
	fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
	assertUuid(userId, 'user');
	await assertAppRole(db);
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
		await tx.execute(sql`select set_config('app.school_id', '', true)`);
		const allowed = await flag(tx, sql`select app.is_platform_admin() as ok`);
		if (!allowed) throw new TenantAccessError('platform access denied');
		try {
			return await fn(tx);
		} catch (error) {
			if (isRlsDenial(error)) throw new TenantAccessError('platform access denied');
			throw error;
		}
	});
}

export async function assertAppRole(db: AppDb): Promise<void> {
	const rows = await db.execute(
		sql`select rolsuper as superuser, rolbypassrls as bypass from pg_roles where rolname = current_user`
	);
	const row = rows[0] as { superuser?: boolean; bypass?: boolean } | undefined;
	if (!row || row.superuser || row.bypass) {
		throw new Error(
			'DATABASE_URL must use the non-superuser erp_app role so row-level security applies'
		);
	}
}
