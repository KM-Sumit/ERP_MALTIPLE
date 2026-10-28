export class TenantAccessError extends Error {
	constructor(message = 'cross-school access denied') {
		super(message);
		this.name = 'TenantAccessError';
	}
}

export function pgCode(error: unknown): string | undefined {
	const seen = new Set<unknown>();
	let current: unknown = error;
	while (current && typeof current === 'object' && !seen.has(current)) {
		seen.add(current);
		const code = (current as { code?: unknown }).code;
		if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
}

export function isRlsDenial(error: unknown): boolean {
	const seen = new Set<unknown>();
	let current: unknown = error;
	while (current && typeof current === 'object' && !seen.has(current)) {
		seen.add(current);
		const record = current as { code?: unknown; message?: unknown; cause?: unknown };
		const code = record.code == null ? '' : String(record.code);
		const message = record.message == null ? '' : String(record.message).toLowerCase();
		if (code === '42501' && message.includes('row-level security')) return true;
		current = record.cause;
	}
	return false;
}
