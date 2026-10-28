import { and, desc, eq, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { rowsOf } from '../auth/session';
import {
	assignments,
	attendanceCorrections,
	attendanceRecords,
	complaints,
	courseMaterials,
	courses,
	documentRequests,
	examSchedules,
	exams,
	guardianStudents,
	invoices,
	meetingRequests,
	notifications,
	notificationPreferences,
	payments,
	reportCards,
	marks,
	schoolNotices,
	staffLeave,
	studentEnrollments,
	students,
	teacherAssignments,
	timetableEntries,
	timetables
} from '../db/schema';
import { withSchoolUser, type AppDb } from '../db/tenant';
import { writeAudit } from '../audit/log';
import { allow, clean, linkedStudent } from './access';

export async function teacherHome(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const assignmentsForTeacher = await tx
			.select()
			.from(teacherAssignments)
			.where(
				and(eq(teacherAssignments.schoolId, schoolId), eq(teacherAssignments.teacherUserId, userId))
			);
		const weekday = new Date().getDay();
		const today = await tx
			.select()
			.from(timetableEntries)
			.innerJoin(timetables, eq(timetables.id, timetableEntries.timetableId))
			.where(
				and(
					eq(timetableEntries.schoolId, schoolId),
					eq(timetableEntries.teacherUserId, userId),
					eq(timetableEntries.weekday, weekday),
					eq(timetables.status, 'published')
				)
			);
		return {
			assignments: assignmentsForTeacher,
			today,
			exams: await tx.select().from(exams).where(eq(exams.schoolId, schoolId)),
			duties: await tx
				.select()
				.from(examSchedules)
				.where(
					and(eq(examSchedules.schoolId, schoolId), eq(examSchedules.invigilatorUserId, userId))
				),
			pendingMarks: await tx
				.select()
				.from(marks)
				.where(and(eq(marks.schoolId, schoolId), eq(marks.workflow, 'draft'))),
			notices: await tx
				.select()
				.from(schoolNotices)
				.where(eq(schoolNotices.schoolId, schoolId))
				.limit(10),
			complaints: await tx
				.select()
				.from(complaints)
				.where(eq(complaints.schoolId, schoolId))
				.limit(10),
			documents: await tx
				.select()
				.from(documentRequests)
				.where(eq(documentRequests.schoolId, schoolId))
				.limit(10),
			homework: await tx
				.select()
				.from(assignments)
				.where(eq(assignments.schoolId, schoolId))
				.limit(10)
		};
	});
}

export async function saveAttendance(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		studentId: string;
		sectionId: string;
		date: string;
		status: 'present' | 'absent' | 'late' | 'excused';
		submit: boolean;
	}
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['attendance.mark']);
		const readable = await tx.execute(
			sql`select app.can_read_student(${schoolId}::uuid, ${input.studentId}::uuid) as ok`
		);
		if (rowsOf(readable)[0]?.ok !== true) throw new AuthError('permission denied');
		const assigned = await tx
			.select()
			.from(teacherAssignments)
			.where(
				and(
					eq(teacherAssignments.schoolId, schoolId),
					eq(teacherAssignments.teacherUserId, userId),
					eq(teacherAssignments.sectionId, input.sectionId)
				)
			);
		if (assigned.length === 0) throw new AuthError('permission denied');
		const [existing] = await tx
			.select()
			.from(attendanceRecords)
			.where(
				and(
					eq(attendanceRecords.studentId, input.studentId),
					eq(attendanceRecords.attendanceDate, input.date)
				)
			);
		if (existing?.workflow === 'submitted') {
			throw new AuthError('finalized attendance cannot be edited');
		}
		if (existing) {
			await tx
				.update(attendanceRecords)
				.set({
					status: input.status,
					workflow: input.submit ? 'submitted' : 'draft',
					sectionId: input.sectionId
				})
				.where(eq(attendanceRecords.id, existing.id));
		} else {
			await tx.insert(attendanceRecords).values({
				schoolId,
				studentId: input.studentId,
				sectionId: input.sectionId,
				attendanceDate: input.date,
				status: input.status,
				workflow: input.submit ? 'submitted' : 'draft',
				recordedBy: userId
			});
		}
	});
}

export async function requestAttendanceCorrection(
	db: AppDb,
	userId: string,
	schoolId: string,
	attendanceId: string,
	note: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['attendance.mark']);
		const [correction] = await tx
			.insert(attendanceCorrections)
			.values({
				schoolId,
				attendanceId,
				requestedBy: userId,
				note: clean(note)
			})
			.returning();
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'attendance.correction',
			entityType: 'attendance',
			entityId: attendanceId,
			metadata: { correctionId: correction.id }
		});
	});
}

export async function createHomework(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		sectionId: string;
		subjectId: string;
		title: string;
		instructions: string;
		dueAt: string | null;
	}
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['school.teaching.write']);
		const assigned = await tx
			.select()
			.from(teacherAssignments)
			.where(
				and(
					eq(teacherAssignments.teacherUserId, userId),
					eq(teacherAssignments.sectionId, input.sectionId),
					eq(teacherAssignments.subjectId, input.subjectId)
				)
			);
		if (assigned.length === 0) throw new AuthError('permission denied');
		const [course] = await tx
			.insert(courses)
			.values({
				schoolId,
				subjectId: input.subjectId,
				sectionId: input.sectionId,
				title: clean(input.title),
				status: 'published'
			})
			.returning();
		const [assignment] = await tx
			.insert(assignments)
			.values({
				schoolId,
				courseId: course.id,
				title: clean(input.title),
				instructions: clean(input.instructions),
				status: 'published',
				dueAt: input.dueAt ? new Date(input.dueAt) : null
			})
			.returning();
		return assignment;
	});
}

export async function requestMeeting(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string,
	note: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await tx.insert(meetingRequests).values({
			schoolId,
			teacherUserId: userId,
			studentId,
			note: clean(note)
		});
	});
}

export async function requestStaffLeave(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { startDate: string; endDate: string; reason: string }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await tx.insert(staffLeave).values({ schoolId, userId, ...input, reason: clean(input.reason) });
	});
}

export async function parentHome(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const links = await tx
			.select()
			.from(guardianStudents)
			.where(
				and(eq(guardianStudents.schoolId, schoolId), eq(guardianStudents.guardianUserId, userId))
			);
		const children = await tx.select().from(students).where(eq(students.schoolId, schoolId));
		const linked = children.filter((child) => links.some((link) => link.studentId === child.id));
		const selected = studentId ? linked.find((child) => child.id === studentId) : linked[0];
		if (studentId && !selected) throw new AuthError('permission denied');
		if (!selected) {
			return {
				children: linked,
				selected: null,
				attendance: [],
				timetable: [],
				homework: [],
				cards: [],
				invoices: [],
				payments: [],
				notices: [],
				documents: [],
				complaints: [],
				materials: [],
				messages: []
			};
		}
		await linkedStudent(tx, schoolId, userId, selected.id);
		const enrollment = (
			await tx
				.select()
				.from(studentEnrollments)
				.where(
					and(
						eq(studentEnrollments.studentId, selected.id),
						eq(studentEnrollments.status, 'active')
					)
				)
		)[0];
		return {
			children: linked,
			selected,
			attendance: await tx
				.select()
				.from(attendanceRecords)
				.where(eq(attendanceRecords.studentId, selected.id))
				.orderBy(desc(attendanceRecords.attendanceDate))
				.limit(30),
			timetable: enrollment
				? await tx
						.select()
						.from(timetableEntries)
						.innerJoin(timetables, eq(timetables.id, timetableEntries.timetableId))
						.where(
							and(
								eq(timetables.sectionId, enrollment.sectionId),
								eq(timetables.status, 'published')
							)
						)
				: [],
			homework: enrollment
				? await tx
						.select()
						.from(assignments)
						.innerJoin(courses, eq(courses.id, assignments.courseId))
						.where(
							and(eq(courses.sectionId, enrollment.sectionId), eq(assignments.status, 'published'))
						)
				: [],
			cards: await tx
				.select()
				.from(reportCards)
				.where(and(eq(reportCards.studentId, selected.id), eq(reportCards.status, 'published'))),
			invoices: await tx
				.select()
				.from(invoices)
				.where(and(eq(invoices.studentId, selected.id), sql`${invoices.status} <> 'draft'`)),
			payments: await tx.select().from(payments).where(eq(payments.studentId, selected.id)),
			notices: await tx
				.select()
				.from(schoolNotices)
				.where(eq(schoolNotices.schoolId, schoolId))
				.limit(20),
			documents: await tx
				.select()
				.from(documentRequests)
				.where(eq(documentRequests.studentId, selected.id)),
			complaints: await tx
				.select()
				.from(complaints)
				.where(and(eq(complaints.schoolId, schoolId), eq(complaints.raisedBy, userId))),
			materials: enrollment
				? await tx
						.select()
						.from(courseMaterials)
						.innerJoin(courses, eq(courses.id, courseMaterials.courseId))
						.where(
							and(eq(courses.sectionId, enrollment.sectionId), eq(courses.status, 'published'))
						)
				: [],
			messages: await tx
				.select()
				.from(notifications)
				.where(and(eq(notifications.schoolId, schoolId), eq(notifications.userId, userId)))
				.orderBy(desc(notifications.createdAt))
				.limit(20)
		};
	});
}

export async function setNotificationPreference(
	db: AppDb,
	userId: string,
	schoolId: string,
	kind: string,
	enabled: boolean
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await tx
			.insert(notificationPreferences)
			.values({ schoolId, userId, kind, enabled })
			.onConflictDoUpdate({
				target: [
					notificationPreferences.schoolId,
					notificationPreferences.userId,
					notificationPreferences.kind
				],
				set: { enabled }
			});
	});
}

export async function requestDocument(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string,
	docType: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await linkedStudent(tx, schoolId, userId, studentId);
		await tx.insert(documentRequests).values({
			schoolId,
			studentId,
			requestedBy: userId,
			docType: clean(docType)
		});
	});
}

export async function attendanceHistory(
	db: AppDb,
	userId: string,
	schoolId: string,
	sectionId: string
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['attendance.mark']);
		return tx
			.select()
			.from(attendanceRecords)
			.where(
				and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.sectionId, sectionId))
			)
			.orderBy(desc(attendanceRecords.attendanceDate))
			.limit(50);
	});
}

export async function inbox(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		return tx
			.select()
			.from(notifications)
			.where(and(eq(notifications.schoolId, schoolId), eq(notifications.userId, userId)))
			.orderBy(desc(notifications.createdAt))
			.limit(20);
	});
}
