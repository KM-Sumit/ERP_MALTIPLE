import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { academicSessions, students } from './academic';
import { createdAt, primaryId, updatedAt } from './columns';
import { schoolId } from './platform';

export const feeStructures = pgTable(
	'fee_structures',
	{
		id: primaryId(),
		schoolId: schoolId(),
		sessionId: uuid('session_id').notNull(),
		name: text('name').notNull(),
		amountPaise: integer('amount_paise').notNull(),
		lateFeePaise: integer('late_fee_paise').notNull().default(0),
		lateFeeGraceDays: integer('late_fee_grace_days').notNull().default(0),
		category: text('category').notNull().default('other'),
		schedule: text('schedule').notNull().default('annual'),
		classId: uuid('class_id'),
		lateKind: text('late_kind').notNull().default('fixed'),
		latePercent: numeric('late_percent', { precision: 5, scale: 2 }).notNull().default('0'),
		lateMaxPaise: integer('late_max_paise'),
		skipNonWorking: boolean('skip_non_working').notNull().default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('fee_structures_id_school_uidx').on(t.id, t.schoolId),
		unique('fee_structures_name_uidx').on(t.schoolId, t.sessionId, t.name),
		index('fee_structures_school_idx').on(t.schoolId),
		foreignKey({
			name: 'fee_structures_session_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict'),
		check('fee_structures_amount_chk', sql`${t.amountPaise} >= 0 and ${t.lateFeePaise} >= 0`),
		check('fee_structures_grace_chk', sql`${t.lateFeeGraceDays} >= 0`)
	]
);

export const feeConcessions = pgTable(
	'fee_concessions',
	{
		id: primaryId(),
		schoolId: schoolId(),
		studentId: uuid('student_id').notNull(),
		feeStructureId: uuid('fee_structure_id'),
		kind: text('kind').notNull(),
		amountPaise: integer('amount_paise'),
		percent: numeric('percent', { precision: 5, scale: 2 }),
		reason: text('reason').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('fee_concessions_school_student_idx').on(t.schoolId, t.studentId),
		foreignKey({
			name: 'fee_concessions_student_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'fee_concessions_structure_fk',
			columns: [t.feeStructureId, t.schoolId],
			foreignColumns: [feeStructures.id, feeStructures.schoolId]
		}).onDelete('restrict'),
		check('fee_concessions_kind_chk', sql`${t.kind} in ('amount', 'percent')`),
		check(
			'fee_concessions_value_chk',
			sql`(
				(${t.kind} = 'amount' and ${t.amountPaise} is not null and ${t.amountPaise} >= 0 and ${t.percent} is null)
				or (${t.kind} = 'percent' and ${t.percent} is not null and ${t.percent} >= 0 and ${t.percent} <= 100 and ${t.amountPaise} is null)
			)`
		)
	]
);

export const invoices = pgTable(
	'invoices',
	{
		id: primaryId(),
		schoolId: schoolId(),
		studentId: uuid('student_id').notNull(),
		feeStructureId: uuid('fee_structure_id').notNull(),
		periodLabel: text('period_label').notNull(),
		amountPaise: integer('amount_paise').notNull(),
		concessionPaise: integer('concession_paise').notNull().default(0),
		lateFeePaise: integer('late_fee_paise').notNull().default(0),
		amountPaidPaise: integer('amount_paid_paise').notNull().default(0),
		waiverPaise: integer('waiver_paise').notNull().default(0),
		policySnapshot: jsonb('policy_snapshot').notNull().default({}),
		createdBy: uuid('created_by'),
		status: text('status').notNull().default('draft'),
		dueOn: date('due_on').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('invoices_id_school_uidx').on(t.id, t.schoolId),
		unique('invoices_period_uidx').on(t.schoolId, t.studentId, t.feeStructureId, t.periodLabel),
		index('invoices_school_status_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'invoices_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'invoices_structure_school_fk',
			columns: [t.feeStructureId, t.schoolId],
			foreignColumns: [feeStructures.id, feeStructures.schoolId]
		}).onDelete('restrict'),
		check(
			'invoices_amount_chk',
			sql`${t.amountPaise} >= 0 and ${t.concessionPaise} >= 0 and ${t.lateFeePaise} >= 0 and ${t.amountPaidPaise} >= 0`
		),
		check(
			'invoices_status_chk',
			sql`${t.status} in ('draft', 'issued', 'partially_paid', 'paid', 'void')`
		)
	]
);

export const payments = pgTable(
	'payments',
	{
		id: primaryId(),
		schoolId: schoolId(),
		invoiceId: uuid('invoice_id').notNull(),
		studentId: uuid('student_id').notNull(),
		amountPaise: integer('amount_paise').notNull(),
		status: text('status').notNull().default('pending'),
		provider: text('provider').notNull().default('manual'),
		providerReference: text('provider_reference'),
		paidAt: timestamp('paid_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('payments_provider_ref_uidx')
			.on(t.provider, t.providerReference)
			.where(sql`${t.providerReference} is not null`),
		index('payments_school_invoice_idx').on(t.schoolId, t.invoiceId),
		foreignKey({
			name: 'payments_invoice_school_fk',
			columns: [t.invoiceId, t.schoolId],
			foreignColumns: [invoices.id, invoices.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'payments_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check('payments_amount_chk', sql`${t.amountPaise} > 0`),
		check('payments_status_chk', sql`${t.status} in ('pending', 'succeeded', 'failed')`),
		check('payments_provider_chk', sql`${t.provider} in ('manual', 'cashfree')`)
	]
);

export const invoiceLines = pgTable(
	'invoice_lines',
	{
		id: primaryId(),
		schoolId: schoolId(),
		invoiceId: uuid('invoice_id').notNull(),
		label: text('label').notNull(),
		amountPaise: integer('amount_paise').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'invoice_lines_invoice_fk',
			columns: [t.invoiceId, t.schoolId],
			foreignColumns: [invoices.id, invoices.schoolId]
		}).onDelete('restrict'),
		check('invoice_lines_amount_chk', sql`${t.amountPaise} >= 0`)
	]
);

export const refunds = pgTable(
	'refunds',
	{
		id: primaryId(),
		schoolId: schoolId(),
		paymentId: uuid('payment_id').notNull(),
		amountPaise: integer('amount_paise').notNull(),
		reason: text('reason').notNull(),
		status: text('status').notNull().default('succeeded'),
		createdBy: uuid('created_by'),
		createdAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'refunds_payment_fk',
			columns: [t.paymentId],
			foreignColumns: [payments.id]
		}).onDelete('restrict'),
		check('refunds_amount_chk', sql`${t.amountPaise} > 0`),
		check('refunds_status_chk', sql`${t.status} in ('succeeded', 'failed')`)
	]
);

export const paymentEvents = pgTable(
	'payment_events',
	{
		id: primaryId(),
		schoolId: schoolId(),
		provider: text('provider').notNull(),
		eventId: text('event_id').notNull(),
		createdAt: createdAt()
	},
	(t) => [unique('payment_events_uidx').on(t.provider, t.eventId)]
);

export const schoolHolidays = pgTable(
	'school_holidays',
	{
		schoolId: schoolId(),
		holidayDate: date('holiday_date').notNull(),
		name: text('name').notNull()
	},
	(t) => [unique('school_holidays_pk').on(t.schoolId, t.holidayDate)]
);
