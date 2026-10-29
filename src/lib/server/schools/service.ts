import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { isAssignablePermission } from '../../permissions';
import { AuthError } from '../auth/service';
import { hashToken, newToken } from '../auth/password';
import { rowsOf } from '../auth/session';
import { writeAudit } from '../audit/log';
import { TenantAccessError, pgCode } from '../authz/errors';
import { assertStatusTransition } from '../domain/transitions';
import {
	academicSessions,
	attendanceRecords,
	auditEvents,
	classes,
	complaintAttachments,
	complaints,
	feeStructures,
	guardianStudents,
	membershipPermissions,
	roles,
	schoolMemberships,
	schoolNotices,
	schoolOnboarding,
	schoolSettings,
	schools,
	sections,
	students,
	subjects,
	systemSettings,
	teacherAssignments
} from '../db/schema';
import { withPlatformAdmin, withSchoolUser, type AppDb, type TenantTx } from '../db/tenant';

export const ONBOARDING_STEPS = [
	'profile',
	'address',
	'session',
	'classes',
	'staff',
	'policies',
	'fees',
	'locale',
	'review'
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const SCHOOL_ROLES = ['school_admin', 'manager_admin', 'teacher', 'parent'] as const;

const MANAGER_HOME_PERMISSIONS = [
	'classes.manage',
	'timetables.manage',
	'exams.manage',
	'users.manage',
	'fees.configure',
	'complaints.resolve',
	'documents.approve',
	'reports.export',
	'school.settings.manage'
] as const;

function clean(value: unknown) {
	return String(value ?? '').trim();
}

function permissionList(keys: string[]) {
	if (keys.some((key) => !/^[a-z0-9.]+$/.test(key)))
		throw new AuthError('That permission cannot be assigned.');
	return `{${keys.join(',')}}`;
}

async function requirePermission(tx: TenantTx, schoolId: string, keys: string[]) {
	const result = await tx.execute(
		sql`select app.has_any_permission(${schoolId}::uuid, ${permissionList(keys)}::text[]) as ok`
	);
	if (rowsOf(result)[0]?.ok !== true) throw new TenantAccessError('permission denied');
}

function schoolCode(name: string) {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 24);
	return base.length >= 2 ? base : 'school';
}

export async function openSchool(
	db: AppDb,
	actorId: string,
	input: { name: string; seats: string; bill: string }
) {
	const name = clean(input.name);
	if (name.length < 2 || name.length > 120) throw new AuthError('Enter the school name.');
	const seats = Number(input.seats);
	if (!Number.isInteger(seats) || seats < 1 || seats > 100000) {
		throw new AuthError('Enter how many children this school can take.');
	}
	if (input.bill !== 'paid' && input.bill !== 'unpaid') {
		throw new AuthError('Choose whether this school has paid.');
	}
	return withPlatformAdmin(db, actorId, async (tx) => {
		const base = schoolCode(name);
		let code = base;
		for (let attempt = 1; attempt < 20; attempt += 1) {
			const taken = await tx.execute(
				sql`select 1 as hit from schools where code = ${code} and deleted_at is null`
			);
			if (!rowsOf(taken).length) break;
			code = `${base.slice(0, 20)}-${attempt + 1}`;
		}
		const result = await tx.execute(sql`select app.create_school(${name}, ${code}) as school_id`);
		const schoolId = String(rowsOf(result)[0]?.school_id ?? '');
		if (!schoolId) throw new AuthError('School could not be created.');
		await tx.execute(sql`select app.set_school_limits(${schoolId}::uuid, 'standard', ${seats})`);
		await tx.execute(sql`select app.set_school_subscription(${schoolId}::uuid, ${input.bill})`);
		await writeAudit(tx, {
			schoolId,
			actorUserId: actorId,
			action: 'schools.create',
			entityType: 'school',
			entityId: schoolId,
			metadata: { seats, bill: input.bill }
		});
		return schoolId;
	});
}

export async function setSchoolBill(db: AppDb, actorId: string, schoolId: string, bill: string) {
	if (bill !== 'paid' && bill !== 'unpaid')
		throw new AuthError('Choose whether this school has paid.');
	await withPlatformAdmin(db, actorId, async (tx) => {
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		if (!school || school.deletedAt) throw new AuthError('School not found.');
		await tx.execute(sql`select app.set_school_subscription(${schoolId}::uuid, ${bill})`);
		await writeAudit(tx, {
			schoolId,
			actorUserId: actorId,
			action: 'schools.update',
			entityType: 'school',
			entityId: schoolId,
			metadata: { bill }
		});
	});
}

export async function platformBoard(db: AppDb, actorId: string) {
	return withPlatformAdmin(db, actorId, async (tx) => {
		const result = await tx.execute(sql`
			select s.id, s.name, s.status, ss.student_limit, ss.subscription_status
			from schools s
			join school_settings ss on ss.school_id = s.id
			where s.deleted_at is null
			order by s.created_at desc
			limit 100
		`);
		return rowsOf(result).map((row) => ({
			id: String(row.id),
			name: String(row.name),
			status: String(row.status),
			studentLimit: row.student_limit == null ? null : Number(row.student_limit),
			bill: String(row.subscription_status) === 'paid' ? 'paid' : 'unpaid'
		}));
	});
}

export async function createSchool(db: AppDb, actorId: string, name: string, code: string) {
	const normalized = code.trim().toLowerCase();
	try {
		return await withPlatformAdmin(db, actorId, async (tx) => {
			const result = await tx.execute(
				sql`select app.create_school(${name}, ${normalized}) as school_id`
			);
			const schoolId = String(rowsOf(result)[0]?.school_id ?? '');
			if (!schoolId) throw new AuthError('School could not be created.');
			await writeAudit(tx, {
				schoolId,
				actorUserId: actorId,
				action: 'schools.create',
				entityType: 'school',
				entityId: schoolId
			});
			return schoolId;
		});
	} catch (error) {
		if (pgCode(error) === '23505') throw new AuthError('A school with this code already exists.');
		throw error;
	}
}

export async function listSchools(
	db: AppDb,
	actorId: string,
	query: { q: string; status: string; page: number }
) {
	const limit = 10;
	const offset = (query.page - 1) * limit;
	return withPlatformAdmin(db, actorId, async (tx) => {
		const filters = [sql`${schools.deletedAt} is null`];
		if (query.status === 'active' || query.status === 'suspended' || query.status === 'archived') {
			filters.push(eq(schools.status, query.status));
		}
		if (query.q) {
			const pattern = `%${query.q.replace(/[%_\\]/g, '')}%`;
			filters.push(or(ilike(schools.name, pattern), ilike(schools.code, pattern))!);
		}
		const where = and(...filters);
		const items = await tx
			.select()
			.from(schools)
			.where(where)
			.orderBy(desc(schools.createdAt))
			.limit(limit)
			.offset(offset);
		const count = await tx.execute(
			sql`select count(*)::int as total from schools where deleted_at is null
				and (${query.status} = 'all' or status = ${query.status})
				and (${query.q} = '' or name ilike ${'%' + query.q.replace(/[%_\\]/g, '') + '%'} or code ilike ${'%' + query.q.replace(/[%_\\]/g, '') + '%'})`
		);
		return { items, total: Number(rowsOf(count)[0]?.total ?? 0), limit };
	});
}

export async function platformOverview(db: AppDb, actorId: string) {
	return withPlatformAdmin(db, actorId, async (tx) => {
		const result = await tx.execute(sql`select app.platform_overview() as overview`);
		return rowsOf(result)[0]?.overview as {
			schools: number;
			active: number;
			suspended: number;
			archived: number;
			users: number;
		};
	});
}

export async function getSchoolAdminView(db: AppDb, actorId: string, schoolId: string) {
	return withPlatformAdmin(db, actorId, async (tx) => {
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		if (!school) return null;
		const [settings] = await tx
			.select()
			.from(schoolSettings)
			.where(eq(schoolSettings.schoolId, schoolId));
		const [onboarding] = await tx
			.select()
			.from(schoolOnboarding)
			.where(eq(schoolOnboarding.schoolId, schoolId));
		const usage = rowsOf(
			await tx.execute(sql`select app.school_usage(${schoolId}::uuid) as usage`)
		)[0]?.usage;
		const admins = await tx.execute(sql`
			select u.full_name, u.email, m.status
			from school_memberships m
			join users u on u.id = m.user_id
			join roles r on r.id = m.role_id
			where m.school_id = ${schoolId}::uuid and r.key = 'school_admin' and m.deleted_at is null
		`);
		return { school, settings, onboarding, usage, admins: rowsOf(admins) };
	});
}

export async function setSchoolStatus(
	db: AppDb,
	actorId: string,
	schoolId: string,
	status: 'active' | 'suspended' | 'archived',
	confirmation: string
) {
	return withPlatformAdmin(db, actorId, async (tx) => {
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		if (!school) throw new AuthError('School not found.');
		if (confirmation.trim().toLowerCase() !== school.code) {
			throw new AuthError('Type the school code to confirm this change.');
		}
		assertStatusTransition('school', school.status, status);
		await tx.update(schools).set({ status }).where(eq(schools.id, schoolId));
		await writeAudit(tx, {
			schoolId,
			actorUserId: actorId,
			action: 'schools.update',
			entityType: 'school',
			entityId: schoolId,
			metadata: { status }
		});
	});
}

export async function setSchoolLimits(
	db: AppDb,
	actorId: string,
	schoolId: string,
	planKey: string,
	studentLimit: number | null
) {
	const plan = planKey.trim().toLowerCase();
	if (!/^[a-z0-9-]{2,32}$/.test(plan)) throw new AuthError('Plan name is invalid.');
	await withPlatformAdmin(db, actorId, (tx) =>
		tx.execute(sql`select app.set_school_limits(${schoolId}::uuid, ${plan}, ${studentLimit})`)
	);
}

export async function provisionSchoolAdmin(
	db: AppDb,
	actorId: string,
	schoolId: string,
	email: string,
	fullName: string
) {
	const token = newToken();
	const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
	await withPlatformAdmin(db, actorId, async (tx) => {
		await tx.execute(
			sql`select app.provision_school_admin(${schoolId}::uuid, ${email}, ${fullName.trim()}, ${hashToken(token)}, ${expires})`
		);
		await writeAudit(tx, {
			schoolId,
			actorUserId: actorId,
			action: 'users.manage',
			entityType: 'invitation',
			metadata: { email: email.trim().toLowerCase(), role: 'school_admin' }
		});
	});
	return token;
}

export async function listPlatformAudit(db: AppDb, actorId: string) {
	return withPlatformAdmin(db, actorId, (tx) =>
		tx.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(50)
	);
}

export async function saveOperations(
	db: AppDb,
	actorId: string,
	value: { status: string; message: string }
) {
	const status = value.status === 'disrupted' ? 'disrupted' : 'operational';
	await withPlatformAdmin(db, actorId, (tx) =>
		tx
			.insert(systemSettings)
			.values({ key: 'operations', value: { status, message: value.message.slice(0, 280) } })
			.onConflictDoUpdate({
				target: systemSettings.key,
				set: { value: { status, message: value.message.slice(0, 280) } }
			})
	);
}

export async function readOperations(db: AppDb, actorId: string) {
	return withPlatformAdmin(db, actorId, async (tx) => {
		const [row] = await tx
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, 'operations'));
		return (
			(row?.value as { status?: string; message?: string } | undefined) ?? {
				status: 'operational',
				message: ''
			}
		);
	});
}

async function requireSettings(tx: TenantTx, schoolId: string) {
	await requirePermission(tx, schoolId, ['school.settings.manage']);
}

export async function schoolHome(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		const [settings] = await tx
			.select()
			.from(schoolSettings)
			.where(eq(schoolSettings.schoolId, schoolId));
		const [onboarding] = await tx
			.select()
			.from(schoolOnboarding)
			.where(eq(schoolOnboarding.schoolId, schoolId));
		const notices = await tx
			.select()
			.from(schoolNotices)
			.where(eq(schoolNotices.schoolId, schoolId))
			.orderBy(desc(schoolNotices.createdAt))
			.limit(5);
		return { school, settings, onboarding, notices };
	});
}

export async function saveOnboardingStep(
	db: AppDb,
	userId: string,
	schoolId: string,
	step: OnboardingStep,
	fields: Record<string, string>
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requireSettings(tx, schoolId);
		if (step === 'profile') {
			const name = clean(fields.name);
			if (name.length < 2) throw new AuthError('Enter the school name.');
			await tx.update(schools).set({ name }).where(eq(schools.id, schoolId));
			await tx
				.update(schoolSettings)
				.set({
					contactEmail: clean(fields.contactEmail) || null,
					contactPhone: clean(fields.contactPhone) || null
				})
				.where(eq(schoolSettings.schoolId, schoolId));
		}
		if (step === 'address') {
			const theme = clean(fields.themeColor) || '#0f766e';
			if (!/^#[0-9a-fA-F]{6}$/.test(theme)) throw new AuthError('Use a hex color such as #0f766e.');
			const logo = clean(fields.logoPath);
			if (logo && !/^https:\/\/.{3,200}$/.test(logo)) {
				throw new AuthError('Logo must be an https URL.');
			}
			await tx
				.update(schoolSettings)
				.set({
					address: clean(fields.address),
					themeColor: theme.toLowerCase(),
					logoPath: logo || null
				})
				.where(eq(schoolSettings.schoolId, schoolId));
		}
		if (step === 'session') {
			const name = clean(fields.sessionName);
			if (name) {
				await tx.insert(academicSessions).values({
					schoolId,
					name,
					startDate: clean(fields.startDate),
					endDate: clean(fields.endDate),
					status: 'planned'
				});
			}
		}
		if (step === 'classes') {
			const [session] = await tx
				.select()
				.from(academicSessions)
				.where(eq(academicSessions.schoolId, schoolId))
				.limit(1);
			if (!session) throw new AuthError('Create an academic session first.');
			const className = clean(fields.className);
			if (className) {
				const grade = Number(fields.gradeLevel);
				if (!Number.isInteger(grade) || grade < 0 || grade > 20) {
					throw new AuthError('Grade level must be between 0 and 20.');
				}
				const [created] = await tx
					.insert(classes)
					.values({
						schoolId,
						sessionId: session.id,
						name: className,
						gradeLevel: grade
					})
					.returning();
				if (clean(fields.sectionName)) {
					await tx.insert(sections).values({
						schoolId,
						classId: created.id,
						name: clean(fields.sectionName)
					});
				}
			}
			if (clean(fields.subjectName)) {
				await tx.insert(subjects).values({
					schoolId,
					name: clean(fields.subjectName),
					code: clean(fields.subjectCode).toLowerCase()
				});
			}
		}
		if (step === 'policies') {
			await tx
				.update(schoolSettings)
				.set({
					attendancePolicy: clean(fields.attendancePolicy),
					gradingPolicy: clean(fields.gradingPolicy)
				})
				.where(eq(schoolSettings.schoolId, schoolId));
		}
		if (step === 'fees') {
			const [session] = await tx
				.select()
				.from(academicSessions)
				.where(eq(academicSessions.schoolId, schoolId))
				.limit(1);
			const amount = Number(fields.amountRupees);
			if (session && clean(fields.feeName) && Number.isFinite(amount) && amount > 0) {
				await tx.insert(feeStructures).values({
					schoolId,
					sessionId: session.id,
					name: clean(fields.feeName),
					amountPaise: Math.round(amount * 100)
				});
			}
		}
		if (step === 'locale') {
			const timezone = clean(fields.timezone);
			const currency = clean(fields.currency).toUpperCase();
			const locale = clean(fields.locale);
			try {
				new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
			} catch {
				throw new AuthError('Choose a valid time zone.');
			}
			if (!/^[A-Z]{3}$/.test(currency)) throw new AuthError('Currency must be three letters.');
			await tx
				.update(schoolSettings)
				.set({ timezone, currency, locale })
				.where(eq(schoolSettings.schoolId, schoolId));
		}
		const index = ONBOARDING_STEPS.indexOf(step);
		const next = ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)];
		const [existing] = await tx
			.select()
			.from(schoolOnboarding)
			.where(eq(schoolOnboarding.schoolId, schoolId));
		await tx
			.update(schoolOnboarding)
			.set({
				step: existing?.completedAt ? existing.step : step === 'review' ? 'review' : next,
				completedAt: step === 'review' ? new Date() : (existing?.completedAt ?? null),
				draft: fields
			})
			.where(eq(schoolOnboarding.schoolId, schoolId));
	});
}

export async function academicCatalog(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['classes.manage', 'school.records.manage']);
		return {
			sessions: await tx
				.select()
				.from(academicSessions)
				.where(eq(academicSessions.schoolId, schoolId)),
			classes: await tx.select().from(classes).where(eq(classes.schoolId, schoolId)),
			sections: await tx.select().from(sections).where(eq(sections.schoolId, schoolId)),
			subjects: await tx.select().from(subjects).where(eq(subjects.schoolId, schoolId))
		};
	});
}

export async function addAcademicStructure(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		sessionName?: string;
		startDate?: string;
		endDate?: string;
		className?: string;
		gradeLevel?: number;
		sectionName?: string;
		subjectName?: string;
		subjectCode?: string;
	}
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['classes.manage', 'school.records.manage']);
		if (input.sessionName) {
			await tx.insert(academicSessions).values({
				schoolId,
				name: clean(input.sessionName),
				startDate: clean(input.startDate),
				endDate: clean(input.endDate),
				status: 'planned'
			});
		}
		const [session] = await tx
			.select()
			.from(academicSessions)
			.where(eq(academicSessions.schoolId, schoolId))
			.limit(1);
		if (input.className) {
			if (!session) throw new AuthError('Create an academic session first.');
			const grade = Number(input.gradeLevel);
			if (!Number.isInteger(grade) || grade < 0 || grade > 20) {
				throw new AuthError('Grade level must be between 0 and 20.');
			}
			const [created] = await tx
				.insert(classes)
				.values({
					schoolId,
					sessionId: session.id,
					name: clean(input.className),
					gradeLevel: grade
				})
				.returning();
			if (input.sectionName) {
				await tx.insert(sections).values({
					schoolId,
					classId: created.id,
					name: clean(input.sectionName)
				});
			}
		}
		if (input.subjectName) {
			await tx.insert(subjects).values({
				schoolId,
				name: clean(input.subjectName),
				code: clean(input.subjectCode).toLowerCase()
			});
		}
	});
}

export async function listStaff(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, [
			'users.manage',
			'school.members.manage',
			'roles.assign'
		]);
		const members = await tx.execute(sql`
			select m.id, u.full_name, u.email, r.key as role_key, m.status
			from school_memberships m
			join users u on u.id = m.user_id
			join roles r on r.id = m.role_id
			where m.school_id = ${schoolId}::uuid and m.deleted_at is null
			order by u.full_name
		`);
		const grants = await tx.select().from(membershipPermissions);
		return { members: rowsOf(members), grants };
	});
}

export async function inviteStaff(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { email: string; fullName: string; roleKey: string }
) {
	if (!SCHOOL_ROLES.includes(input.roleKey as (typeof SCHOOL_ROLES)[number])) {
		throw new AuthError('That role cannot be assigned.');
	}
	const token = newToken();
	const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
	const email = input.email.trim().toLowerCase();
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await tx.execute(
			sql`select app.invite_school_member(${schoolId}::uuid, ${email}, ${input.fullName.trim()}, ${input.roleKey}, ${hashToken(token)}, ${expires})`
		);
		if (input.roleKey === 'manager_admin') {
			const keys = `{${MANAGER_HOME_PERMISSIONS.join(',')}}`;
			await tx.execute(sql`
				insert into membership_permissions (membership_id, permission_key)
				select m.id, key
				from school_memberships m
				join users u on u.id = m.user_id
				join roles r on r.id = m.role_id
				cross join unnest(${keys}::text[]) as key
				where m.school_id = ${schoolId}::uuid
					and lower(u.email) = ${email}
					and r.key = 'manager_admin'
					and m.deleted_at is null
				on conflict do nothing
			`);
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'users.manage',
			entityType: 'invitation',
			metadata: { email, role: input.roleKey }
		});
	});
	return token;
}

export async function assignManagerPermissions(
	db: AppDb,
	userId: string,
	schoolId: string,
	membershipId: string,
	keys: string[]
) {
	if (keys.some((key) => !isAssignablePermission(key))) {
		throw new AuthError('That permission cannot be assigned.');
	}
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, [
			'roles.assign',
			'users.manage',
			'school.members.manage'
		]);
		const [membership] = await tx
			.select()
			.from(schoolMemberships)
			.where(and(eq(schoolMemberships.id, membershipId), eq(schoolMemberships.schoolId, schoolId)));
		if (!membership) throw new TenantAccessError('permission denied');
		const [role] = await tx.select().from(roles).where(eq(roles.id, membership.roleId));
		if (role?.key !== 'manager_admin') {
			throw new AuthError('Only manager accounts receive explicit module permissions.');
		}
		await tx
			.delete(membershipPermissions)
			.where(eq(membershipPermissions.membershipId, membershipId));
		if (keys.length) {
			await tx
				.insert(membershipPermissions)
				.values(keys.map((permissionKey) => ({ membershipId, permissionKey })));
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'roles.assign',
			entityType: 'membership',
			entityId: membershipId,
			metadata: { permissions: keys }
		});
	});
}

export async function setMembershipStatus(
	db: AppDb,
	userId: string,
	schoolId: string,
	membershipId: string,
	status: 'active' | 'suspended'
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['users.manage', 'school.members.manage']);
		const [membership] = await tx
			.select()
			.from(schoolMemberships)
			.where(and(eq(schoolMemberships.id, membershipId), eq(schoolMemberships.schoolId, schoolId)));
		if (!membership) throw new TenantAccessError('permission denied');
		assertStatusTransition('membership', membership.status, status);
		await tx
			.update(schoolMemberships)
			.set({ status })
			.where(eq(schoolMemberships.id, membershipId));
		if (status === 'suspended') {
			await tx.execute(sql`select app.revoke_user_sessions(${membership.userId}::uuid)`);
		}
	});
}

export async function listPeople(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['school.records.manage', 'users.manage']);
		return {
			students: await tx.select().from(students).where(eq(students.schoolId, schoolId)),
			links: await tx.select().from(guardianStudents).where(eq(guardianStudents.schoolId, schoolId))
		};
	});
}

export async function addStudent(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { admissionNo: string; firstName: string; lastName: string }
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['school.records.manage', 'users.manage']);
		try {
			const [student] = await tx
				.insert(students)
				.values({
					schoolId,
					admissionNo: clean(input.admissionNo),
					firstName: clean(input.firstName),
					lastName: clean(input.lastName)
				})
				.returning();
			return student;
		} catch (error) {
			if (pgCode(error) === '23514')
				throw new AuthError('The school has reached its student limit.');
			throw error;
		}
	});
}

export async function linkGuardian(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string,
	email: string,
	fullName: string
) {
	const token = newToken();
	const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
	const normalized = email.trim().toLowerCase();
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['school.records.manage', 'users.manage']);
		const [student] = await tx
			.select()
			.from(students)
			.where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));
		if (!student) throw new TenantAccessError('permission denied');
		const created = await tx.execute(
			sql`select app.invite_school_member(${schoolId}::uuid, ${normalized}, ${fullName.trim()}, 'parent', ${hashToken(token)}, ${expires}) as user_id`
		);
		const guardianId = String(rowsOf(created)[0]?.user_id ?? '');
		await tx.insert(guardianStudents).values({
			schoolId,
			guardianUserId: guardianId,
			studentId,
			relationship: 'guardian'
		});
	});
	return token;
}

export async function savePolicies(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { attendancePolicy: string; gradingPolicy: string; lateFeeGraceDays: number }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requireSettings(tx, schoolId);
		await tx
			.update(schoolSettings)
			.set({
				attendancePolicy: clean(input.attendancePolicy),
				gradingPolicy: clean(input.gradingPolicy),
				lateFeeGraceDays: input.lateFeeGraceDays
			})
			.where(eq(schoolSettings.schoolId, schoolId));
	});
}

export async function publishNotice(
	db: AppDb,
	userId: string,
	schoolId: string,
	title: string,
	body: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requireSettings(tx, schoolId);
		await tx.insert(schoolNotices).values({
			schoolId,
			title: clean(title),
			body: clean(body),
			createdBy: userId
		});
	});
}

export async function schoolAudit(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['school.records.manage', 'reports.export']);
		return tx
			.select()
			.from(auditEvents)
			.where(eq(auditEvents.schoolId, schoolId))
			.orderBy(desc(auditEvents.createdAt))
			.limit(50);
	});
}

export async function exportSchoolReport(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await requirePermission(tx, schoolId, ['reports.export']);
		const roster = await tx.select().from(students).where(eq(students.schoolId, schoolId));
		const lines = ['admission_no,first_name,last_name,status'];
		for (const student of roster) {
			lines.push(
				[student.admissionNo, student.firstName, student.lastName, student.status]
					.map((value) => `"${String(value).replaceAll('"', '""')}"`)
					.join(',')
			);
		}
		return lines.join('\n');
	});
}

export async function teacherDesk(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const assignments = await tx
			.select()
			.from(teacherAssignments)
			.where(
				and(eq(teacherAssignments.schoolId, schoolId), eq(teacherAssignments.teacherUserId, userId))
			);
		const roster = await tx.select().from(students).where(eq(students.schoolId, schoolId));
		return { assignments, roster };
	});
}

export async function markAttendance(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { studentId: string; sectionId: string; status: 'present' | 'absent' | 'late' | 'excused' }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		const allowed = await tx.execute(sql`
			select app.can_read_student(${schoolId}::uuid, ${input.studentId}::uuid) as readable
		`);
		if (rowsOf(allowed)[0]?.readable !== true) throw new TenantAccessError('permission denied');
		const assignment = await tx
			.select()
			.from(teacherAssignments)
			.where(
				and(
					eq(teacherAssignments.schoolId, schoolId),
					eq(teacherAssignments.teacherUserId, userId),
					eq(teacherAssignments.sectionId, input.sectionId)
				)
			);
		if (assignment.length === 0) throw new TenantAccessError('permission denied');
		await tx.insert(attendanceRecords).values({
			schoolId,
			studentId: input.studentId,
			sectionId: input.sectionId,
			attendanceDate: new Date().toISOString().slice(0, 10),
			status: input.status,
			recordedBy: userId
		});
	});
}

export async function parentChildren(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const links = await tx
			.select()
			.from(guardianStudents)
			.where(
				and(eq(guardianStudents.schoolId, schoolId), eq(guardianStudents.guardianUserId, userId))
			);
		const ids = links.map((link) => link.studentId);
		const roster =
			ids.length === 0
				? []
				: await tx.select().from(students).where(eq(students.schoolId, schoolId));
		return roster.filter((student) => ids.includes(student.id));
	});
}

export async function raiseComplaint(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string,
	subject: string,
	body: string,
	extras?: {
		category?: string;
		priority?: string;
		files?: { id: string; kind: 'voice' | 'photo' | 'document' }[];
	}
) {
	const priority = extras?.priority ?? 'normal';
	if (!['low', 'normal', 'high'].includes(priority)) throw new AuthError('Choose a priority.');
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const link = await tx
			.select()
			.from(guardianStudents)
			.where(
				and(
					eq(guardianStudents.schoolId, schoolId),
					eq(guardianStudents.guardianUserId, userId),
					eq(guardianStudents.studentId, studentId)
				)
			);
		if (link.length === 0) throw new TenantAccessError('permission denied');
		const [complaint] = await tx
			.insert(complaints)
			.values({
				schoolId,
				raisedBy: userId,
				studentId,
				category: clean(extras?.category) || 'general',
				priority,
				subject: clean(subject),
				body: clean(body)
			})
			.returning();
		if (extras?.files && extras.files.length > 0) {
			await tx.insert(complaintAttachments).values(
				extras.files.map((file) => ({
					schoolId,
					complaintId: complaint.id,
					fileId: file.id,
					kind: file.kind
				}))
			);
		}
		return complaint;
	});
}

export async function updateBranding(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { name: string; address: string; themeColor: string; logoPath: string }
) {
	const theme = clean(input.themeColor).toLowerCase();
	const logo = clean(input.logoPath);
	if (clean(input.name).length < 2) throw new AuthError('Enter the school name.');
	if (!/^#[0-9a-f]{6}$/.test(theme)) throw new AuthError('Use a hex color such as #0f766e.');
	if (logo && !/^https:\/\/.{3,200}$/.test(logo)) throw new AuthError('Logo must be an https URL.');
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await requireSettings(tx, schoolId);
		await tx
			.update(schools)
			.set({ name: clean(input.name) })
			.where(eq(schools.id, schoolId));
		await tx
			.update(schoolSettings)
			.set({ address: clean(input.address), themeColor: theme, logoPath: logo || null })
			.where(eq(schoolSettings.schoolId, schoolId));
	});
}
