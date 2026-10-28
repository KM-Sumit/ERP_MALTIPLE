import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	guardianStudents,
	invoices,
	roles,
	schoolMemberships,
	schoolSettings,
	schools,
	academicSessions,
	students,
	users
} from '../db/schema';
import * as schema from '../db/schema';
import { withSchoolUser } from '../db/tenant';
import {
	confirmCashfreeEvent,
	issueInvoice,
	parentFees,
	recordOfflinePayment,
	refundPayment,
	saveFeePlan,
	startOnlinePayment
} from './ledger';

const admin = drizzle(
	postgres(process.env.ERP_TEST_ADMIN_URL ?? 'postgres://postgres@127.0.0.1:54329/school_erp', {
		max: 1,
		onnotice: () => {}
	}),
	{ schema }
);
const app = drizzle(
	postgres(process.env.ERP_TEST_APP_URL ?? 'postgres://erp_app@127.0.0.1:54329/school_erp', {
		max: 1,
		onnotice: () => {}
	}),
	{ schema }
);
const suffix = randomUUID().slice(0, 8);
const ids = {
	admin: randomUUID(),
	parent: randomUUID(),
	other: randomUUID(),
	school: randomUUID(),
	otherSchool: randomUUID(),
	session: randomUUID(),
	student: randomUUID(),
	otherStudent: randomUUID()
};

describe('fee ledger', () => {
	let planId = '';
	let invoiceId = '';

	beforeAll(async () => {
		await migrate(admin, { migrationsFolder: './drizzle' });
		const [adminRole] = await admin.select().from(roles).where(eq(roles.key, 'school_admin'));
		const [parentRole] = await admin.select().from(roles).where(eq(roles.key, 'parent'));
		await admin.insert(users).values([
			{
				id: ids.admin,
				fullName: 'Fees',
				email: `fees-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.parent,
				fullName: 'Parent',
				email: `fees-parent-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.other,
				fullName: 'Other',
				email: `fees-other-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			}
		]);
		await admin.insert(schools).values([
			{ id: ids.school, name: 'Fee School', code: `fee-${suffix}` },
			{ id: ids.otherSchool, name: 'Other Fee', code: `fee2-${suffix}` }
		]);
		await admin
			.insert(schoolSettings)
			.values([{ schoolId: ids.school }, { schoolId: ids.otherSchool }]);
		await admin.insert(schoolMemberships).values([
			{ schoolId: ids.school, userId: ids.admin, roleId: adminRole.id, status: 'active' },
			{ schoolId: ids.school, userId: ids.parent, roleId: parentRole.id, status: 'active' },
			{ schoolId: ids.otherSchool, userId: ids.other, roleId: parentRole.id, status: 'active' }
		]);
		await admin.insert(academicSessions).values({
			id: ids.session,
			schoolId: ids.school,
			name: '2026-27',
			startDate: '2026-04-01',
			endDate: '2027-03-31',
			status: 'active'
		});
		await admin.insert(students).values([
			{
				id: ids.student,
				schoolId: ids.school,
				admissionNo: `F-${suffix}`,
				firstName: 'Meera',
				lastName: 'Joshi'
			},
			{
				id: ids.otherStudent,
				schoolId: ids.otherSchool,
				admissionNo: `G-${suffix}`,
				firstName: 'Other',
				lastName: 'Child'
			}
		]);
		await admin.insert(guardianStudents).values({
			schoolId: ids.school,
			guardianUserId: ids.parent,
			studentId: ids.student,
			relationship: 'mother'
		});
	});

	it('keeps one balance when payments race, retries, or the fee policy changes later', async () => {
		const plan = await saveFeePlan(app, ids.admin, ids.school, {
			sessionId: ids.session,
			name: `Tuition ${suffix}`,
			amountPaise: 10_000,
			category: 'tuition',
			schedule: 'monthly',
			classId: null,
			lateKind: 'per_day',
			lateFeePaise: 100,
			latePercent: 0,
			graceDays: 0,
			maxPaise: null
		});
		planId = plan.id;
		const invoice = await issueInvoice(app, ids.admin, ids.school, {
			studentId: ids.student,
			feeStructureId: planId,
			periodLabel: `apr-${suffix}`,
			dueOn: '2026-04-10',
			concessionPaise: 0,
			lines: [
				{ label: 'Tuition', amountPaise: 8_000 },
				{ label: 'Exam', amountPaise: 2_000 }
			]
		});
		invoiceId = invoice.id;
		await admin
			.update(schema.feeStructures)
			.set({ lateFeePaise: 900 })
			.where(eq(schema.feeStructures.id, planId));
		await recordOfflinePayment(app, ids.admin, ids.school, {
			invoiceId,
			amountPaise: 1_000,
			reference: `cash-${suffix}`,
			asOf: '2026-04-13'
		});
		const [afterPolicy] = await admin.select().from(invoices).where(eq(invoices.id, invoiceId));
		expect(afterPolicy.lateFeePaise).toBe(100);
		const raced = await Promise.allSettled([
			recordOfflinePayment(app, ids.admin, ids.school, {
				invoiceId,
				amountPaise: 6_000,
				reference: `a-${suffix}`,
				asOf: '2026-04-13'
			}),
			recordOfflinePayment(app, ids.admin, ids.school, {
				invoiceId,
				amountPaise: 6_000,
				reference: `b-${suffix}`,
				asOf: '2026-04-13'
			})
		]);
		expect(raced.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		const repeated = await recordOfflinePayment(app, ids.admin, ids.school, {
			invoiceId,
			amountPaise: 6_000,
			reference: `a-${suffix}`,
			asOf: '2026-04-13'
		});
		expect(repeated.providerReference).toBe(`a-${suffix}`);
		const [stored] = await admin.select().from(invoices).where(eq(invoices.id, invoiceId));
		expect(stored.amountPaidPaise).toBe(7_000);
		expect(stored.amountPaidPaise).toBeLessThanOrEqual(
			stored.amountPaise - stored.concessionPaise + stored.lateFeePaise - stored.waiverPaise
		);
		await expect(parentFees(app, ids.other, ids.otherSchool, ids.student)).rejects.toThrow(
			/permission denied/
		);
		const statement = await parentFees(app, ids.parent, ids.school, ids.student);
		expect(statement.invoices[0].outstanding).toBe(3_100);
		const online = await startOnlinePayment(app, ids.parent, ids.school, invoiceId, 1_000);
		const first = await confirmCashfreeEvent(app, {
			eventId: `evt-${suffix}`,
			orderId: online.orderId,
			amountPaise: 1_000,
			status: 'PAID'
		});
		const second = await confirmCashfreeEvent(app, {
			eventId: `evt-${suffix}`,
			orderId: online.orderId,
			amountPaise: 1_000,
			status: 'PAID'
		});
		expect(first.status).toBe('succeeded');
		expect(second.duplicate).toBe(true);
		const [finalInvoice] = await admin.select().from(invoices).where(eq(invoices.id, invoiceId));
		expect(finalInvoice.amountPaidPaise).toBe(8_000);
		await refundPayment(app, ids.admin, ids.school, {
			paymentId: repeated.id,
			amountPaise: 1_000,
			reason: 'Overpayment correction'
		});
		const [refunded] = await admin.select().from(invoices).where(eq(invoices.id, invoiceId));
		expect(refunded.amountPaidPaise).toBe(7_000);
		await expect(withSchoolUser(app, ids.admin, ids.otherSchool, async () => 1)).rejects.toThrow(
			/cross-school/
		);
	});
});
