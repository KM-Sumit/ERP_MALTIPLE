import { sql } from 'drizzle-orm';
import {
	check,
	date,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { createdAt, deletedAt, primaryId, updatedAt } from './columns';
import { schoolId, users } from './platform';

export const academicSessions = pgTable(
	'academic_sessions',
	{
		id: primaryId(),
		schoolId: schoolId(),
		name: text('name').notNull(),
		startDate: date('start_date').notNull(),
		endDate: date('end_date').notNull(),
		status: text('status').notNull().default('planned'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('academic_sessions_id_school_uidx').on(t.id, t.schoolId),
		unique('academic_sessions_name_uidx').on(t.schoolId, t.name),
		uniqueIndex('academic_sessions_one_active_uidx')
			.on(t.schoolId)
			.where(sql`${t.status} = 'active'`),
		index('academic_sessions_school_idx').on(t.schoolId),
		check('academic_sessions_status_chk', sql`${t.status} in ('planned', 'active', 'closed')`),
		check('academic_sessions_dates_chk', sql`${t.endDate} >= ${t.startDate}`)
	]
);

export const classes = pgTable(
	'classes',
	{
		id: primaryId(),
		schoolId: schoolId(),
		sessionId: uuid('session_id').notNull(),
		name: text('name').notNull(),
		gradeLevel: integer('grade_level').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('classes_id_school_uidx').on(t.id, t.schoolId),
		unique('classes_name_uidx').on(t.schoolId, t.sessionId, t.name),
		index('classes_school_idx').on(t.schoolId),
		foreignKey({
			name: 'classes_session_school_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict'),
		check('classes_grade_chk', sql`${t.gradeLevel} between 0 and 20`)
	]
);

export const sections = pgTable(
	'sections',
	{
		id: primaryId(),
		schoolId: schoolId(),
		classId: uuid('class_id').notNull(),
		name: text('name').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('sections_id_school_uidx').on(t.id, t.schoolId),
		unique('sections_name_uidx').on(t.classId, t.name),
		index('sections_school_idx').on(t.schoolId),
		foreignKey({
			name: 'sections_class_school_fk',
			columns: [t.classId, t.schoolId],
			foreignColumns: [classes.id, classes.schoolId]
		}).onDelete('restrict')
	]
);

export const subjects = pgTable(
	'subjects',
	{
		id: primaryId(),
		schoolId: schoolId(),
		name: text('name').notNull(),
		code: text('code').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('subjects_id_school_uidx').on(t.id, t.schoolId),
		unique('subjects_code_uidx').on(t.schoolId, t.code),
		index('subjects_school_idx').on(t.schoolId)
	]
);

export const students = pgTable(
	'students',
	{
		id: primaryId(),
		schoolId: schoolId(),
		admissionNo: text('admission_no').notNull(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		dateOfBirth: date('date_of_birth'),
		status: text('status').notNull().default('active'),
		currentSectionId: uuid('current_section_id'),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		deletedAt: deletedAt()
	},
	(t) => [
		unique('students_id_school_uidx').on(t.id, t.schoolId),
		uniqueIndex('students_admission_active_uidx')
			.on(t.schoolId, t.admissionNo)
			.where(sql`${t.deletedAt} is null`),
		index('students_school_section_idx').on(t.schoolId, t.currentSectionId),
		foreignKey({
			name: 'students_section_school_fk',
			columns: [t.currentSectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		check('students_status_chk', sql`${t.status} in ('active', 'withdrawn', 'alumni')`)
	]
);

export const studentEnrollments = pgTable(
	'student_enrollments',
	{
		id: primaryId(),
		schoolId: schoolId(),
		studentId: uuid('student_id').notNull(),
		sectionId: uuid('section_id').notNull(),
		sessionId: uuid('session_id').notNull(),
		rollNumber: text('roll_number'),
		status: text('status').notNull().default('active'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('student_enrollments_id_school_uidx').on(t.id, t.schoolId),
		unique('student_enrollments_session_uidx').on(t.studentId, t.sessionId),
		index('student_enrollments_school_idx').on(t.schoolId),
		foreignKey({
			name: 'enrollments_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'enrollments_section_school_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'enrollments_session_school_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict'),
		check(
			'student_enrollments_status_chk',
			sql`${t.status} in ('active', 'completed', 'withdrawn')`
		)
	]
);

export const guardianStudents = pgTable(
	'guardian_students',
	{
		id: primaryId(),
		schoolId: schoolId(),
		guardianUserId: uuid('guardian_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		studentId: uuid('student_id').notNull(),
		relationship: text('relationship').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		unique('guardian_students_pair_uidx').on(t.guardianUserId, t.studentId),
		index('guardian_students_school_idx').on(t.schoolId),
		index('guardian_students_guardian_idx').on(t.guardianUserId),
		foreignKey({
			name: 'guardian_students_student_school_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		check(
			'guardian_students_relationship_chk',
			sql`${t.relationship} in ('mother', 'father', 'guardian', 'other')`
		)
	]
);

export const teacherAssignments = pgTable(
	'teacher_assignments',
	{
		id: primaryId(),
		schoolId: schoolId(),
		teacherUserId: uuid('teacher_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		sectionId: uuid('section_id').notNull(),
		subjectId: uuid('subject_id').notNull(),
		sessionId: uuid('session_id').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		unique('teacher_assignments_uidx').on(
			t.schoolId,
			t.sessionId,
			t.sectionId,
			t.subjectId,
			t.teacherUserId
		),
		index('teacher_assignments_school_idx').on(t.schoolId),
		index('teacher_assignments_teacher_idx').on(t.teacherUserId),
		foreignKey({
			name: 'teacher_assignments_section_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'teacher_assignments_subject_fk',
			columns: [t.subjectId, t.schoolId],
			foreignColumns: [subjects.id, subjects.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'teacher_assignments_session_fk',
			columns: [t.sessionId, t.schoolId],
			foreignColumns: [academicSessions.id, academicSessions.schoolId]
		}).onDelete('restrict')
	]
);
