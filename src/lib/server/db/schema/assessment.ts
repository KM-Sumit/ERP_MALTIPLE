import { sql } from 'drizzle-orm';
import {
	check,
	date,
	foreignKey,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { academicSessions, sections, students, subjects } from './academic';
import { createdAt, primaryId, updatedAt } from './columns';
import { schoolId, users } from './platform';

export const gradingRules = pgTable(
	'grading_rules',
	{
		id: primaryId(),
		schoolId: schoolId(),
		sessionId: uuid('session_id').notNull(),
		name: text('name').notNull(),
		minPercent: numeric('min_percent', { precision: 5, scale: 2 }).notNull(),
		maxPercent: numeric('max_percent', { precision: 5, scale: 2 }).notNull(),
		grade: text('grade').notNull(),
		gradePoint: numeric('grade_point', { precision: 4, scale: 2 }).notNull(),
		sortOrder: integer('sort_order').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		unique('grading_rules_band_uidx').on(t.schoolId, t.sessionId, t.grade),
		index('grading_rules_school_idx').on(t.schoolId),
		foreignKey({
			name: 'grading_rules_session_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict'),
		check('grading_rules_range_chk', sql`${t.minPercent} >= 0 and ${t.maxPercent} <= 100`),
		check('grading_rules_order_chk', sql`${t.minPercent} < ${t.maxPercent}`)
	]
);

export const exams = pgTable(
	'exams',
	{
		id: primaryId(),
		schoolId: schoolId(),
		sessionId: uuid('session_id').notNull(),
		name: text('name').notNull(),
		examType: text('exam_type').notNull().default('custom'),
		instructions: text('instructions').notNull().default(''),
		maxMarks: integer('max_marks'),
		passingMarks: integer('passing_marks'),
		durationMinutes: integer('duration_minutes'),
		status: text('status').notNull().default('draft'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('exams_id_school_uidx').on(t.id, t.schoolId),
		unique('exams_name_uidx').on(t.schoolId, t.sessionId, t.name),
		index('exams_school_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'exams_session_school_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict'),
		check(
			'exams_status_chk',
			sql`${t.status} in ('draft', 'scheduled', 'published', 'completed', 'cancelled')`
		),
		check(
			'exams_type_chk',
			sql`${t.examType} in ('unit', 'monthly', 'half_yearly', 'annual', 'practical', 'custom')`
		)
	]
);

export const examSchedules = pgTable(
	'exam_schedules',
	{
		id: primaryId(),
		schoolId: schoolId(),
		examId: uuid('exam_id').notNull(),
		subjectId: uuid('subject_id').notNull(),
		sectionId: uuid('section_id').notNull(),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
		room: text('room'),
		invigilatorUserId: uuid('invigilator_user_id').references(() => users.id, {
			onDelete: 'restrict'
		}),
		seatingPlan: text('seating_plan'),
		createdAt: createdAt()
	},
	(t) => [
		unique('exam_schedules_slot_uidx').on(t.examId, t.subjectId, t.sectionId),
		index('exam_schedules_school_idx').on(t.schoolId, t.startsAt),
		foreignKey({
			name: 'exam_schedules_exam_fk',
			columns: [t.examId, t.schoolId],
			foreignColumns: [exams.id, exams.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'exam_schedules_subject_fk',
			columns: [t.subjectId, t.schoolId],
			foreignColumns: [subjects.id, subjects.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'exam_schedules_section_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		check('exam_schedules_time_chk', sql`${t.endsAt} > ${t.startsAt}`)
	]
);

export const marks = pgTable(
	'marks',
	{
		id: primaryId(),
		schoolId: schoolId(),
		examId: uuid('exam_id').notNull(),
		studentId: uuid('student_id').notNull(),
		subjectId: uuid('subject_id').notNull(),
		marksObtained: integer('marks_obtained'),
		maxMarks: integer('max_marks').notNull(),
		outcome: text('outcome').notNull().default('scored'),
		workflow: text('workflow').notNull().default('draft'),
		theoryObtained: integer('theory_obtained'),
		theoryMax: integer('theory_max'),
		practicalObtained: integer('practical_obtained'),
		practicalMax: integer('practical_max'),
		internalObtained: integer('internal_obtained'),
		internalMax: integer('internal_max'),
		remark: text('remark'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('marks_entry_uidx').on(t.examId, t.studentId, t.subjectId),
		index('marks_school_exam_idx').on(t.schoolId, t.examId),
		foreignKey({
			name: 'marks_exam_school_fk',
			columns: [t.examId, t.schoolId],
			foreignColumns: [exams.id, exams.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'marks_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'marks_subject_school_fk',
			columns: [t.subjectId, t.schoolId],
			foreignColumns: [subjects.id, subjects.schoolId]
		}).onDelete('restrict'),
		check(
			'marks_outcome_chk',
			sql`(
				(${t.outcome} = 'scored' and ${t.marksObtained} is not null and ${t.maxMarks} > 0 and ${t.marksObtained} >= 0 and ${t.marksObtained} <= ${t.maxMarks})
				or (${t.outcome} in ('absent', 'exempt', 'not_assessed') and ${t.marksObtained} is null and ${t.maxMarks} > 0)
			)`
		),
		check(
			'marks_workflow_chk',
			sql`${t.workflow} in ('draft', 'submitted', 'approved', 'reopened')`
		)
	]
);

export const reportCards = pgTable(
	'report_cards',
	{
		id: primaryId(),
		schoolId: schoolId(),
		examId: uuid('exam_id').notNull(),
		studentId: uuid('student_id').notNull(),
		status: text('status').notNull().default('draft'),
		remarks: text('remarks'),
		revision: integer('revision').notNull().default(1),
		totalMarks: integer('total_marks'),
		maxMarks: integer('max_marks'),
		percentage: numeric('percentage', { precision: 5, scale: 2 }),
		grade: text('grade'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('report_cards_exam_student_uidx').on(t.examId, t.studentId),
		index('report_cards_school_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'report_cards_exam_fk',
			columns: [t.examId, t.schoolId],
			foreignColumns: [exams.id, exams.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'report_cards_student_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check(
			'report_cards_status_chk',
			sql`${t.status} in ('draft', 'approved', 'published', 'revised')`
		)
	]
);

export const attendanceRecords = pgTable(
	'attendance_records',
	{
		id: primaryId(),
		schoolId: schoolId(),
		studentId: uuid('student_id').notNull(),
		sectionId: uuid('section_id').notNull(),
		attendanceDate: date('attendance_date').notNull(),
		status: text('status').notNull(),
		workflow: text('workflow').notNull().default('submitted'),
		recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'restrict' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('attendance_records_day_uidx').on(t.studentId, t.attendanceDate),
		index('attendance_records_school_date_idx').on(t.schoolId, t.attendanceDate),
		foreignKey({
			name: 'attendance_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'attendance_section_school_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		check(
			'attendance_records_status_chk',
			sql`${t.status} in ('present', 'absent', 'late', 'excused')`
		),
		check('attendance_records_workflow_chk', sql`${t.workflow} in ('draft', 'submitted')`)
	]
);

export const attendanceAudit = pgTable('attendance_audit', {
	id: primaryId(),
	schoolId: schoolId(),
	attendanceId: uuid('attendance_id')
		.notNull()
		.references(() => attendanceRecords.id, { onDelete: 'restrict' }),
	actorUserId: uuid('actor_user_id'),
	previousStatus: text('previous_status').notNull(),
	nextStatus: text('next_status').notNull(),
	createdAt: createdAt()
});

export const attendanceCorrections = pgTable(
	'attendance_corrections',
	{
		id: primaryId(),
		schoolId: schoolId(),
		attendanceId: uuid('attendance_id')
			.notNull()
			.references(() => attendanceRecords.id, { onDelete: 'restrict' }),
		requestedBy: uuid('requested_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		note: text('note').notNull(),
		status: text('status').notNull().default('pending'),
		createdAt: createdAt()
	},
	(t) => [
		check(
			'attendance_corrections_status_chk',
			sql`${t.status} in ('pending', 'approved', 'rejected')`
		)
	]
);

export const leaveApplications = pgTable(
	'leave_applications',
	{
		id: primaryId(),
		schoolId: schoolId(),
		studentId: uuid('student_id').notNull(),
		requestedBy: uuid('requested_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		startDate: date('start_date').notNull(),
		endDate: date('end_date').notNull(),
		reason: text('reason').notNull(),
		status: text('status').notNull().default('pending'),
		decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'restrict' }),
		decidedAt: timestamp('decided_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('leave_applications_school_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'leave_applications_student_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check('leave_applications_dates_chk', sql`${t.endDate} >= ${t.startDate}`),
		check(
			'leave_applications_status_chk',
			sql`${t.status} in ('pending', 'approved', 'rejected', 'cancelled')`
		)
	]
);
