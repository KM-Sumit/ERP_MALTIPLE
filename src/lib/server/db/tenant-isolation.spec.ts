import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantAccessError } from '../authz/errors';
import { writeAudit } from '../audit/log';
import { canTransition, statusTransitions, type StatusDomain } from '../domain/transitions';
import { runSchoolJob } from '../jobs/run';
import { createNotification } from '../notifications/create';
import {
	getStoredFile,
	listExams,
	listGuardianLinks,
	listInvoices,
	listMarks,
	listStudents,
	listTeacherAssignments
} from '../repositories/records';
import { updateLeaveStatus } from '../services/leave';
import { authorizeStoredFile, buildStorageKey } from '../storage/files';
import * as schema from './schema';
import {
	academicSessions,
	exams,
	feeStructures,
	guardianStudents,
	invoices,
	leaveApplications,
	marks,
	roles,
	schoolMemberships,
	schools,
	sections,
	storedFiles,
	studentEnrollments,
	students,
	subjects,
	teacherAssignments,
	users
} from './schema';
import { assertAppRole, withPlatformAdmin, withSchoolUser, type AppDb } from './tenant';

function errorText(error: unknown): string {
	const parts: string[] = [];
	const seen = new Set<unknown>();
	let current: unknown = error;
	while (current && typeof current === 'object' && !seen.has(current)) {
		seen.add(current);
		if ('message' in current && current.message) parts.push(String(current.message));
		current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
	}
	if (error instanceof Error) parts.push(error.message);
	return parts.join('\n');
}

async function expectError(fn: () => Promise<unknown>, pattern: RegExp) {
	try {
		await fn();
	} catch (error) {
		expect(errorText(error)).toMatch(pattern);
		return;
	}
	throw new Error(`expected error matching ${pattern}`);
}

const adminUrl = process.env.ERP_TEST_ADMIN_URL ?? 'postgres://postgres@127.0.0.1:54329/school_erp';
const appUrl = process.env.ERP_TEST_APP_URL ?? 'postgres://erp_app@127.0.0.1:54329/school_erp';

const adminClient = postgres(adminUrl, { max: 1, onnotice: () => {} });
const appClient = postgres(appUrl, { max: 1, onnotice: () => {} });
const admin = drizzle(adminClient, { schema });
const app = drizzle(appClient, { schema });

const ids = {
	platform: randomUUID(),
	adminA: randomUUID(),
	teacherA: randomUUID(),
	parentA: randomUUID(),
	parentA2: randomUUID(),
	adminB: randomUUID(),
	schoolA: randomUUID(),
	schoolB: randomUUID(),
	sessionA: randomUUID(),
	sessionB: randomUUID(),
	sectionA: randomUUID(),
	sectionB: randomUUID(),
	subjectA: randomUUID(),
	subjectB: randomUUID(),
	studentA1: randomUUID(),
	studentA2: randomUUID(),
	studentB: randomUUID(),
	examA: randomUUID(),
	examB: randomUUID(),
	invoiceA: randomUUID(),
	invoiceB: randomUUID(),
	fileA: randomUUID(),
	fileB: randomUUID(),
	leaveA: randomUUID()
};

async function roleId(key: string) {
	const rows = await admin.select().from(roles).where(eq(roles.key, key));
	const row = rows[0];
	if (!row) throw new Error(`missing role ${key}`);
	return row.id;
}

describe('tenant isolation', () => {
	beforeAll(async () => {
		const existingRole = await admin.execute(
			sql`select 1 as ok from pg_roles where rolname = 'erp_app'`
		);
		if (existingRole.length === 0) {
			await admin.execute(sql`create role erp_app login nosuperuser nobypassrls noinherit`);
		} else {
			await admin.execute(sql`alter role erp_app login nosuperuser nobypassrls noinherit`);
		}
		await migrate(admin, { migrationsFolder: './drizzle' });
		await admin.execute(sql`truncate table schools, users restart identity cascade`);

		const schoolAdmin = await roleId('school_admin');
		const teacher = await roleId('teacher');
		const parent = await roleId('parent');

		await admin.insert(users).values([
			{
				id: ids.platform,
				fullName: 'Platform Admin',
				email: 'platform@school.test',
				isPlatformAdmin: true
			},
			{ id: ids.adminA, fullName: 'Admin A', email: 'admin-a@school.test' },
			{ id: ids.teacherA, fullName: 'Teacher A', email: 'teacher-a@school.test' },
			{ id: ids.parentA, fullName: 'Parent A', email: 'parent-a@school.test' },
			{ id: ids.parentA2, fullName: 'Parent A2', email: 'parent-a2@school.test' },
			{ id: ids.adminB, fullName: 'Admin B', email: 'admin-b@school.test' }
		]);
		await admin.insert(schools).values([
			{ id: ids.schoolA, name: 'North School', code: 'north' },
			{ id: ids.schoolB, name: 'South School', code: 'south' }
		]);
		await admin.insert(schoolMemberships).values([
			{ schoolId: ids.schoolA, userId: ids.adminA, roleId: schoolAdmin, status: 'active' },
			{ schoolId: ids.schoolA, userId: ids.teacherA, roleId: teacher, status: 'active' },
			{ schoolId: ids.schoolA, userId: ids.parentA, roleId: parent, status: 'active' },
			{ schoolId: ids.schoolA, userId: ids.parentA2, roleId: parent, status: 'active' },
			{ schoolId: ids.schoolB, userId: ids.adminB, roleId: schoolAdmin, status: 'active' }
		]);

		await admin.insert(academicSessions).values([
			{
				id: ids.sessionA,
				schoolId: ids.schoolA,
				name: '2026-27',
				startDate: '2026-04-01',
				endDate: '2027-03-31',
				status: 'active'
			},
			{
				id: ids.sessionB,
				schoolId: ids.schoolB,
				name: '2026-27',
				startDate: '2026-04-01',
				endDate: '2027-03-31',
				status: 'active'
			}
		]);
		const [classA] = await admin
			.insert(schema.classes)
			.values({ schoolId: ids.schoolA, sessionId: ids.sessionA, name: 'Grade 5', gradeLevel: 5 })
			.returning();
		const [classB] = await admin
			.insert(schema.classes)
			.values({ schoolId: ids.schoolB, sessionId: ids.sessionB, name: 'Grade 5', gradeLevel: 5 })
			.returning();
		await admin.insert(sections).values([
			{ id: ids.sectionA, schoolId: ids.schoolA, classId: classA.id, name: 'A' },
			{ id: ids.sectionB, schoolId: ids.schoolB, classId: classB.id, name: 'A' }
		]);
		await admin.insert(subjects).values([
			{ id: ids.subjectA, schoolId: ids.schoolA, name: 'Math', code: 'math' },
			{ id: ids.subjectB, schoolId: ids.schoolB, name: 'Math', code: 'math' }
		]);
		await admin.insert(students).values([
			{
				id: ids.studentA1,
				schoolId: ids.schoolA,
				admissionNo: 'A-1',
				firstName: 'Asha',
				lastName: 'One'
			},
			{
				id: ids.studentA2,
				schoolId: ids.schoolA,
				admissionNo: 'A-2',
				firstName: 'Arun',
				lastName: 'Two'
			},
			{
				id: ids.studentB,
				schoolId: ids.schoolB,
				admissionNo: 'B-1',
				firstName: 'Bina',
				lastName: 'One'
			}
		]);
		await admin.insert(guardianStudents).values({
			schoolId: ids.schoolA,
			guardianUserId: ids.parentA,
			studentId: ids.studentA1,
			relationship: 'mother'
		});
		await admin.insert(teacherAssignments).values({
			schoolId: ids.schoolA,
			teacherUserId: ids.teacherA,
			sectionId: ids.sectionA,
			subjectId: ids.subjectA,
			sessionId: ids.sessionA
		});
		await admin.insert(studentEnrollments).values([
			{
				schoolId: ids.schoolA,
				studentId: ids.studentA1,
				sectionId: ids.sectionA,
				sessionId: ids.sessionA,
				rollNumber: '1'
			},
			{
				schoolId: ids.schoolA,
				studentId: ids.studentA2,
				sectionId: ids.sectionA,
				sessionId: ids.sessionA,
				rollNumber: '2'
			}
		]);
		await admin.insert(exams).values([
			{
				id: ids.examA,
				schoolId: ids.schoolA,
				sessionId: ids.sessionA,
				name: 'Midterm',
				status: 'published'
			},
			{ id: ids.examB, schoolId: ids.schoolB, sessionId: ids.sessionB, name: 'Midterm' }
		]);
		await admin.insert(marks).values([
			{
				schoolId: ids.schoolA,
				examId: ids.examA,
				studentId: ids.studentA1,
				subjectId: ids.subjectA,
				marksObtained: 40,
				maxMarks: 50,
				workflow: 'approved'
			},
			{
				schoolId: ids.schoolA,
				examId: ids.examA,
				studentId: ids.studentA2,
				subjectId: ids.subjectA,
				marksObtained: 30,
				maxMarks: 50
			},
			{
				schoolId: ids.schoolB,
				examId: ids.examB,
				studentId: ids.studentB,
				subjectId: ids.subjectB,
				marksObtained: 45,
				maxMarks: 50
			}
		]);
		const [feeA] = await admin
			.insert(feeStructures)
			.values({
				schoolId: ids.schoolA,
				sessionId: ids.sessionA,
				name: 'Tuition',
				amountPaise: 100000
			})
			.returning();
		const [feeB] = await admin
			.insert(feeStructures)
			.values({
				schoolId: ids.schoolB,
				sessionId: ids.sessionB,
				name: 'Tuition',
				amountPaise: 100000
			})
			.returning();
		await admin.insert(invoices).values([
			{
				id: ids.invoiceA,
				schoolId: ids.schoolA,
				studentId: ids.studentA1,
				feeStructureId: feeA.id,
				periodLabel: '2026-04',
				amountPaise: 100000,
				dueOn: '2026-04-10',
				status: 'issued'
			},
			{
				id: ids.invoiceB,
				schoolId: ids.schoolB,
				studentId: ids.studentB,
				feeStructureId: feeB.id,
				periodLabel: '2026-04',
				amountPaise: 100000,
				dueOn: '2026-04-10',
				status: 'issued'
			}
		]);
		await admin.insert(storedFiles).values([
			{
				id: ids.fileA,
				schoolId: ids.schoolA,
				storageKey: buildStorageKey(ids.schoolA, ids.fileA),
				mimeType: 'image/jpeg',
				byteSize: 10,
				purpose: 'complaint_photo',
				uploadedBy: ids.parentA
			},
			{
				id: ids.fileB,
				schoolId: ids.schoolB,
				storageKey: buildStorageKey(ids.schoolB, ids.fileB),
				mimeType: 'audio/webm',
				byteSize: 10,
				purpose: 'complaint_voice',
				uploadedBy: ids.adminB
			}
		]);
		await admin.insert(leaveApplications).values({
			id: ids.leaveA,
			schoolId: ids.schoolA,
			studentId: ids.studentA1,
			requestedBy: ids.parentA,
			startDate: '2026-05-01',
			endDate: '2026-05-02',
			reason: 'Family travel'
		});
	}, 120000);

	afterAll(async () => {
		await adminClient.end();
		await appClient.end();
	});

	it('refuses a superuser as the runtime role and accepts erp_app', async () => {
		await expect(assertAppRole(admin as AppDb)).rejects.toThrow(/erp_app/);
		await assertAppRole(app);
	});

	it('matches the database status graph to the application graph', async () => {
		for (const domain of Object.keys(statusTransitions) as StatusDomain[]) {
			const table = statusTransitions[domain] as Record<string, readonly string[]>;
			for (const [from, targets] of Object.entries(table)) {
				for (const to of targets) {
					const rows = await admin.execute<{ ok: boolean }>(
						sql`select app.status_can_transition(${domain}, ${from}, ${to}) as ok`
					);
					expect(rows[0]?.ok).toBe(canTransition(domain, from, to));
				}
				const blocked = await admin.execute<{ ok: boolean }>(
					sql`select app.status_can_transition(${domain}, ${from}, ${'not-a-status'}) as ok`
				);
				expect(blocked[0]?.ok).toBe(false);
			}
		}
	});

	it('rejects a reversed leave transition in the database', async () => {
		await admin
			.update(leaveApplications)
			.set({ status: 'approved' })
			.where(eq(leaveApplications.id, ids.leaveA));
		await expectError(
			() =>
				admin
					.update(leaveApplications)
					.set({ status: 'pending' })
					.where(eq(leaveApplications.id, ids.leaveA)),
			/invalid leave status transition/
		);
	});

	it('rejects a student enrollment that points at another school', async () => {
		await expectError(
			() =>
				admin.insert(studentEnrollments).values({
					schoolId: ids.schoolB,
					studentId: ids.studentA1,
					sectionId: ids.sectionB,
					sessionId: ids.sessionB
				}),
			/foreign key|violates/i
		);
	});

	it('rejects assigning the platform role inside a school', async () => {
		const superAdmin = await roleId('super_admin');
		await expectError(
			() =>
				admin.insert(schoolMemberships).values({
					schoolId: ids.schoolA,
					userId: ids.adminA,
					roleId: superAdmin,
					status: 'active'
				}),
			/platform roles/
		);
	});

	it('returns no school rows when the connection has no tenant user', async () => {
		const rows = await app.execute(sql`select id from students`);
		expect(rows).toHaveLength(0);
	});

	it('does not let a school id setting widen access', async () => {
		const rows = await app.transaction(async (tx) => {
			await tx.execute(sql`select set_config('app.user_id', ${ids.parentA}, true)`);
			await tx.execute(sql`select set_config('app.school_id', ${ids.schoolB}, true)`);
			return tx.execute(sql`select id from students where school_id = ${ids.schoolB}::uuid`);
		});
		expect(rows).toHaveLength(0);
	});

	it('denies a parent, teacher, and admin from opening another school', async () => {
		await expect(withSchoolUser(app, ids.parentA, ids.schoolB, async () => 1)).rejects.toThrow(
			TenantAccessError
		);
		await expect(withSchoolUser(app, ids.teacherA, ids.schoolB, async () => 1)).rejects.toThrow(
			TenantAccessError
		);
		await expect(withSchoolUser(app, ids.adminA, ids.schoolB, async () => 1)).rejects.toThrow(
			TenantAccessError
		);
		await expect(
			runSchoolJob(app, { userId: ids.parentA, schoolId: ids.schoolB, run: async () => 1 })
		).rejects.toThrow(TenantAccessError);
	});

	it('limits parents to their own child and hides the other school', async () => {
		const own = await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			listStudents(tx, ids.schoolA)
		);
		expect(own.map((row) => row.id)).toEqual([ids.studentA1]);

		const marksRows = await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			listMarks(tx, ids.schoolA)
		);
		expect(marksRows.map((row) => row.studentId)).toEqual([ids.studentA1]);

		const fees = await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			listInvoices(tx, ids.schoolA)
		);
		expect(fees.map((row) => row.id)).toEqual([ids.invoiceA]);

		const links = await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			listGuardianLinks(tx, ids.schoolA)
		);
		expect(links).toHaveLength(1);

		const otherParent = await withSchoolUser(app, ids.parentA2, ids.schoolA, (tx) =>
			listStudents(tx, ids.schoolA)
		);
		expect(otherParent).toHaveLength(0);
	});

	it('lets a teacher read their school and not the other school', async () => {
		const studentsInSchool = await withSchoolUser(app, ids.teacherA, ids.schoolA, (tx) =>
			listStudents(tx, ids.schoolA)
		);
		expect(studentsInSchool.map((row) => row.id).sort()).toEqual(
			[ids.studentA1, ids.studentA2].sort()
		);
		const assignments = await withSchoolUser(app, ids.teacherA, ids.schoolA, (tx) =>
			listTeacherAssignments(tx, ids.schoolA)
		);
		expect(assignments).toHaveLength(1);
		expect(assignments[0]?.teacherUserId).toBe(ids.teacherA);

		const examsInSchool = await withSchoolUser(app, ids.teacherA, ids.schoolA, (tx) =>
			listExams(tx, ids.schoolA)
		);
		expect(examsInSchool.map((row) => row.id)).toEqual([ids.examA]);
	});

	it('keeps fees, exams, and files inside the school that owns them', async () => {
		const fees = await withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
			listInvoices(tx, ids.schoolA)
		);
		expect(fees.map((row) => row.id)).toEqual([ids.invoiceA]);
		const examRows = await withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
			listExams(tx, ids.schoolA)
		);
		expect(examRows.map((row) => row.id)).toEqual([ids.examA]);

		await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			authorizeStoredFile(tx, ids.schoolA, ids.fileA)
		);
		await expect(
			withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
				getStoredFile(tx, ids.schoolA, ids.fileB)
			)
		).rejects.toThrow(TenantAccessError);
		await expect(
			withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
				authorizeStoredFile(tx, ids.schoolA, ids.fileB)
			)
		).rejects.toThrow(TenantAccessError);
		await expect(
			withSchoolUser(app, ids.parentA2, ids.schoolA, (tx) =>
				getStoredFile(tx, ids.schoolA, ids.fileA)
			)
		).rejects.toThrow(TenantAccessError);
	});

	it('rejects writes that try to move or create rows in another school', async () => {
		await expect(
			withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
				tx.insert(students).values({
					schoolId: ids.schoolB,
					admissionNo: 'stolen',
					firstName: 'Stolen',
					lastName: 'Row'
				})
			)
		).rejects.toThrow(TenantAccessError);
		const [movable] = await admin
			.insert(students)
			.values({
				schoolId: ids.schoolA,
				admissionNo: 'A-move',
				firstName: 'Move',
				lastName: 'Me'
			})
			.returning();
		await expectError(
			() =>
				app.transaction(async (tx) => {
					await tx.execute(sql`select set_config('app.user_id', ${ids.adminA}, true)`);
					await tx.execute(
						sql`update students set school_id = ${ids.schoolB}::uuid where id = ${movable.id}::uuid`
					);
				}),
			/row-level security/
		);
	});

	it('lets a platform admin manage schools without reading student rows', async () => {
		const visible = await withPlatformAdmin(app, ids.platform, (tx) => tx.select().from(students));
		expect(visible.some((row) => row.id === ids.studentA1)).toBe(false);
		expect(visible.some((row) => row.id === ids.studentB)).toBe(false);
		const schoolRows = await withPlatformAdmin(app, ids.platform, (tx) =>
			tx.select().from(schools)
		);
		expect(schoolRows.some((row) => row.id === ids.schoolA)).toBe(true);
		expect(schoolRows.some((row) => row.id === ids.schoolB)).toBe(true);
		await withPlatformAdmin(app, ids.platform, (tx) =>
			tx.insert(schools).values({ name: 'West School', code: 'west' })
		);
		await expect(
			withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
				tx.insert(schools).values({ name: 'East School', code: 'east' })
			)
		).rejects.toThrow(TenantAccessError);
	});

	it('blocks a school admin from promoting a user to platform admin', async () => {
		await expect(
			withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
				tx.execute(
					sql`insert into users (full_name, email, is_platform_admin) values ('Hacker', 'hacker@school.test', true)`
				)
			)
		).rejects.toThrow(/permission denied|is_platform_admin/);
	});

	it('blocks a parent from writing fees or reading the audit log', async () => {
		const [fee] = await admin
			.select()
			.from(feeStructures)
			.where(eq(feeStructures.schoolId, ids.schoolA));
		await expect(
			withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
				tx.insert(invoices).values({
					schoolId: ids.schoolA,
					studentId: ids.studentA1,
					feeStructureId: fee.id,
					periodLabel: '2026-05',
					amountPaise: 1,
					dueOn: '2026-05-10'
				})
			)
		).rejects.toThrow(TenantAccessError);
		await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			writeAudit(tx, {
				schoolId: ids.schoolA,
				actorUserId: ids.parentA,
				action: 'complaint.view',
				entityType: 'student',
				entityId: ids.studentA1
			})
		);
		const parentAudit = await withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
			tx.select().from(schema.auditEvents)
		);
		expect(parentAudit).toHaveLength(0);
		const adminAudit = await withSchoolUser(app, ids.adminA, ids.schoolA, (tx) =>
			tx.select().from(schema.auditEvents)
		);
		expect(adminAudit.length).toBeGreaterThan(0);
	});

	it('does not let a parent notify another user or decide leave', async () => {
		await expect(
			withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
				createNotification(tx, {
					schoolId: ids.schoolA,
					userId: ids.adminA,
					title: 'Hello',
					body: 'Not allowed'
				})
			)
		).rejects.toThrow(TenantAccessError);
		const [pending] = await admin
			.insert(leaveApplications)
			.values({
				schoolId: ids.schoolA,
				studentId: ids.studentA1,
				requestedBy: ids.parentA,
				startDate: '2026-06-01',
				endDate: '2026-06-01',
				reason: 'Appointment'
			})
			.returning();
		await expect(
			withSchoolUser(app, ids.parentA, ids.schoolA, (tx) =>
				updateLeaveStatus(tx, { schoolId: ids.schoolA, leaveId: pending.id, to: 'cancelled' })
			)
		).rejects.toThrow(TenantAccessError);
	});
});
