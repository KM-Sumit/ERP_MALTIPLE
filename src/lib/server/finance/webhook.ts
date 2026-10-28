import type { AppDb } from '../db/tenant';
import {
	cashfreeSignature,
	readCashfreeEvent,
	signaturesMatch,
	webhookTimestampFresh
} from './cashfree';
import { confirmCashfreeEvent } from './ledger';

export async function receiveCashfreeWebhook(
	db: AppDb,
	input: { secret: string | undefined; timestamp: string; signature: string; raw: string }
) {
	if (!input.secret) return { status: 503 as const };
	const expected = cashfreeSignature(input.secret, input.timestamp, input.raw);
	if (!signaturesMatch(expected, input.signature) || !webhookTimestampFresh(input.timestamp)) {
		return { status: 401 as const };
	}
	try {
		const event = readCashfreeEvent(input.raw);
		const result = await confirmCashfreeEvent(db, event);
		return { status: 200 as const, duplicate: result.duplicate };
	} catch {
		return { status: 400 as const };
	}
}
