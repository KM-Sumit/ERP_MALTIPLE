import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	smallint,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { createdAt, deletedAt, primaryId, updatedAt } from './columns';

export const users = pgTable(
	'users',
	{
		id: primaryId(),
		email: text('email'),
		phone: text('phone'),
		passwordHash: text('password_hash'),
		fullName: text('full_name').notNull(),
		status: text('status').notNull().default('active'),
		isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
		failedLoginCount: integer('failed_login_count').notNull().default(0),
		lockedUntil: timestamp('locked_until', { withTimezone: true }),
		emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		deletedAt: deletedAt()
	},
	(t) => [
		uniqueIndex('users_email_active_uidx')
			.on(t.email)
			.where(sql`${t.deletedAt} is null and ${t.email} is not null`),
		uniqueIndex('users_phone_active_uidx')
			.on(t.phone)
			.where(sql`${t.deletedAt} is null and ${t.phone} is not null`),
		check('users_status_chk', sql`${t.status} in ('active', 'disabled')`),
		check('users_contact_chk', sql`${t.email} is not null or ${t.phone} is not null`)
	]
);

export const schools = pgTable(
	'schools',
	{
		id: primaryId(),
		name: text('name').notNull(),
		code: text('code').notNull(),
		status: text('status').notNull().default('active'),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		deletedAt: deletedAt()
	},
	(t) => [
		uniqueIndex('schools_code_active_uidx')
			.on(t.code)
			.where(sql`${t.deletedAt} is null`),
		check('schools_status_chk', sql`${t.status} in ('active', 'suspended', 'archived')`),
		check('schools_code_lower_chk', sql`${t.code} = lower(${t.code})`)
	]
);

export function schoolId() {
	return uuid('school_id')
		.notNull()
		.references(() => schools.id, { onDelete: 'restrict' });
}

export const schoolSettings = pgTable(
	'school_settings',
	{
		schoolId: uuid('school_id')
			.primaryKey()
			.references(() => schools.id, { onDelete: 'restrict' }),
		timezone: text('timezone').notNull().default('Asia/Kolkata'),
		currency: text('currency').notNull().default('INR'),
		lateFeeGraceDays: integer('late_fee_grace_days').notNull().default(0),
		contactEmail: text('contact_email'),
		contactPhone: text('contact_phone'),
		address: text('address'),
		logoPath: text('logo_path'),
		themeColor: text('theme_color').notNull().default('#0f766e'),
		locale: text('locale').notNull().default('en-IN'),
		attendancePolicy: text('attendance_policy')
			.notNull()
			.default('Daily attendance is recorded per section.'),
		gradingPolicy: text('grading_policy')
			.notNull()
			.default('Marks are recorded out of the exam maximum.'),
		planKey: text('plan_key').notNull().default('standard'),
		studentLimit: integer('student_limit'),
		subscriptionStatus: text('subscription_status').notNull().default('unpaid'),
		workingDays: smallint('working_days')
			.array()
			.notNull()
			.default(sql`'{1,2,3,4,5}'`),
		dayStart: time('day_start').notNull().default('08:00'),
		dayEnd: time('day_end').notNull().default('15:00'),
		absentCountsAsZero: boolean('absent_counts_as_zero').notNull().default(false),
		updatedAt: updatedAt()
	},
	(t) => [
		check('school_settings_grace_chk', sql`${t.lateFeeGraceDays} >= 0`),
		check('school_settings_currency_chk', sql`char_length(${t.currency}) = 3`),
		check('school_settings_theme_chk', sql`${t.themeColor} ~ '^#[0-9A-Fa-f]{6}$'`),
		check('school_settings_limit_chk', sql`${t.studentLimit} is null or ${t.studentLimit} >= 0`),
		check('school_settings_subscription_chk', sql`${t.subscriptionStatus} in ('paid', 'unpaid')`)
	]
);

export const permissions = pgTable('permissions', {
	key: text('key').primaryKey(),
	description: text('description').notNull()
});

export const roles = pgTable(
	'roles',
	{
		id: primaryId(),
		key: text('key').notNull().unique(),
		scope: text('scope').notNull(),
		description: text('description').notNull()
	},
	(t) => [check('roles_scope_chk', sql`${t.scope} in ('platform', 'school')`)]
);

export const rolePermissions = pgTable(
	'role_permissions',
	{
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'restrict' }),
		permissionKey: text('permission_key')
			.notNull()
			.references(() => permissions.key, { onDelete: 'restrict' })
	},
	(t) => [
		primaryKey({ columns: [t.roleId, t.permissionKey] }),
		index('role_permissions_role_idx').on(t.roleId)
	]
);

export const schoolMemberships = pgTable(
	'school_memberships',
	{
		id: primaryId(),
		schoolId: schoolId(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'restrict' }),
		status: text('status').notNull().default('invited'),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		deletedAt: deletedAt()
	},
	(t) => [
		uniqueIndex('school_memberships_active_uidx')
			.on(t.schoolId, t.userId, t.roleId)
			.where(sql`${t.deletedAt} is null`),
		index('school_memberships_user_idx').on(t.userId),
		index('school_memberships_school_idx').on(t.schoolId, t.status),
		check('school_memberships_status_chk', sql`${t.status} in ('invited', 'active', 'suspended')`)
	]
);

export const invitations = pgTable(
	'invitations',
	{
		id: primaryId(),
		schoolId: schoolId(),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'restrict' }),
		email: text('email'),
		phone: text('phone'),
		tokenHash: text('token_hash').notNull().unique(),
		status: text('status').notNull().default('pending'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
			onDelete: 'restrict'
		}),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('invitations_school_idx').on(t.schoolId, t.status),
		check(
			'invitations_status_chk',
			sql`${t.status} in ('pending', 'accepted', 'revoked', 'expired')`
		),
		check('invitations_contact_chk', sql`${t.email} is not null or ${t.phone} is not null`)
	]
);

export const userSessions = pgTable(
	'user_sessions',
	{
		id: primaryId(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'restrict' }),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('user_sessions_user_idx').on(t.userId)]
);

export const systemSettings = pgTable('system_settings', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: updatedAt()
});

export const auditEvents = pgTable(
	'audit_events',
	{
		id: primaryId(),
		schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'restrict' }),
		actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: uuid('entity_id'),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: createdAt()
	},
	(t) => [index('audit_events_school_created_idx').on(t.schoolId, t.createdAt)]
);

export const membershipPermissions = pgTable(
	'membership_permissions',
	{
		membershipId: uuid('membership_id')
			.notNull()
			.references(() => schoolMemberships.id, { onDelete: 'cascade' }),
		permissionKey: text('permission_key')
			.notNull()
			.references(() => permissions.key, { onDelete: 'restrict' })
	},
	(t) => [primaryKey({ columns: [t.membershipId, t.permissionKey] })]
);

export const userSecrets = pgTable('user_secrets', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	totpSecret: text('totp_secret'),
	totpEnabled: boolean('totp_enabled').notNull().default(false)
});

export const passwordResets = pgTable(
	'password_resets',
	{
		id: primaryId(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		usedAt: timestamp('used_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('password_resets_user_idx').on(t.userId)]
);

export const schoolOnboarding = pgTable('school_onboarding', {
	schoolId: uuid('school_id')
		.primaryKey()
		.references(() => schools.id, { onDelete: 'restrict' }),
	step: text('step').notNull().default('profile'),
	draft: jsonb('draft').$type<Record<string, unknown>>().notNull().default({}),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	updatedAt: updatedAt()
});

export const schoolNotices = pgTable(
	'school_notices',
	{
		id: primaryId(),
		schoolId: schoolId(),
		title: text('title').notNull(),
		body: text('body').notNull(),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		createdAt: createdAt()
	},
	(t) => [index('school_notices_school_idx').on(t.schoolId, t.createdAt)]
);
