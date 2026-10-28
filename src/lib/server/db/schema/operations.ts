import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	foreignKey,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { students } from './academic';
import { createdAt, primaryId, updatedAt } from './columns';
import { storedFiles } from './files';
import { schoolId, users } from './platform';

export const complaints = pgTable(
	'complaints',
	{
		id: primaryId(),
		schoolId: schoolId(),
		raisedBy: uuid('raised_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		studentId: uuid('student_id'),
		subject: text('subject').notNull(),
		body: text('body').notNull(),
		category: text('category').notNull().default('general'),
		priority: text('priority').notNull().default('normal'),
		assigneeUserId: uuid('assignee_user_id'),
		resolutionNote: text('resolution_note'),
		status: text('status').notNull().default('open'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('complaints_id_school_uidx').on(t.id, t.schoolId),
		index('complaints_school_status_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'complaints_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check(
			'complaints_status_chk',
			sql`${t.status} in ('open', 'in_review', 'assigned', 'resolved', 'closed')`
		),
		check('complaints_priority_chk', sql`${t.priority} in ('low', 'normal', 'high')`)
	]
);

export const complaintAttachments = pgTable(
	'complaint_attachments',
	{
		id: primaryId(),
		schoolId: schoolId(),
		complaintId: uuid('complaint_id').notNull(),
		fileId: uuid('file_id').notNull(),
		kind: text('kind').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('complaint_attachments_school_idx').on(t.schoolId, t.complaintId),
		foreignKey({
			name: 'complaint_attachments_complaint_fk',
			columns: [t.complaintId, t.schoolId],
			foreignColumns: [complaints.id, complaints.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'complaint_attachments_file_fk',
			columns: [t.fileId, t.schoolId],
			foreignColumns: [storedFiles.id, storedFiles.schoolId]
		}).onDelete('restrict'),
		check('complaint_attachments_kind_chk', sql`${t.kind} in ('voice', 'photo', 'document')`)
	]
);

export const documentRequests = pgTable(
	'document_requests',
	{
		id: primaryId(),
		schoolId: schoolId(),
		studentId: uuid('student_id').notNull(),
		requestedBy: uuid('requested_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		docType: text('doc_type').notNull(),
		status: text('status').notNull().default('pending'),
		reviewNote: text('review_note'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('document_requests_school_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'document_requests_student_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check(
			'document_requests_status_chk',
			sql`${t.status} in ('pending', 'ready', 'rejected', 'collected')`
		)
	]
);

export const documentDownloads = pgTable('document_downloads', {
	id: primaryId(),
	schoolId: schoolId(),
	requestId: uuid('request_id').notNull(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'restrict' }),
	createdAt: createdAt()
});

export const notifications = pgTable(
	'notifications',
	{
		id: primaryId(),
		schoolId: schoolId(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		body: text('body').notNull(),
		readAt: timestamp('read_at', { withTimezone: true }),
		eventKey: text('event_key'),
		createdAt: createdAt()
	},
	(t) => [index('notifications_user_idx').on(t.schoolId, t.userId, t.createdAt)]
);

export const staffLeave = pgTable(
	'staff_leave',
	{
		id: primaryId(),
		schoolId: schoolId(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		startDate: date('start_date').notNull(),
		endDate: date('end_date').notNull(),
		reason: text('reason').notNull(),
		status: text('status').notNull().default('pending'),
		createdAt: createdAt()
	},
	(t) => [
		check('staff_leave_dates_chk', sql`${t.endDate} >= ${t.startDate}`),
		check('staff_leave_status_chk', sql`${t.status} in ('pending', 'approved', 'rejected')`)
	]
);

export const meetingRequests = pgTable(
	'meeting_requests',
	{
		id: primaryId(),
		schoolId: schoolId(),
		teacherUserId: uuid('teacher_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		studentId: uuid('student_id').notNull(),
		note: text('note').notNull(),
		status: text('status').notNull().default('pending'),
		createdAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'meeting_requests_student_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check('meeting_requests_status_chk', sql`${t.status} in ('pending', 'accepted', 'declined')`)
	]
);

export const notificationPreferences = pgTable(
	'notification_preferences',
	{
		schoolId: schoolId(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind').notNull(),
		enabled: boolean('enabled').notNull().default(true)
	},
	(t) => [
		primaryKey({ columns: [t.schoolId, t.userId, t.kind] }),
		check(
			'notification_preferences_kind_chk',
			sql`${t.kind} in ('timetable', 'exam', 'results', 'attendance', 'notice')`
		)
	]
);
