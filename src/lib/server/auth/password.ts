import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/bcrypt';

export const PASSWORD_COST = process.env.NODE_ENV === 'test' ? 4 : 12;
const MIN_PASSWORD = 10;

let dummyHash: Promise<string> | undefined;

export function hashPassword(password: string) {
	return hash(password, { cost: PASSWORD_COST });
}

export async function verifyPassword(password: string, passwordHash: string) {
	return verify(password, passwordHash);
}

export async function verifyAgainstDummy(password: string) {
	dummyHash ??= hash('not-a-real-password', { cost: PASSWORD_COST });
	await verify(password, await dummyHash);
}

export function assertPassword(password: string) {
	if (password.length < MIN_PASSWORD || password.length > 200) {
		throw new Error('Use a password between 10 and 200 characters.');
	}
}

export function newToken() {
	return randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(left: string, right: string) {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}
