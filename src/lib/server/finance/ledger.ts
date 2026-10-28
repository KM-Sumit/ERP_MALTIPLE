import { and, desc, eq, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { rowsOf } from '../auth/session';
import { writeAudit } from '../audit/log';
import {
	feeConcessions,
	feeStructures,
	invoiceLines,
	invoices,
	payments,
	refunds,
	schoolHolidays,
	schoolSettings,
	academicSessions,
	schools,
	students
} from '../db/schema';
import { withSchoolUser, type AppDb, type TenantTx } from '../db/tenant';
import { assertStatusTransition } from '../domain/transitions';
import { allow } from '../academics/access';
import { simplePdf } from '../academics/pdf';
import { lateFeePaise, type LateKind, type LatePolicy } from './late-fee';

const categories = ['tuition', 'admission', 'transport', 'examination', 'other'] as const;
const schedules = ['monthly', 'quarterly', 'half_yearly', 'annual'] as const;
const kinds: LateKind[] = ['none', 'fixed', 'per_day', 'percent', 'one_time'];

function payable(invoice: {
	amountPaise: number;
	concessionPaise: number;
	lateFeePaise: number;
	waiverPaise: number;
}) {
	return invoice.amountPaise - invoice.concessionPaise + invoice.lateFeePaise - invoice.waiverPaise;
}

function nextStatus(paid: number, due: number) {
	if (paid <= 0) return 'issued' as const;
	if (paid < due) return 'partially_paid' as const;
	return 'paid' as const;
}

function asPolicy(value: unknown): LatePolicy {
	const snapshot = (value ?? {}) as Partial<LatePolicy>;
	return {
		kind: snapshot.kind ?? 'none',
		amountPaise: snapshot.amountPaise ?? 0,
		percent: snapshot.percent ?? 0,
		graceDays: snapshot.graceDays ?? 0,
		maxPaise: snapshot.maxPaise ?? null,
		countOnlyWorkingDays: snapshot.countOnlyWorkingDays ?? false,
		workingDays: snapshot.workingDays ?? [1, 2, 3, 4, 5],
		holidays: snapshot.holidays ?? []
	};
}

async function lockInvoice(tx: TenantTx, schoolId: string, invoiceId: string) {
	await tx.execute(
		sql`select id from invoices where school_id = ${schoolId}::uuid and id = ${invoiceId}::uuid for update`
	);
	const [invoice] = await tx
		.select()
		.from(invoices)
		.where(and(eq(invoices.id, invoiceId), eq(invoices.schoolId, schoolId)));
	if (!invoice || invoice.status === 'void' || invoice.status === 'draft') {
		throw new AuthError('That invoice cannot accept a payment.');
	}
	return invoice;
}

async function applyCredit(
	tx: TenantTx,
	schoolId: string,
	invoiceId: string,
	amount: number,
	asOf: string
) {
	const invoice = await lockInvoice(tx, schoolId, invoiceId);
	const policy = asPolicy(invoice.policySnapshot);
	const late = lateFeePaise(
		{
			principalPaise: invoice.amountPaise,
			concessionPaise: invoice.concessionPaise,
			paidTowardPrincipalPaise: Math.min(
				invoice.amountPaidPaise,
				invoice.amountPaise - invoice.concessionPaise
			),
			dueOn: invoice.dueOn,
			asOf
		},
		policy
	);
	const due = payable({ ...invoice, lateFeePaise: late });
	if (amount > due - invoice.amountPaidPaise)
		throw new AuthError('That payment exceeds the outstanding balance.');
	const paid = invoice.amountPaidPaise + amount;
	const status = nextStatus(paid, due);
	if (status !== invoice.status) assertStatusTransition('invoice', invoice.status, status);
	await tx
		.update(invoices)
		.set({ lateFeePaise: late, amountPaidPaise: paid, status })
		.where(eq(invoices.id, invoice.id));
	return { outstanding: due - paid, late };
}

export async function saveFeePlan(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		sessionId: string;
		name: string;
		amountPaise: number;
		category: string;
		schedule: string;
		classId: string | null;
		lateKind: string;
		lateFeePaise: number;
		latePercent: number;
		graceDays: number;
		maxPaise: number | null;
	}
) {
	if (!categories.includes(input.category as (typeof categories)[number])) {
		throw new AuthError('Choose a fee category.');
	}
	if (!schedules.includes(input.schedule as (typeof schedules)[number])) {
		throw new AuthError('Choose a fee schedule.');
	}
	if (!kinds.includes(input.lateKind as LateKind)) throw new AuthError('Choose a late-fee policy.');
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['fees.configure', 'school.fees.manage']);
		const [created] = await tx
			.insert(feeStructures)
			.values({
				schoolId,
				sessionId: input.sessionId,
				name: input.name.trim(),
				amountPaise: input.amountPaise,
				category: input.category,
				schedule: input.schedule,
				classId: input.classId,
				lateKind: input.lateKind,
				lateFeePaise: input.lateFeePaise,
				latePercent: String(input.latePercent),
				lateFeeGraceDays: input.graceDays,
				lateMaxPaise: input.maxPaise,
				skipNonWorking: true
			})
			.returning();
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'fees.configure',
			entityType: 'fee_structure',
			entityId: created.id
		});
		return created;
	});
}

export async function addHoliday(
	db: AppDb,
	userId: string,
	schoolId: string,
	date: string,
	name: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['fees.configure', 'school.fees.manage']);
		await tx.insert(schoolHolidays).values({ schoolId, holidayDate: date, name: name.trim() });
	});
}

export async function addConcession(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { studentId: string; feeStructureId: string | null; amountPaise: number; reason: string }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['fees.configure', 'school.fees.manage']);
		await tx.insert(feeConcessions).values({
			schoolId,
			studentId: input.studentId,
			feeStructureId: input.feeStructureId,
			kind: 'amount',
			amountPaise: input.amountPaise,
			reason: input.reason.trim()
		});
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'fees.concession',
			entityType: 'student',
			entityId: input.studentId
		});
	});
}

export async function issueInvoice(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		studentId: string;
		feeStructureId: string;
		periodLabel: string;
		dueOn: string;
		lines: { label: string; amountPaise: number }[];
		concessionPaise: number;
	}
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['fees.configure', 'school.fees.manage']);
		const [plan] = await tx
			.select()
			.from(feeStructures)
			.where(and(eq(feeStructures.id, input.feeStructureId), eq(feeStructures.schoolId, schoolId)));
		if (!plan) throw new AuthError('Choose a fee plan.');
		const [settings] = await tx
			.select()
			.from(schoolSettings)
			.where(eq(schoolSettings.schoolId, schoolId));
		const holidays = await tx
			.select()
			.from(schoolHolidays)
			.where(eq(schoolHolidays.schoolId, schoolId));
		const amount = input.lines.reduce((sum, line) => sum + line.amountPaise, 0);
		const snapshot: LatePolicy = {
			kind: plan.lateKind as LateKind,
			amountPaise: plan.lateFeePaise,
			percent: Number(plan.latePercent),
			graceDays: plan.lateFeeGraceDays,
			maxPaise: plan.lateMaxPaise,
			countOnlyWorkingDays: plan.skipNonWorking,
			workingDays: (settings?.workingDays ?? [1, 2, 3, 4, 5]).map(Number),
			holidays: holidays.map((holiday) => holiday.holidayDate)
		};
		const [invoice] = await tx
			.insert(invoices)
			.values({
				schoolId,
				studentId: input.studentId,
				feeStructureId: plan.id,
				periodLabel: input.periodLabel,
				amountPaise: amount,
				concessionPaise: input.concessionPaise,
				dueOn: input.dueOn,
				status: 'issued',
				policySnapshot: snapshot,
				createdBy: userId
			})
			.returning();
		if (input.lines.length > 0) {
			await tx.insert(invoiceLines).values(
				input.lines.map((line) => ({
					schoolId,
					invoiceId: invoice.id,
					label: line.label,
					amountPaise: line.amountPaise
				}))
			);
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'fees.invoice',
			entityType: 'invoice',
			entityId: invoice.id
		});
		return invoice;
	});
}

export async function recordOfflinePayment(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { invoiceId: string; amountPaise: number; reference: string; asOf: string }
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['payments.record', 'school.fees.manage']);
		const [existing] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.provider, 'manual'), eq(payments.providerReference, input.reference)));
		if (existing) return existing;
		const [payment] = await tx
			.insert(payments)
			.values({
				schoolId,
				invoiceId: input.invoiceId,
				studentId: (await lockInvoice(tx, schoolId, input.invoiceId)).studentId,
				amountPaise: input.amountPaise,
				status: 'pending',
				provider: 'manual',
				providerReference: input.reference
			})
			.returning();
		await applyCredit(tx, schoolId, input.invoiceId, input.amountPaise, input.asOf);
		assertStatusTransition('payment', 'pending', 'succeeded');
		await tx
			.update(payments)
			.set({ status: 'succeeded', paidAt: new Date() })
			.where(eq(payments.id, payment.id));
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'payments.record',
			entityType: 'payment',
			entityId: payment.id
		});
		return payment;
	});
}

export async function confirmCashfreeEvent(
	db: AppDb,
	input: { eventId: string; orderId: string; amountPaise: number; status: string }
) {
	const result = await db.execute(
		sql`select app.settle_gateway_payment(${input.eventId}, ${input.orderId}, ${input.amountPaise}, ${input.status === 'PAID'}) as status`
	);
	const status = String(rowsOf(result)[0]?.status ?? '');
	return { duplicate: status === 'duplicate', status };
}

export async function startOnlinePayment(
	db: AppDb,
	userId: string,
	schoolId: string,
	invoiceId: string,
	amountPaise: number
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const invoice = await lockInvoice(tx, schoolId, invoiceId);
		if (amountPaise > payable(invoice) - invoice.amountPaidPaise) {
			throw new AuthError('That payment exceeds the outstanding balance.');
		}
		const readable = await tx.execute(
			sql`select app.can_read_student(${schoolId}::uuid, ${invoice.studentId}::uuid) as ok`
		);
		if (rowsOf(readable)[0]?.ok !== true) throw new AuthError('permission denied');
		const reference = `cf-${invoice.id}-${Date.now()}`;
		const [payment] = await tx
			.insert(payments)
			.values({
				schoolId,
				invoiceId,
				studentId: invoice.studentId,
				amountPaise,
				status: 'pending',
				provider: 'cashfree',
				providerReference: reference
			})
			.returning();
		return { paymentId: payment.id, orderId: reference, status: 'pending' as const };
	});
}

export async function refundPayment(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { paymentId: string; amountPaise: number; reason: string }
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['payments.record', 'school.fees.manage']);
		const [payment] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.id, input.paymentId), eq(payments.schoolId, schoolId)));
		if (!payment || payment.status !== 'succeeded')
			throw new AuthError('Only a succeeded payment can be refunded.');
		const invoice = await lockInvoice(tx, schoolId, payment.invoiceId);
		if (input.amountPaise > invoice.amountPaidPaise)
			throw new AuthError('The refund exceeds the amount paid.');
		await tx.insert(refunds).values({
			schoolId,
			paymentId: payment.id,
			amountPaise: input.amountPaise,
			reason: input.reason.trim(),
			createdBy: userId
		});
		const paid = invoice.amountPaidPaise - input.amountPaise;
		const due = payable(invoice);
		const status = nextStatus(paid, due);
		if (status !== invoice.status) assertStatusTransition('invoice', invoice.status, status);
		await tx
			.update(invoices)
			.set({ amountPaidPaise: paid, status })
			.where(eq(invoices.id, invoice.id));
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'payments.refund',
			entityType: 'payment',
			entityId: payment.id,
			metadata: { amountPaise: input.amountPaise }
		});
	});
}

export async function parentFees(db: AppDb, userId: string, schoolId: string, studentId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const readable = await tx.execute(
			sql`select app.can_read_student(${schoolId}::uuid, ${studentId}::uuid) as ok`
		);
		if (rowsOf(readable)[0]?.ok !== true) throw new AuthError('permission denied');
		const rows = await tx
			.select()
			.from(invoices)
			.where(and(eq(invoices.schoolId, schoolId), eq(invoices.studentId, studentId)));
		const lines = await tx.select().from(invoiceLines).where(eq(invoiceLines.schoolId, schoolId));
		const history = await tx.select().from(payments).where(eq(payments.studentId, studentId));
		const concessions = await tx
			.select()
			.from(feeConcessions)
			.where(eq(feeConcessions.studentId, studentId));
		return {
			invoices: rows.map((invoice) => ({
				...invoice,
				outstanding: Math.max(0, payable(invoice) - invoice.amountPaidPaise),
				lines: lines.filter((line) => line.invoiceId === invoice.id)
			})),
			payments: history,
			concessions
		};
	});
}

export async function collectionReport(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['reports.export', 'fees.configure', 'payments.record']);
		const summary = await tx.execute(sql`
			select
				count(*) filter (where status = 'succeeded')::int as count,
				coalesce(sum(amount_paise) filter (where status = 'succeeded'), 0)::int as collected,
				count(*) filter (where status = 'pending')::int as pending
			from payments
			where school_id = ${schoolId}::uuid
		`);
		const totals = rowsOf(summary)[0];
		return {
			count: Number(totals?.count ?? 0),
			collectedPaise: Number(totals?.collected ?? 0),
			pending: Number(totals?.pending ?? 0)
		};
	});
}

export async function feeDesk(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, [
			'fees.configure',
			'payments.record',
			'school.fees.manage',
			'reports.export'
		]);
		const summary = await tx.execute(sql`
			select
				coalesce(sum(amount_paise) filter (where status = 'succeeded'), 0)::int as collected,
				count(*) filter (where status = 'pending')::int as pending
			from payments
			where school_id = ${schoolId}::uuid
		`);
		const totals = rowsOf(summary)[0];
		return {
			plans: await tx
				.select()
				.from(feeStructures)
				.where(eq(feeStructures.schoolId, schoolId))
				.limit(100),
			invoices: await tx
				.select()
				.from(invoices)
				.where(eq(invoices.schoolId, schoolId))
				.orderBy(desc(invoices.createdAt))
				.limit(100),
			students: await tx.select().from(students).where(eq(students.schoolId, schoolId)).limit(300),
			sessions: await tx
				.select()
				.from(academicSessions)
				.where(eq(academicSessions.schoolId, schoolId)),
			collectedPaise: Number(totals?.collected ?? 0),
			pendingPayments: Number(totals?.pending ?? 0)
		};
	});
}

export async function paymentReceipt(
	db: AppDb,
	userId: string,
	schoolId: string,
	paymentId: string
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const [payment] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.id, paymentId), eq(payments.schoolId, schoolId)));
		if (!payment || payment.status !== 'succeeded')
			throw new AuthError('That receipt is not available.');
		const readable = await tx.execute(
			sql`select app.can_read_student(${schoolId}::uuid, ${payment.studentId}::uuid) as ok`
		);
		if (rowsOf(readable)[0]?.ok !== true) {
			await allow(tx, schoolId, ['payments.record', 'school.fees.manage', 'reports.export']);
		}
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
		return simplePdf([
			school?.name ?? 'School',
			'Payment receipt',
			`Reference ${payment.providerReference ?? payment.id}`,
			`Amount ${payment.amountPaise} paise`,
			`Invoice ${invoice?.periodLabel ?? ''}`,
			`Status ${payment.status}`
		]);
	});
}
