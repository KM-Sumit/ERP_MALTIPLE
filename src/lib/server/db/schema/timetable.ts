import { sql } from 'drizzle-orm';
import {
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	smallint,
	text,
	time,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { academicSessions, sections, subjects } from './academic';
import { createdAt, primaryId, updatedAt } from './columns';
import { schoolId, users } from './platform';

export const timetablePeriods = pgTable(
	'timetable_periods',
	{
		id: primaryId(),
		schoolId: schoolId(),
		name: text('name').notNull(),
		startTime: time('start_time').notNull(),
		endTime: time('end_time').notNull(),
		sortOrder: smallint('sort_order').notNull(),
		kind: text('kind').notNull().default('teaching'),
		createdAt: createdAt()
	},
	(t) => [
		unique('timetable_periods_id_school_uidx').on(t.id, t.schoolId),
		unique('timetable_periods_order_uidx').on(t.schoolId, t.sortOrder),
		index('timetable_periods_school_idx').on(t.schoolId),
		check('timetable_periods_time_chk', sql`${t.endTime} > ${t.startTime}`),
		check('timetable_periods_kind_chk', sql`${t.kind} in ('teaching', 'break')`)
	]
);

export const timetables = pgTable(
	'timetables',
	{
		id: primaryId(),
		schoolId: schoolId(),
		sectionId: uuid('section_id').notNull(),
		sessionId: uuid('session_id').notNull(),
		name: text('name').notNull(),
		status: text('status').notNull().default('draft'),
		revision: integer('revision').notNull().default(1),
		lockVersion: integer('lock_version').notNull().default(1),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('timetables_id_school_uidx').on(t.id, t.schoolId),
		index('timetables_school_section_idx').on(t.schoolId, t.sectionId),
		foreignKey({
			name: 'timetables_section_school_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'timetables_session_school_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict'),
		unique('timetables_section_session_uidx').on(t.schoolId, t.sectionId, t.sessionId),
		check('timetables_status_chk', sql`${t.status} in ('draft', 'published')`)
	]
);

export const classrooms = pgTable(
	'classrooms',
	{
		id: primaryId(),
		schoolId: schoolId(),
		name: text('name').notNull(),
		capacity: integer('capacity'),
		createdAt: createdAt()
	},
	(t) => [
		unique('classrooms_id_school_uidx').on(t.id, t.schoolId),
		unique('classrooms_name_uidx').on(t.schoolId, t.name),
		check('classrooms_capacity_chk', sql`${t.capacity} is null or ${t.capacity} > 0`)
	]
);

export const timetableEntries = pgTable(
	'timetable_entries',
	{
		id: primaryId(),
		schoolId: schoolId(),
		timetableId: uuid('timetable_id').notNull(),
		weekday: smallint('weekday').notNull(),
		periodId: uuid('period_id').notNull(),
		subjectId: uuid('subject_id').notNull(),
		teacherUserId: uuid('teacher_user_id').references(() => users.id, { onDelete: 'restrict' }),
		room: text('room'),
		classroomId: uuid('classroom_id'),
		createdAt: createdAt()
	},
	(t) => [
		unique('timetable_entries_slot_uidx').on(t.timetableId, t.weekday, t.periodId),
		index('timetable_entries_school_idx').on(t.schoolId),
		foreignKey({
			name: 'timetable_entries_timetable_fk',
			columns: [t.timetableId, t.schoolId],
			foreignColumns: [timetables.id, timetables.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'timetable_entries_period_fk',
			columns: [t.periodId, t.schoolId],
			foreignColumns: [timetablePeriods.id, timetablePeriods.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'timetable_entries_subject_fk',
			columns: [t.subjectId, t.schoolId],
			foreignColumns: [subjects.id, subjects.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'timetable_entries_classroom_fk',
			columns: [t.classroomId, t.schoolId],
			foreignColumns: [classrooms.id, classrooms.schoolId]
		}).onDelete('restrict'),
		check('timetable_entries_weekday_chk', sql`${t.weekday} between 0 and 6`)
	]
);

export const classTeachers = pgTable(
	'class_teachers',
	{
		id: primaryId(),
		schoolId: schoolId(),
		sectionId: uuid('section_id').notNull(),
		sessionId: uuid('session_id').notNull(),
		teacherUserId: uuid('teacher_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		createdAt: createdAt()
	},
	(t) => [
		unique('class_teachers_id_school_uidx').on(t.id, t.schoolId),
		unique('class_teachers_section_uidx').on(t.sectionId, t.sessionId),
		foreignKey({
			name: 'class_teachers_section_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'class_teachers_session_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict')
	]
);

export const teacherQualifications = pgTable(
	'teacher_qualifications',
	{
		schoolId: schoolId(),
		teacherUserId: uuid('teacher_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		subjectId: uuid('subject_id').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		unique('teacher_qualifications_pk').on(t.schoolId, t.teacherUserId, t.subjectId),
		foreignKey({
			name: 'teacher_qualifications_subject_fk',
			columns: [t.subjectId, t.schoolId],
			foreignColumns: [subjects.id, subjects.schoolId]
		}).onDelete('restrict')
	]
);

export const timetableRevisions = pgTable(
	'timetable_revisions',
	{
		id: primaryId(),
		schoolId: schoolId(),
		timetableId: uuid('timetable_id').notNull(),
		revision: integer('revision').notNull(),
		snapshot: jsonb('snapshot').notNull(),
		createdBy: uuid('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		createdAt: createdAt()
	},
	(t) => [
		unique('timetable_revisions_uidx').on(t.timetableId, t.revision),
		foreignKey({
			name: 'timetable_revisions_timetable_fk',
			columns: [t.timetableId, t.schoolId],
			foreignColumns: [timetables.id, timetables.schoolId]
		}).onDelete('restrict')
	]
);
