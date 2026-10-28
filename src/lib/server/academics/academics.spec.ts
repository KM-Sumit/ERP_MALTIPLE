import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthError } from '../auth/service';
import {
	academicSessions,
	classes,
	guardianStudents,
	membershipPermissions,
	roles,
	schoolMemberships,
	schoolSettings,
	schools,
	sections,
	studentEnrollments,
	students,
	subjects,
	teacherAssignments,
	teacherQualifications,
	timetables,
	users
} from '../db/schema';
import * as schema from '../db/schema';
import { withSchoolUser } from '../db/tenant';
import {
	addExamSlot,
	approveResults,
	cancelExam,
	createExam,
	publishExamSchedule,
	publishReportCards,
	reportCardPdf,
	saveMark,
	submitMarks
} from './exams';
import { parentHome, saveAttendance } from './portals';
import {
	exportTimetable,
	openTimetable,
	publishTimetable,
	saveCalendar,
	saveClassroom,
	saveEntry,
	savePeriod
} from './timetable';

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
	manager: randomUUID(),
	teacher: randomUUID(),
	otherTeacher: randomUUID(),
	parent: randomUUID(),
	school: randomUUID(),
	session: randomUUID(),
	classId: randomUUID(),
	sectionA: randomUUID(),
	sectionB: randomUUID(),
	math: randomUUID(),
	science: randomUUID(),
	studentA: randomUUID(),
	studentB: randomUUID(),
	membership: randomUUID()
};

async function roleId(key: string) {
	const [role] = await admin.select().from(roles).where(eq(roles.key, key));
	if (!role) throw new Error(`missing ${key}`);
	return role.id;
}

describe('academic operations', () => {
	let periodId = '';
	let roomId = '';
	let timetableA = '';
	let examId = '';

	beforeAll(async () => {
		await migrate(admin, { migrationsFolder: './drizzle' });
		const managerRole = await roleId('manager_admin');
		const teacherRole = await roleId('teacher');
		const parentRole = await roleId('parent');
		await admin.insert(users).values([
			{
				id: ids.manager,
				fullName: 'Manager',
				email: `manager-acad-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.teacher,
				fullName: 'Teacher',
				email: `teacher-acad-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.otherTeacher,
				fullName: 'Other',
				email: `other-acad-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			},
			{
				id: ids.parent,
				fullName: 'Parent',
				email: `parent-acad-${suffix}@school.test`,
				emailVerifiedAt: new Date()
			}
		]);
		await admin
			.insert(schools)
			.values({ id: ids.school, name: 'Academic School', code: `acad-${suffix}` });
		await admin.insert(schoolSettings).values({ schoolId: ids.school });
		await admin.insert(schoolMemberships).values([
			{
				id: ids.membership,
				schoolId: ids.school,
				userId: ids.manager,
				roleId: managerRole,
				status: 'active'
			},
			{ schoolId: ids.school, userId: ids.teacher, roleId: teacherRole, status: 'active' },
			{ schoolId: ids.school, userId: ids.otherTeacher, roleId: teacherRole, status: 'active' },
			{ schoolId: ids.school, userId: ids.parent, roleId: parentRole, status: 'active' }
		]);
		await admin.insert(membershipPermissions).values(
			['timetables.manage', 'exams.manage', 'results.publish'].map((permissionKey) => ({
				membershipId: ids.membership,
				permissionKey
			}))
		);
		await admin.insert(academicSessions).values({
			id: ids.session,
			schoolId: ids.school,
			name: '2026-27',
			startDate: '2026-04-01',
			endDate: '2027-03-31',
			status: 'active'
		});
		await admin.insert(classes).values({
			id: ids.classId,
			schoolId: ids.school,
			sessionId: ids.session,
			name: 'Grade 5',
			gradeLevel: 5
		});
		await admin.insert(sections).values([
			{ id: ids.sectionA, schoolId: ids.school, classId: ids.classId, name: 'A' },
			{ id: ids.sectionB, schoolId: ids.school, classId: ids.classId, name: 'B' }
		]);
		await admin.insert(subjects).values([
			{ id: ids.math, schoolId: ids.school, name: 'Math', code: `math-${suffix}` },
			{ id: ids.science, schoolId: ids.school, name: 'Science', code: `sci-${suffix}` }
		]);
		await admin.insert(students).values([
			{
				id: ids.studentA,
				schoolId: ids.school,
				admissionNo: `A-${suffix}`,
				firstName: 'Meera',
				lastName: 'Joshi',
				currentSectionId: ids.sectionA
			},
			{
				id: ids.studentB,
				schoolId: ids.school,
				admissionNo: `B-${suffix}`,
				firstName: 'Arun',
				lastName: 'Das',
				currentSectionId: ids.sectionB
			}
		]);
		await admin.insert(studentEnrollments).values([
			{
				schoolId: ids.school,
				studentId: ids.studentA,
				sectionId: ids.sectionA,
				sessionId: ids.session,
				status: 'active'
			},
			{
				schoolId: ids.school,
				studentId: ids.studentB,
				sectionId: ids.sectionB,
				sessionId: ids.session,
				status: 'active'
			}
		]);
		await admin.insert(teacherAssignments).values([
			{
				schoolId: ids.school,
				teacherUserId: ids.teacher,
				sectionId: ids.sectionA,
				subjectId: ids.math,
				sessionId: ids.session
			},
			{
				schoolId: ids.school,
				teacherUserId: ids.teacher,
				sectionId: ids.sectionA,
				subjectId: ids.science,
				sessionId: ids.session
			},
			{
				schoolId: ids.school,
				teacherUserId: ids.teacher,
				sectionId: ids.sectionB,
				subjectId: ids.math,
				sessionId: ids.session
			},
			{
				schoolId: ids.school,
				teacherUserId: ids.otherTeacher,
				sectionId: ids.sectionB,
				subjectId: ids.math,
				sessionId: ids.session
			}
		]);
		await admin.insert(guardianStudents).values({
			schoolId: ids.school,
			guardianUserId: ids.parent,
			studentId: ids.studentA,
			relationship: 'mother'
		});
	});

	it('publishes a class timetable and rejects conflicts, stale edits, and other schools of visibility', async () => {
		await saveCalendar(app, ids.manager, ids.school, {
			workingDays: [1, 2, 3, 4, 5],
			dayStart: '08:00',
			dayEnd: '15:00',
			absentCountsAsZero: false
		});
		await savePeriod(app, ids.manager, ids.school, {
			name: 'P1',
			start: '09:00',
			end: '10:00',
			sortOrder: 1,
			kind: 'teaching'
		});
		await savePeriod(app, ids.manager, ids.school, {
			name: 'P2',
			start: '10:00',
			end: '11:00',
			sortOrder: 2,
			kind: 'teaching'
		});
		const room = await saveClassroom(app, ids.manager, ids.school, `Room ${suffix}`, 30);
		expect(room).toBeUndefined();
		const created = await openTimetable(app, ids.manager, ids.school, {
			sectionId: ids.sectionA,
			sessionId: ids.session,
			name: 'Grade 5 A'
		});
		timetableA = created.id;
		const [period] = await admin
			.select()
			.from(schema.timetablePeriods)
			.where(
				and(
					eq(schema.timetablePeriods.schoolId, ids.school),
					eq(schema.timetablePeriods.sortOrder, 1)
				)
			);
		periodId = period.id;
		const [classroom] = await admin
			.select()
			.from(schema.classrooms)
			.where(eq(schema.classrooms.schoolId, ids.school));
		roomId = classroom.id;
		await admin.insert(teacherQualifications).values({
			schoolId: ids.school,
			teacherUserId: ids.otherTeacher,
			subjectId: ids.math
		});
		await expect(
			saveEntry(app, ids.manager, ids.school, {
				timetableId: timetableA,
				lockVersion: 1,
				weekday: 1,
				periodId,
				subjectId: ids.math,
				teacherUserId: ids.teacher,
				classroomId: roomId
			})
		).rejects.toThrow(/not qualified/);
		await admin.delete(teacherQualifications).where(eq(teacherQualifications.schoolId, ids.school));
		await saveEntry(app, ids.manager, ids.school, {
			timetableId: timetableA,
			lockVersion: 1,
			weekday: 1,
			periodId,
			subjectId: ids.math,
			teacherUserId: ids.teacher,
			classroomId: roomId
		});
		await expect(
			saveEntry(app, ids.manager, ids.school, {
				timetableId: timetableA,
				lockVersion: 1,
				weekday: 1,
				periodId,
				subjectId: ids.math,
				teacherUserId: ids.teacher,
				classroomId: roomId
			})
		).rejects.toThrow(/Another editor/);
		await publishTimetable(app, ids.manager, ids.school, timetableA, 2);
		const visible = await withSchoolUser(app, ids.parent, ids.school, async (tx) => {
			return tx.select().from(timetables).where(eq(timetables.sectionId, ids.sectionA));
		});
		expect(visible).toHaveLength(1);
		const hidden = await withSchoolUser(app, ids.otherTeacher, ids.school, async (tx) => {
			return tx.select().from(timetables).where(eq(timetables.sectionId, ids.sectionA));
		});
		expect(hidden).toHaveLength(0);
		const csv = await exportTimetable(app, ids.parent, ids.school, timetableA);
		expect(csv).toContain(ids.teacher);
		const second = await openTimetable(app, ids.manager, ids.school, {
			sectionId: ids.sectionB,
			sessionId: ids.session,
			name: 'Grade 5 B'
		});
		await expect(
			saveEntry(app, ids.manager, ids.school, {
				timetableId: second.id,
				lockVersion: 1,
				weekday: 1,
				periodId,
				subjectId: ids.math,
				teacherUserId: ids.teacher,
				classroomId: null
			})
		).rejects.toThrow(/two classes/);
		await expect(
			saveEntry(app, ids.manager, ids.school, {
				timetableId: second.id,
				lockVersion: 1,
				weekday: 1,
				periodId,
				subjectId: ids.math,
				teacherUserId: ids.otherTeacher,
				classroomId: roomId
			})
		).rejects.toThrow(/classroom/);
	});

	it('publishes an exam timetable, approves marks, and hides unpublished results from parents', async () => {
		const exam = await createExam(app, ids.manager, ids.school, {
			sessionId: ids.session,
			name: `Unit ${suffix}`,
			examType: 'unit',
			instructions: 'Answer every question.',
			maxMarks: 100,
			passingMarks: 40,
			durationMinutes: 60
		});
		examId = exam.id;
		await addExamSlot(app, ids.manager, ids.school, {
			examId,
			subjectId: ids.math,
			sectionId: ids.sectionA,
			startsAt: '2026-07-01T09:00:00Z',
			endsAt: '2026-07-01T10:00:00Z',
			room: 'Hall',
			invigilatorUserId: ids.teacher,
			seatingPlan: 'Rows of four'
		});
		await expect(
			addExamSlot(app, ids.manager, ids.school, {
				examId,
				subjectId: ids.science,
				sectionId: ids.sectionA,
				startsAt: '2026-07-01T09:30:00Z',
				endsAt: '2026-07-01T10:30:00Z',
				room: 'Hall',
				invigilatorUserId: ids.teacher,
				seatingPlan: null
			})
		).rejects.toThrow(/overlap/);
		await addExamSlot(app, ids.manager, ids.school, {
			examId,
			subjectId: ids.science,
			sectionId: ids.sectionA,
			startsAt: '2026-07-02T09:00:00Z',
			endsAt: '2026-07-02T10:00:00Z',
			room: 'Lab',
			invigilatorUserId: ids.otherTeacher,
			seatingPlan: null
		});
		await publishExamSchedule(app, ids.manager, ids.school, examId);
		await saveMark(app, ids.teacher, ids.school, {
			examId,
			studentId: ids.studentA,
			subjectId: ids.math,
			outcome: 'scored',
			marksObtained: 40,
			maxMarks: 50,
			theoryObtained: 30,
			theoryMax: 40,
			practicalObtained: 10,
			practicalMax: 10,
			internalObtained: null,
			internalMax: null,
			remark: null
		});
		await saveMark(app, ids.teacher, ids.school, {
			examId,
			studentId: ids.studentA,
			subjectId: ids.science,
			outcome: 'absent',
			marksObtained: null,
			maxMarks: 50,
			theoryObtained: null,
			theoryMax: null,
			practicalObtained: null,
			practicalMax: null,
			internalObtained: null,
			internalMax: null,
			remark: null
		});
		await submitMarks(app, ids.teacher, ids.school, examId, ids.math);
		await submitMarks(app, ids.teacher, ids.school, examId, ids.science);
		await expect(approveResults(app, ids.teacher, ids.school, examId)).rejects.toThrow(
			/permission denied/
		);
		await approveResults(app, ids.manager, ids.school, examId);
		const before = await parentHome(app, ids.parent, ids.school, ids.studentA);
		expect(before.cards).toHaveLength(0);
		await publishReportCards(app, ids.manager, ids.school, examId);
		const after = await parentHome(app, ids.parent, ids.school, ids.studentA);
		expect(after.cards).toHaveLength(1);
		expect(after.timetable.length).toBeGreaterThan(0);
		expect(Number(after.cards[0].percentage)).toBe(80);
		await expect(parentHome(app, ids.parent, ids.school, ids.studentB)).rejects.toThrow(AuthError);
		const pdf = await reportCardPdf(app, ids.parent, ids.school, after.cards[0].id, true);
		expect(pdf).toContain('%PDF-1.4');
		await cancelExam(app, ids.manager, ids.school, examId);
	});

	it('blocks a second edit of submitted attendance', async () => {
		await saveAttendance(app, ids.teacher, ids.school, {
			studentId: ids.studentA,
			sectionId: ids.sectionA,
			date: '2026-08-03',
			status: 'present',
			submit: true
		});
		await expect(
			saveAttendance(app, ids.teacher, ids.school, {
				studentId: ids.studentA,
				sectionId: ids.sectionA,
				date: '2026-08-03',
				status: 'absent',
				submit: true
			})
		).rejects.toThrow(/finalized attendance/);
	});
});
