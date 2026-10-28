import { sql } from 'drizzle-orm';
import {
	check,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { sections, students, subjects } from './academic';
import { createdAt, primaryId, updatedAt } from './columns';
import { storedFiles } from './files';
import { schoolId } from './platform';

export const courses = pgTable(
	'courses',
	{
		id: primaryId(),
		schoolId: schoolId(),
		subjectId: uuid('subject_id'),
		sectionId: uuid('section_id'),
		title: text('title').notNull(),
		status: text('status').notNull().default('draft'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('courses_id_school_uidx').on(t.id, t.schoolId),
		index('courses_school_idx').on(t.schoolId, t.status),
		foreignKey({
			name: 'courses_subject_school_fk',
			columns: [t.subjectId, t.schoolId],
			foreignColumns: [subjects.id, subjects.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'courses_section_fk',
			columns: [t.sectionId, t.schoolId],
			foreignColumns: [sections.id, sections.schoolId]
		}).onDelete('restrict'),
		check('courses_status_chk', sql`${t.status} in ('draft', 'published', 'archived')`)
	]
);

export const courseMaterials = pgTable(
	'course_materials',
	{
		id: primaryId(),
		schoolId: schoolId(),
		courseId: uuid('course_id').notNull(),
		title: text('title').notNull(),
		kind: text('kind').notNull(),
		fileId: uuid('file_id'),
		externalUrl: text('external_url'),
		version: integer('version').notNull().default(1),
		createdAt: createdAt()
	},
	(t) => [
		index('course_materials_school_course_idx').on(t.schoolId, t.courseId),
		foreignKey({
			name: 'course_materials_course_fk',
			columns: [t.courseId, t.schoolId],
			foreignColumns: [courses.id, courses.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'course_materials_file_fk',
			columns: [t.fileId, t.schoolId],
			foreignColumns: [storedFiles.id, storedFiles.schoolId]
		}).onDelete('restrict'),
		check('course_materials_kind_chk', sql`${t.kind} in ('note', 'pdf', 'video', 'link')`)
	]
);

export const chapters = pgTable(
	'chapters',
	{
		id: primaryId(),
		schoolId: schoolId(),
		courseId: uuid('course_id').notNull(),
		title: text('title').notNull(),
		sortOrder: integer('sort_order').notNull().default(1),
		createdAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'chapters_course_fk',
			columns: [t.courseId, t.schoolId],
			foreignColumns: [courses.id, courses.schoolId]
		}).onDelete('restrict')
	]
);

export const assignments = pgTable(
	'assignments',
	{
		id: primaryId(),
		schoolId: schoolId(),
		courseId: uuid('course_id').notNull(),
		title: text('title').notNull(),
		instructions: text('instructions').notNull().default(''),
		status: text('status').notNull().default('published'),
		dueAt: timestamp('due_at', { withTimezone: true }),
		maxMarks: integer('max_marks'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		unique('assignments_id_school_uidx').on(t.id, t.schoolId),
		index('assignments_school_course_idx').on(t.schoolId, t.courseId),
		foreignKey({
			name: 'assignments_course_fk',
			columns: [t.courseId, t.schoolId],
			foreignColumns: [courses.id, courses.schoolId]
		}).onDelete('restrict'),
		check('assignments_marks_chk', sql`${t.maxMarks} is null or ${t.maxMarks} > 0`),
		check('assignments_status_chk', sql`${t.status} in ('draft', 'published')`)
	]
);

export const assignmentSubmissions = pgTable(
	'assignment_submissions',
	{
		id: primaryId(),
		schoolId: schoolId(),
		assignmentId: uuid('assignment_id').notNull(),
		studentId: uuid('student_id').notNull(),
		fileId: uuid('file_id'),
		submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		unique('assignment_submissions_once_uidx').on(t.assignmentId, t.studentId),
		index('assignment_submissions_school_idx').on(t.schoolId),
		foreignKey({
			name: 'submissions_assignment_fk',
			columns: [t.assignmentId, t.schoolId],
			foreignColumns: [assignments.id, assignments.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'submissions_student_fk',
			columns: [t.studentId, t.schoolId],
			foreignColumns: [students.id, students.schoolId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'submissions_file_fk',
			columns: [t.fileId, t.schoolId],
			foreignColumns: [storedFiles.id, storedFiles.schoolId]
		}).onDelete('restrict')
	]
);
