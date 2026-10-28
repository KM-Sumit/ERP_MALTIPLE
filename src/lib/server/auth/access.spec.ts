import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { beforeAll, describe, expect, it } from 'vitest';
import { bindSchoolRequest } from '../authz/school-context';
import { TenantAccessError } from '../authz/errors';
import * as schema from '../db/schema';
import {
	academicSessions,
	classes,
	guardianStudents,
	roles,
	schoolMemberships,
	schoolSettings,
	schools,
	sections,
	studentEnrollments,
	students,
	subjects,
	teacherAssignments,
	users
} from '../db/schema';
import { withPlatformAdmin, withSchoolUser } from '../db/tenant';
import {
	addAcademicStructure,
	assignManagerPermissions,
	createSchool,
	exportSchoolReport,
	provisionSchoolAdmin,
	markAttendance,
	raiseComplaint,
	setSchoolStatus
} from '../schools/service';
import { hashPassword } from './password';
import { readSession, revokeToken } from './session';
import {
	acceptInvitation,
	bootstrapPlatformAdmin,
	login,
	requestPasswordReset,
	resetPassword,
	selectSchool
} from './service';

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
const password = 'correct-horse-battery';
const ids = {
	platform: randomUUID(),
	admin: randomUUID(),
	manager: randomUUID(),
	teacher: randomUUID(),
	parent: randomUUID(),
	school: randomUUID(),
	session: randomUUID(),
	sectionA: randomUUID(),
	sectionB: randomUUID(),
	subject: randomUUID(),
	studentA: randomUUID(),
	studentB: randomUUID(),
	managerMembership: randomUUID()
};

function errorText(error: unknown) {
	const parts: string[] = [];
	const seen = new Set<unknown>();
	let current: unknown = error;
	while (current && typeof current === 'object' && !seen.has(current)) {
		seen.add(current);
		if ('message' in current && current.message) parts.push(String(current.message));
		current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
	}
	return parts.join('\n');
}

async function roleId(key: string) {
	const [role] = await admin.select().from(roles).where(eq(roles.key, key));
	if (!role) throw new Error(`missing ${key}`);
	return role.id;
}

describe('authentication and authorization', () => {
	beforeAll(async () => {
		await migrate(admin, { migrationsFolder: './drizzle' });
		const passwordHash = await hashPassword(password);
		const schoolAdmin = await roleId('school_admin');
		const manager = await roleId('manager_admin');
		const teacher = await roleId('teacher');
		const parent = await roleId('parent');
		await admin.insert(users).values([
			{
				id: ids.platform,
				fullName: 'Platform',
				email: `platform-${suffix}@school.test`,
				passwordHash,
				isPlatformAdmin: true,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.admin,
				fullName: 'Admin',
				email: `admin-${suffix}@school.test`,
				passwordHash,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.manager,
				fullName: 'Manager',
				email: `manager-${suffix}@school.test`,
				passwordHash,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.teacher,
				fullName: 'Teacher',
				email: `teacher-${suffix}@school.test`,
				passwordHash,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.parent,
				fullName: 'Parent',
				email: `parent-${suffix}@school.test`,
				passwordHash,
				emailVerifiedAt: new Date()
			}
		]);
		await admin
			.insert(schools)
			.values({ id: ids.school, name: 'Access School', code: `access-${suffix}` });
		await admin.insert(schoolSettings).values({ schoolId: ids.school });
		await admin.insert(schoolMemberships).values([
			{ schoolId: ids.school, userId: ids.admin, roleId: schoolAdmin, status: 'active' },
			{
				id: ids.managerMembership,
				schoolId: ids.school,
				userId: ids.manager,
				roleId: manager,
				status: 'active'
			},
			{ schoolId: ids.school, userId: ids.teacher, roleId: teacher, status: 'active' },
			{ schoolId: ids.school, userId: ids.parent, roleId: parent, status: 'active' }
		]);
		await admin.insert(academicSessions).values({
			id: ids.session,
			schoolId: ids.school,
			name: '2026',
			startDate: '2026-04-01',
			endDate: '2027-03-31',
			status: 'active'
		});
		const [createdClass] = await admin
			.insert(classes)
			.values({ schoolId: ids.school, sessionId: ids.session, name: 'Grade 1', gradeLevel: 1 })
			.returning();
		await admin.insert(sections).values([
			{ id: ids.sectionA, schoolId: ids.school, classId: createdClass.id, name: 'A' },
			{ id: ids.sectionB, schoolId: ids.school, classId: createdClass.id, name: 'B' }
		]);
		await admin
			.insert(subjects)
			.values({ id: ids.subject, schoolId: ids.school, name: 'Math', code: `math-${suffix}` });
		await admin.insert(students).values([
			{
				id: ids.studentA,
				schoolId: ids.school,
				admissionNo: `A-${suffix}`,
				firstName: 'Asha',
				lastName: 'One'
			},
			{
				id: ids.studentB,
				schoolId: ids.school,
				admissionNo: `B-${suffix}`,
				firstName: 'Bina',
				lastName: 'Two'
			}
		]);
		await admin.insert(studentEnrollments).values([
			{
				schoolId: ids.school,
				studentId: ids.studentA,
				sectionId: ids.sectionA,
				sessionId: ids.session
			},
			{
				schoolId: ids.school,
				studentId: ids.studentB,
				sectionId: ids.sectionB,
				sessionId: ids.session
			}
		]);
		await admin.insert(teacherAssignments).values({
			schoolId: ids.school,
			teacherUserId: ids.teacher,
			sectionId: ids.sectionA,
			subjectId: ids.subject,
			sessionId: ids.session
		});
		await admin.insert(guardianStudents).values({
			schoolId: ids.school,
			guardianUserId: ids.parent,
			studentId: ids.studentA,
			relationship: 'mother'
		});
	});

	it('refuses a second platform bootstrap', async () => {
		await expect(
			bootstrapPlatformAdmin(app, {
				email: `another-${suffix}@school.test`,
				fullName: 'Another',
				password
			})
		).rejects.toThrow(/already complete/);
	});

	it('logs in, locks repeated failures, and rejects a disabled account', async () => {
		expect((await login(app, `missing-${suffix}@school.test`, password)).status).toBe('invalid');
		expect((await login(app, `admin-${suffix}@school.test`, password)).status).toBe('session');
		expect((await login(app, `admin-${suffix}@school.test`, 'wrong-password')).status).toBe(
			'invalid'
		);

		const lockedEmail = `locked-${suffix}@school.test`;
		await admin.insert(users).values({
			fullName: 'Locked',
			email: lockedEmail,
			passwordHash: await hashPassword(password),
			emailVerifiedAt: new Date()
		});
		for (let attempt = 0; attempt < 5; attempt += 1) {
			expect((await login(app, lockedEmail, 'wrong-password')).status).toBe('invalid');
		}
		expect((await login(app, lockedEmail, password)).status).toBe('locked');

		const disabledEmail = `disabled-${suffix}@school.test`;
		await admin.insert(users).values({
			fullName: 'Disabled',
			email: disabledEmail,
			passwordHash: await hashPassword(password),
			emailVerifiedAt: new Date(),
			status: 'disabled'
		});
		expect((await login(app, disabledEmail, password)).status).toBe('disabled');
	});

	it('resets a password and revokes the previous session', async () => {
		const email = `reset-${suffix}@school.test`;
		await admin.insert(users).values({
			fullName: 'Reset',
			email,
			passwordHash: await hashPassword(password),
			emailVerifiedAt: new Date()
		});
		const first = await login(app, email, password);
		if (first.status !== 'session') throw new Error('expected session');
		const issued = await requestPasswordReset(app, email);
		expect(issued.token).toBeTruthy();
		await resetPassword(app, issued.token!, 'replacement-password');
		expect(await readSession(app, first.token)).toBeNull();
		expect((await login(app, email, 'replacement-password')).status).toBe('session');
		expect((await requestPasswordReset(app, `nobody-${suffix}@school.test`)).token).toBeNull();
	});

	it('activates an invitation and rejects a forged school selection', async () => {
		const token = await provisionSchoolAdmin(
			app,
			ids.platform,
			ids.school,
			`invited-${suffix}@school.test`,
			'Invited Admin'
		);
		await acceptInvitation(app, token, { fullName: 'Invited Admin', password });
		const session = await login(app, `invited-${suffix}@school.test`, password);
		if (session.status !== 'session') throw new Error('expected session');
		await expect(selectSchool(app, session.token, randomUUID())).rejects.toThrow(/not available/);
		const loaded = await readSession(app, session.token);
		expect(loaded?.schoolId).toBe(ids.school);
		await revokeToken(app, session.token);
		expect(await readSession(app, session.token)).toBeNull();
	});

	it('gives a manager only explicit permissions', async () => {
		await expect(
			addAcademicStructure(app, ids.manager, ids.school, {
				className: 'Grade 2',
				gradeLevel: 2,
				sectionName: 'A'
			})
		).rejects.toThrow(TenantAccessError);
		await assignManagerPermissions(app, ids.admin, ids.school, ids.managerMembership, [
			'classes.manage'
		]);
		await addAcademicStructure(app, ids.manager, ids.school, {
			className: 'Grade 2',
			gradeLevel: 2,
			sectionName: 'A'
		});
		await expect(
			assignManagerPermissions(app, ids.teacher, ids.school, ids.managerMembership, [
				'classes.manage'
			])
		).rejects.toThrow(/permission denied/);
		await expect(
			assignManagerPermissions(app, ids.admin, ids.school, ids.managerMembership, [
				'schools.create'
			])
		).rejects.toThrow(/cannot be assigned/);
	});

	it('keeps teachers and parents inside their assignments', async () => {
		const visible = await withSchoolUser(app, ids.teacher, ids.school, (tx) =>
			tx.select().from(students)
		);
		expect(visible.map((row) => row.id)).toEqual([ids.studentA]);
		await expect(
			markAttendance(app, ids.teacher, ids.school, {
				studentId: ids.studentB,
				sectionId: ids.sectionB,
				status: 'present'
			})
		).rejects.toThrow(TenantAccessError);
		await markAttendance(app, ids.teacher, ids.school, {
			studentId: ids.studentA,
			sectionId: ids.sectionA,
			status: 'present'
		});

		const children = await withSchoolUser(app, ids.parent, ids.school, (tx) =>
			tx.select().from(students)
		);
		expect(children.map((row) => row.id)).toEqual([ids.studentA]);
		await expect(
			raiseComplaint(app, ids.parent, ids.school, ids.studentB, 'Fees', 'Please check this.')
		).rejects.toThrow(TenantAccessError);
		await expect(exportSchoolReport(app, ids.parent, ids.school)).rejects.toThrow(
			TenantAccessError
		);
		const csv = await exportSchoolReport(app, ids.admin, ids.school);
		expect(csv).toContain(`A-${suffix}`);
		expect(csv).not.toContain('north');
	});

	it('rejects forged school identifiers, suspended schools, and platform record edits', async () => {
		expect(() =>
			bindSchoolRequest(
				{ userId: ids.admin, schoolId: ids.school, membershipSchoolIds: [ids.school] },
				randomUUID()
			)
		).toThrow(TenantAccessError);
		await expect(createSchool(app, ids.admin, 'Copied School', `copied-${suffix}`)).rejects.toThrow(
			TenantAccessError
		);
		const created = await createSchool(app, ids.platform, 'Limit School', `limit-${suffix}`);
		await expect(
			createSchool(app, ids.platform, 'Limit School', `limit-${suffix}`)
		).rejects.toThrow(/already exists/);
		await expect(
			withPlatformAdmin(app, ids.platform, (tx) =>
				tx.update(schools).set({ name: 'Renamed by platform' }).where(eq(schools.id, created))
			)
		).rejects.toSatisfy((error: unknown) => /school identity/.test(errorText(error)));
		await setSchoolStatus(app, ids.platform, ids.school, 'suspended', `access-${suffix}`);
		await expect(withSchoolUser(app, ids.admin, ids.school, async () => 1)).rejects.toThrow(
			TenantAccessError
		);
		await setSchoolStatus(app, ids.platform, ids.school, 'active', `access-${suffix}`);
		await setSchoolStatus(app, ids.platform, ids.school, 'archived', `access-${suffix}`);
		await expect(
			setSchoolStatus(app, ids.platform, ids.school, 'active', `access-${suffix}`)
		).rejects.toThrow(/archived -> active/);
	});
});
