import { createHmac, timingSafeEqual } from 'node:crypto';

export function cashfreeSignature(secret: string, timestamp: string, rawBody: string) {
	return createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64');
}

const WEBHOOK_SKEW_MS = 10 * 60 * 1000;

export function webhookTimestampFresh(timestamp: string, now = Date.now()) {
	if (!/^\d{10,13}$/.test(timestamp)) return false;
	const millis = timestamp.length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
	return Math.abs(now - millis) <= WEBHOOK_SKEW_MS;
}

export function signaturesMatch(expected: string, received: string) {
	const left = Buffer.from(expected);
	const right = Buffer.from(received);
	return left.length === right.length && timingSafeEqual(left, right);
}

export function readCashfreeEvent(raw: string) {
	const body = JSON.parse(raw) as {
		eventId?: string;
		orderId?: string;
		amountPaise?: number;
		status?: string;
		type?: string;
		data?: {
			order?: { order_id?: string; order_amount?: number };
			payment?: { payment_status?: string; cf_payment_id?: string };
		};
	};
	const orderId = body.orderId ?? body.data?.order?.order_id ?? '';
	const amountPaise =
		body.amountPaise ??
		(body.data?.order?.order_amount == null
			? 0
			: Math.round(Number(body.data.order.order_amount) * 100));
	const status = body.status ?? body.data?.payment?.payment_status ?? '';
	const eventId =
		body.eventId ??
		[body.type, body.data?.payment?.cf_payment_id, orderId].filter(Boolean).join(':');
	if (!orderId || !eventId || !Number.isInteger(amountPaise) || amountPaise <= 0) {
		throw new Error('incomplete webhook');
	}
	return { eventId, orderId, amountPaise, status };
}
