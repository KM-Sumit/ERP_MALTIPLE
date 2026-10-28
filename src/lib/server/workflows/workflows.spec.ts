import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	guardianStudents,
	notifications,
	roles,
	schoolMemberships,
	schools,
	students,
	users
} from '../db/schema';
import * as schema from '../db/schema';
import { withSchoolUser } from '../db/tenant';
import { cashfreeSignature } from '../finance/cashfree';
import { receiveCashfreeWebhook } from '../finance/webhook';
import { createNotification } from '../notifications/create';
import { raiseComplaint } from '../schools/service';
import { inspectUpload, storeUpload } from '../storage/upload';
import { requestDocument } from '../academics/portals';
import { documentPdf, updateComplaint, reviewDocument } from './service';

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
	school: randomUUID(),
	student: randomUUID()
};

describe('complaints, documents, and uploads', () => {
	beforeAll(async () => {
		await migrate(admin, { migrationsFolder: './drizzle' });
		const [adminRole] = await admin.select().from(roles).where(eq(roles.key, 'school_admin'));
		const [parentRole] = await admin.select().from(roles).where(eq(roles.key, 'parent'));
		await admin.insert(users).values([
			{
				id: ids.admin,
				fullName: 'Office',
				email: `office-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.parent,
				fullName: 'Parent',
				email: `voice-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			}
		]);
		await admin
			.insert(schools)
			.values({ id: ids.school, name: 'Workflow School', code: `wf-${suffix}` });
		await admin.insert(schoolMemberships).values([
			{ schoolId: ids.school, userId: ids.admin, roleId: adminRole.id, status: 'active' },
			{ schoolId: ids.school, userId: ids.parent, roleId: parentRole.id, status: 'active' }
		]);
		await admin.insert(students).values({
			id: ids.student,
			schoolId: ids.school,
			admissionNo: `W-${suffix}`,
			firstName: 'Asha',
			lastName: 'Rao'
		});
		await admin.insert(guardianStudents).values({
			schoolId: ids.school,
			guardianUserId: ids.parent,
			studentId: ids.student,
			relationship: 'mother'
		});
	});

	it('lets a parent attach a photo, tracks review, and issues a document once', async () => {
		expect(() => inspectUpload(Buffer.from('hello'), 'text/plain')).toThrow(/not allowed/);
		const photo = await storeUpload(app, ids.parent, ids.school, {
			bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
			claimedMime: 'image/jpeg'
		});
		const complaint = await raiseComplaint(
			app,
			ids.parent,
			ids.school,
			ids.student,
			'Bus delay',
			'The afternoon bus left early.',
			{ category: 'transport', priority: 'high', files: [{ id: photo.id, kind: 'photo' }] }
		);
		await updateComplaint(app, ids.admin, ids.school, {
			complaintId: complaint.id,
			status: 'in_review'
		});
		await updateComplaint(app, ids.admin, ids.school, {
			complaintId: complaint.id,
			status: 'assigned',
			assigneeUserId: ids.admin,
			note: 'Office is checking the route.'
		});
		await updateComplaint(app, ids.admin, ids.school, {
			complaintId: complaint.id,
			status: 'resolved',
			note: 'The stop time was corrected.'
		});
		const visible = await withSchoolUser(app, ids.parent, ids.school, async (tx) => {
			return tx.select().from(schema.complaints).where(eq(schema.complaints.id, complaint.id));
		});
		expect(visible[0]?.status).toBe('resolved');
		await requestDocument(app, ids.parent, ids.school, ids.student, 'bonafide');
		const [request] = await withSchoolUser(app, ids.admin, ids.school, async (tx) => {
			return tx
				.select()
				.from(schema.documentRequests)
				.where(eq(schema.documentRequests.studentId, ids.student));
		});
		await reviewDocument(app, ids.admin, ids.school, {
			requestId: request.id,
			status: 'ready',
			note: 'Verified from the admission register.'
		});
		const pdf = await documentPdf(app, ids.parent, ids.school, request.id);
		expect(pdf.startsWith('%PDF')).toBe(true);
		const audits = await admin
			.select()
			.from(schema.auditEvents)
			.where(eq(schema.auditEvents.entityId, request.id));
		expect(audits.some((row) => row.action === 'documents.review')).toBe(true);
		await withSchoolUser(app, ids.admin, ids.school, async (tx) => {
			await createNotification(tx, {
				schoolId: ids.school,
				userId: ids.parent,
				title: 'Fee reminder',
				body: 'April fee is due.',
				eventKey: `fee:${suffix}`
			});
			await createNotification(tx, {
				schoolId: ids.school,
				userId: ids.parent,
				title: 'Fee reminder',
				body: 'April fee is due.',
				eventKey: `fee:${suffix}`
			});
		});
		const messages = await admin
			.select()
			.from(notifications)
			.where(eq(notifications.userId, ids.parent));
		expect(messages.filter((message) => message.eventKey === `fee:${suffix}`)).toHaveLength(1);
		const raw = JSON.stringify({
			eventId: `missing-${suffix}`,
			orderId: `none-${suffix}`,
			amountPaise: 100,
			status: 'PAID'
		});
		const now = String(Math.floor(Date.now() / 1000));
		expect(
			await receiveCashfreeWebhook(app, { secret: undefined, timestamp: now, signature: 'no', raw })
		).toMatchObject({ status: 503 });
		expect(
			await receiveCashfreeWebhook(app, {
				secret: 'test-secret',
				timestamp: now,
				signature: 'not-the-signature',
				raw
			})
		).toMatchObject({ status: 401 });
		expect(
			await receiveCashfreeWebhook(app, {
				secret: 'test-secret',
				timestamp: '1',
				signature: cashfreeSignature('test-secret', '1', raw),
				raw
			})
		).toMatchObject({ status: 401 });
		expect(
			await receiveCashfreeWebhook(app, {
				secret: 'test-secret',
				timestamp: now,
				signature: cashfreeSignature('test-secret', now, raw),
				raw
			})
		).toMatchObject({ status: 400 });
	});
});
