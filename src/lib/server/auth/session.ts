import { sql } from 'drizzle-orm';
import type { AppDb } from '../db/tenant';
import { hashToken } from './password';

export const SESSION_COOKIE = 'erp_session';
export const SESSION_MS = 12 * 60 * 60 * 1000;

type Row = Record<string, unknown>;

export function rowsOf(result: unknown): Row[] {
	return Array.isArray(result) ? (result as Row[]) : [];
}

export function textArray(value: unknown): string[] {
	return Array.isArray(value) ? value.map(String) : [];
}

export type SessionRecord = {
	sessionId: string;
	userId: string;
	schoolId: string | null;
	fullName: string;
	isPlatformAdmin: boolean;
	roleKey: string | null;
};

export async function readSession(db: AppDb, token: string): Promise<SessionRecord | null> {
	const result = await db.execute(sql`select * from app.session_from_token(${hashToken(token)})`);
	const row = rowsOf(result)[0];
	if (!row?.user_id) return null;
	return {
		sessionId: String(row.session_id),
		userId: String(row.user_id),
		schoolId: row.school_id ? String(row.school_id) : null,
		fullName: String(row.full_name),
		isPlatformAdmin: row.is_platform_admin === true,
		roleKey: row.role_key ? String(row.role_key) : null
	};
}

export async function permissionsFor(db: AppDb, token: string, schoolId: string) {
	const result = await db.execute(
		sql`select app.permissions_for(${hashToken(token)}, ${schoolId}::uuid) as keys`
	);
	return textArray(rowsOf(result)[0]?.keys);
}

export type AccountSchool = {
	schoolId: string;
	schoolName: string;
	schoolCode: string;
	schoolStatus: string;
	roleKey: string;
	membershipStatus: string;
};

export async function accountSchools(db: AppDb, token: string): Promise<AccountSchool[]> {
	const result = await db.execute(sql`select * from app.account_schools(${hashToken(token)})`);
	return rowsOf(result).map((row) => ({
		schoolId: String(row.school_id),
		schoolName: String(row.school_name),
		schoolCode: String(row.school_code),
		schoolStatus: String(row.school_status),
		roleKey: String(row.role_key),
		membershipStatus: String(row.membership_status)
	}));
}

export async function revokeToken(db: AppDb, token: string) {
	await db.execute(sql`select app.revoke_session(${hashToken(token)})`);
}
