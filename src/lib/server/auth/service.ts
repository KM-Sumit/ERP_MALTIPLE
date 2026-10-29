import { eq, sql } from 'drizzle-orm';
import { userSecrets, users } from '../db/schema';
import { withUser, type AppDb } from '../db/tenant';
import { generateTotpSecret, totpUri, verifyTotp } from './totp';
import {
	assertPassword,
	hashPassword,
	hashToken,
	newToken,
	verifyAgainstDummy,
	verifyPassword
} from './password';
import { accountSchools, rowsOf, SESSION_MS } from './session';

export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthError';
	}
}

export type LoginResult =
	| { status: 'session'; token: string }
	| { status: 'mfa'; challenge: string }
	| { status: 'invalid' | 'locked' | 'disabled' | 'unverified' };

type LoginRow = {
	user_id: string;
	password_hash: string | null;
	status: string;
	locked_until: Date | string | null;
	is_platform_admin: boolean;
	email_verified_at: Date | string | null;
	totp_enabled: boolean;
};

function locked(value: Date | string | null) {
	if (!value) return false;
	return new Date(value).getTime() > Date.now();
}

async function openSession(db: AppDb, userId: string) {
	const token = newToken();
	const expires = new Date(Date.now() + SESSION_MS).toISOString();
	await db.execute(sql`select app.record_login_success(${userId}::uuid)`);
	await db.execute(
		sql`select app.open_session(${userId}::uuid, null, ${hashToken(token)}, ${expires})`
	);
	const schools = await accountSchools(db, token);
	const active = schools.filter(
		(school) => school.schoolStatus === 'active' && school.membershipStatus === 'active'
	);
	if (active.length === 1) {
		await db.execute(
			sql`select app.set_session_school(${hashToken(token)}, ${active[0].schoolId}::uuid)`
		);
	}
	return token;
}

export async function login(db: AppDb, email: string, password: string): Promise<LoginResult> {
	const result = await db.execute(sql`select * from app.lookup_login(${email})`);
	const row = rowsOf(result)[0] as LoginRow | undefined;
	if (!row?.password_hash) {
		await verifyAgainstDummy(password);
		if (row && !row.email_verified_at) return { status: 'unverified' };
		return { status: 'invalid' };
	}
	const matches = await verifyPassword(password, row.password_hash);
	if (!matches) {
		await db.execute(sql`select app.record_login_failure(${row.user_id}::uuid)`);
		return { status: 'invalid' };
	}
	if (row.status !== 'active') return { status: 'disabled' };
	if (!row.email_verified_at) return { status: 'unverified' };
	if (locked(row.locked_until)) return { status: 'locked' };
	if (row.totp_enabled) {
		const challenge = newToken();
		const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
		await db.execute(
			sql`select app.issue_login_challenge(${row.user_id}::uuid, ${hashToken(challenge)}, ${expires})`
		);
		return { status: 'mfa', challenge };
	}
	return { status: 'session', token: await openSession(db, row.user_id) };
}

export async function completeMfa(
	db: AppDb,
	challenge: string,
	code: string
): Promise<LoginResult> {
	const result = await db.execute(
		sql`select * from app.consume_login_challenge(${hashToken(challenge)})`
	);
	const row = rowsOf(result)[0];
	if (!row?.user_id || !row.totp_secret || !verifyTotp(String(row.totp_secret), code)) {
		return { status: 'invalid' };
	}
	return { status: 'session', token: await openSession(db, String(row.user_id)) };
}

export async function requestPasswordReset(db: AppDb, email: string) {
	const token = newToken();
	const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
	const result = await db.execute(
		sql`select app.issue_password_reset(${email}, ${hashToken(token)}, ${expires}) as issued`
	);
	const issued = rowsOf(result)[0]?.issued === true;
	return { token: issued ? token : null };
}

export async function resetPassword(db: AppDb, token: string, password: string) {
	assertPassword(password);
	const passwordHash = await hashPassword(password);
	const result = await db.execute(
		sql`select app.consume_password_reset(${hashToken(token)}, ${passwordHash}) as user_id`
	);
	if (!rowsOf(result)[0]?.user_id) throw new AuthError('This reset link is invalid or expired.');
}

export async function platformAdminExists(db: AppDb) {
	const result = await db.execute(sql`select app.platform_admin_exists() as ok`);
	return rowsOf(result)[0]?.ok === true;
}

export async function bootstrapPlatformAdmin(
	db: AppDb,
	input: { email: string; fullName: string; password: string }
) {
	assertPassword(input.password);
	const passwordHash = await hashPassword(input.password);
	try {
		const result = await db.execute(
			sql`select app.bootstrap_platform_admin(${input.email}, ${input.fullName.trim()}, ${passwordHash}) as user_id`
		);
		const userId = rowsOf(result)[0]?.user_id;
		if (!userId) throw new AuthError('Platform setup is already complete.');
		return String(userId);
	} catch (error) {
		if (error instanceof AuthError) throw error;
		throw new AuthError('Platform setup is already complete.');
	}
}

export async function previewInvitation(db: AppDb, token: string) {
	const result = await db.execute(sql`select * from app.invitation_preview(${hashToken(token)})`);
	const row = rowsOf(result)[0];
	if (!row) return null;
	return {
		email: String(row.email),
		schoolName: String(row.school_name),
		roleKey: String(row.role_key),
		expiresAt: row.expires_at
	};
}

export async function acceptInvitation(
	db: AppDb,
	token: string,
	input: { fullName: string; password: string }
) {
	assertPassword(input.password);
	const passwordHash = await hashPassword(input.password);
	const result = await db.execute(
		sql`select app.accept_invitation(${hashToken(token)}, ${input.fullName.trim()}, ${passwordHash}) as user_id`
	);
	if (!rowsOf(result)[0]?.user_id) throw new AuthError('This invitation is invalid or expired.');
}

export async function changePassword(
	db: AppDb,
	userId: string,
	currentPassword: string,
	nextPassword: string
) {
	assertPassword(nextPassword);
	await withUser(db, userId, async (tx) => {
		const result = await tx.execute(
			sql`select password_hash from users where id = ${userId}::uuid`
		);
		const currentHash = rowsOf(result)[0]?.password_hash;
		if (!currentHash || !(await verifyPassword(currentPassword, String(currentHash)))) {
			throw new AuthError('Current password is not correct.');
		}
		await tx
			.update(users)
			.set({ passwordHash: await hashPassword(nextPassword) })
			.where(eq(users.id, userId));
		await tx.execute(sql`select app.revoke_user_sessions(${userId}::uuid)`);
	});
}

export async function signOutEverywhere(db: AppDb, userId: string) {
	await withUser(db, userId, (tx) =>
		tx.execute(sql`select app.revoke_user_sessions(${userId}::uuid)`)
	);
}

export async function selectSchool(db: AppDb, token: string, schoolId: string) {
	try {
		await db.execute(sql`select app.set_session_school(${hashToken(token)}, ${schoolId}::uuid)`);
	} catch {
		throw new AuthError('That school is not available for this account.');
	}
}

const privilegedRoles = new Set(['school_admin', 'manager_admin']);

export async function startTotp(
	db: AppDb,
	userId: string,
	roleKey: string | null,
	isPlatformAdmin: boolean
) {
	if (!isPlatformAdmin && !privilegedRoles.has(roleKey ?? '')) {
		throw new AuthError('Multi-factor authentication is available to administrators.');
	}
	const secret = generateTotpSecret();
	return withUser(db, userId, async (tx) => {
		const existing = await tx.execute(sql`select email from users where id = ${userId}::uuid`);
		const email = rowsOf(existing)[0]?.email;
		if (!email) throw new AuthError('This account has no email address.');
		await tx
			.insert(userSecrets)
			.values({ userId, totpSecret: secret, totpEnabled: false })
			.onConflictDoUpdate({
				target: userSecrets.userId,
				set: { totpSecret: secret, totpEnabled: false }
			});
		return totpUri(String(email), secret);
	});
}

export async function confirmTotp(db: AppDb, userId: string, code: string) {
	await withUser(db, userId, async (tx) => {
		const result = await tx.execute(
			sql`select totp_secret from user_secrets where user_id = ${userId}::uuid`
		);
		const secret = rowsOf(result)[0]?.totp_secret;
		if (!secret || !verifyTotp(String(secret), code)) {
			throw new AuthError('The authentication code is not valid.');
		}
		await tx
			.update(userSecrets)
			.set({ totpEnabled: true })
			.where(sql`user_id = ${userId}::uuid`);
	});
}
