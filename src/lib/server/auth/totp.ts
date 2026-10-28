import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret() {
	return randomBytes(20).toString('base64url');
}

function base32(value: Buffer) {
	let bits = '';
	for (const byte of value) bits += byte.toString(2).padStart(8, '0');
	let output = '';
	for (let index = 0; index < bits.length; index += 5) {
		output += ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
	}
	return output;
}

function hotp(secret: Buffer, counter: bigint) {
	const counterBytes = Buffer.alloc(8);
	counterBytes.writeBigUInt64BE(counter);
	const digest = createHmac('sha1', secret).update(counterBytes).digest();
	const offset = digest[digest.length - 1] & 0x0f;
	const binary = digest.readUInt32BE(offset) & 0x7fffffff;
	return (binary % 1_000_000).toString().padStart(6, '0');
}

export function verifyTotp(secret: string, token: string, now = Date.now()) {
	const clean = token.replace(/\s+/g, '');
	if (!/^\d{6}$/.test(clean)) return false;
	const key = Buffer.from(secret, 'base64url');
	const counter = BigInt(Math.floor(now / 30_000));
	const given = Buffer.from(clean);
	for (const skew of [-1n, 0n, 1n]) {
		const expected = Buffer.from(hotp(key, counter + skew));
		if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
	}
	return false;
}

export function totpUri(email: string, secret: string) {
	const encoded = base32(Buffer.from(secret, 'base64url'));
	const label = encodeURIComponent(`School ERP:${email}`);
	return `otpauth://totp/${label}?secret=${encoded}&issuer=${encodeURIComponent('School ERP')}&digits=6&period=30`;
}
