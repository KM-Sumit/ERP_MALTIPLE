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
		const ist = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
		const weekday = ist.getUTCDay();
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
		const classes = rowsOf(
			await tx.execute(sql`
				select sec.id as section_id, c.name as class_name, sec.name as section_name,
					string_agg(distinct sub.name, ', ') as subjects,
					(select count(*) from students st
						where st.current_section_id = sec.id and st.school_id = sec.school_id and st.deleted_at is null)::int as students
				from teacher_assignments ta
				join sections sec on sec.id = ta.section_id and sec.school_id = ta.school_id
				join classes c on c.id = sec.class_id and c.school_id = sec.school_id
				join subjects sub on sub.id = ta.subject_id and sub.school_id = ta.school_id
				where ta.school_id = ${schoolId}::uuid and ta.teacher_user_id = ${userId}::uuid
				group by sec.id, c.name, sec.name
				order by c.name, sec.name
			`)
		).map((row) => ({
			sectionId: String(row.section_id),
			className: String(row.class_name),
			sectionName: String(row.section_name),
			subjects: String(row.subjects),
			students: Number(row.students ?? 0)
		}));
		const periods = rowsOf(
			await tx.execute(sql`
				select p.start_time::text as start_time, p.end_time::text as end_time,
					c.name as class_name, sec.name as section_name, sub.name as subject_name,
					coalesce(e.room, '') as room, sec.id as section_id
				from timetable_entries e
				join timetables t on t.id = e.timetable_id and t.school_id = e.school_id and t.status = 'published'
				join timetable_periods p on p.id = e.period_id and p.school_id = e.school_id
				join sections sec on sec.id = t.section_id and sec.school_id = t.school_id
				join classes c on c.id = sec.class_id and c.school_id = sec.school_id
				join subjects sub on sub.id = e.subject_id and sub.school_id = e.school_id
				where e.school_id = ${schoolId}::uuid and e.teacher_user_id = ${userId}::uuid and e.weekday = ${weekday}
				order by p.sort_order
			`)
		).map((row) => ({
			start: String(row.start_time).slice(0, 5),
			end: String(row.end_time).slice(0, 5),
			className: String(row.class_name),
			sectionName: String(row.section_name),
			subject: String(row.subject_name),
			room: String(row.room),
			sectionId: String(row.section_id)
		}));
		const roster = rowsOf(
			await tx.execute(sql`
				select distinct on (st.id, sec.id)
					st.id as student_id, st.first_name, st.last_name,
					coalesce(en.roll_number, '') as roll_number,
					sec.id as section_id,
					coalesce(ar.status, '') as status
				from teacher_assignments ta
				join sections sec on sec.id = ta.section_id and sec.school_id = ta.school_id
				join students st on st.current_section_id = sec.id and st.school_id = sec.school_id
					and st.deleted_at is null and st.status = 'active'
				left join student_enrollments en on en.student_id = st.id and en.section_id = sec.id
					and en.school_id = st.school_id and en.status = 'active'
				left join attendance_records ar on ar.student_id = st.id and ar.school_id = st.school_id
					and ar.attendance_date = (now() at time zone 'Asia/Kolkata')::date
				where ta.school_id = ${schoolId}::uuid and ta.teacher_user_id = ${userId}::uuid
				order by st.id, sec.id, en.roll_number nulls last
			`)
		).map((row) => ({
			id: String(row.student_id),
			name: `${row.first_name} ${row.last_name}`.trim(),
			roll: String(row.roll_number ?? ''),
			sectionId: String(row.section_id),
			status: String(row.status ?? '')
		}));
		const tasks = rowsOf(
			await tx.execute(sql`
				select a.id, a.title, a.due_at, coalesce(c.name, '') as class_name,
					coalesce(sec.name, '') as section_name, coalesce(sub.name, '') as subject_name,
					(select count(*) from assignment_submissions s
						where s.assignment_id = a.id and s.school_id = a.school_id)::int as submitted,
					(select count(*) from students st
						where st.school_id = a.school_id and st.deleted_at is null and st.status = 'active'
						and (co.section_id is null or st.current_section_id = co.section_id))::int as total
				from assignments a
				join courses co on co.id = a.course_id and co.school_id = a.school_id
				left join sections sec on sec.id = co.section_id and sec.school_id = co.school_id
				left join classes c on c.id = sec.class_id and c.school_id = sec.school_id
				left join subjects sub on sub.id = co.subject_id and sub.school_id = co.school_id
				where a.school_id = ${schoolId}::uuid
					and (
						co.section_id is null
						or co.section_id in (
							select section_id from teacher_assignments
							where school_id = ${schoolId}::uuid and teacher_user_id = ${userId}::uuid
						)
					)
				order by a.due_at nulls last
				limit 6
			`)
		).map((row) => ({
			id: String(row.id),
			title: String(row.title),
			className: String(row.class_name),
			sectionName: String(row.section_name),
			subject: String(row.subject_name),
			dueAt: row.due_at ? String(row.due_at) : '',
			submitted: Number(row.submitted ?? 0),
			total: Number(row.total ?? 0)
		}));
		const performance = rowsOf(
			await tx.execute(sql`
				select sub.name as subject_name,
					round(avg(m.marks_obtained::numeric / nullif(m.max_marks, 0) * 100))::int as percent
				from marks m
				join subjects sub on sub.id = m.subject_id and sub.school_id = m.school_id
				join teacher_assignments ta on ta.subject_id = m.subject_id and ta.school_id = m.school_id
					and ta.teacher_user_id = ${userId}::uuid
				where m.school_id = ${schoolId}::uuid
					and m.workflow in ('submitted', 'approved')
					and m.marks_obtained is not null
				group by sub.name
				order by sub.name
				limit 6
			`)
		).map((row) => ({
			subject: String(row.subject_name),
			percent: Number(row.percent ?? 0)
		}));
		const papers = rowsOf(
			await tx.execute(sql`
				select ex.id, ex.name, ex.status, coalesce(sub.name, '') as subject_name,
					es.starts_at
				from exams ex
				left join exam_schedules es on es.exam_id = ex.id and es.school_id = ex.school_id
				left join subjects sub on sub.id = es.subject_id and sub.school_id = es.school_id
				where ex.school_id = ${schoolId}::uuid and ex.status <> 'cancelled'
				order by es.starts_at nulls last
				limit 6
			`)
		).map((row) => ({
			id: String(row.id),
			name: String(row.name),
			status: String(row.status),
			subject: String(row.subject_name),
			startsAt: row.starts_at ? String(row.starts_at) : ''
		}));
		const leaves = rowsOf(
			await tx.execute(sql`
				select id, reason, start_date::text as start_date, end_date::text as end_date, status, created_at
				from staff_leave
				where school_id = ${schoolId}::uuid and user_id = ${userId}::uuid
				order by created_at desc
				limit 4
			`)
		).map((row) => ({
			id: String(row.id),
			reason: String(row.reason),
			start: String(row.start_date),
			end: String(row.end_date),
			status: String(row.status),
			createdAt: String(row.created_at)
		}));
		const messages = rowsOf(
			await tx.execute(sql`
				select id, title, body, created_at, read_at
				from notifications
				where school_id = ${schoolId}::uuid and user_id = ${userId}::uuid
				order by created_at desc
				limit 4
			`)
		).map((row) => ({
			id: String(row.id),
			title: String(row.title),
			body: String(row.body),
			createdAt: String(row.created_at),
			unread: row.read_at == null
		}));
		return {
			assignments: assignmentsForTeacher,
			classes,
			periods,
			roster,
			tasks,
			performance,
			papers,
			leaves,
			messages,
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
				.orderBy(desc(schoolNotices.createdAt))
				.limit(10),
			complaints: await tx
				.select()
				.from(complaints)
				.where(eq(complaints.schoolId, schoolId))
				.orderBy(desc(complaints.createdAt))
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
