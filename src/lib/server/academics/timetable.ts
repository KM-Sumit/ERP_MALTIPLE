import { and, eq, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { rowsOf } from '../auth/session';
import { writeAudit } from '../audit/log';
import {
	academicSessions,
	classrooms,
	classTeachers,
	guardianStudents,
	notifications,
	notificationPreferences,
	schoolSettings,
	sections,
	users,
	studentEnrollments,
	subjects,
	teacherAssignments,
	teacherQualifications,
	timetableEntries,
	timetablePeriods,
	timetableRevisions,
	timetables
} from '../db/schema';
import { withSchoolUser, type AppDb, type TenantTx } from '../db/tenant';
import { allow, clean } from './access';
import { clock, periodSlotIssues, timetableIssues, type TimetableSlot } from './rules';

type SlotRow = {
	section_id: string;
	teacher_user_id: string | null;
	classroom_id: string | null;
	weekday: number;
	start_time: string;
	end_time: string;
	kind: 'teaching' | 'break';
	timetable_id: string;
	subject_id: string;
};

async function calendar(tx: TenantTx, schoolId: string) {
	const [settings] = await tx
		.select()
		.from(schoolSettings)
		.where(eq(schoolSettings.schoolId, schoolId));
	if (!settings) throw new AuthError('School settings are missing.');
	const days = Array.isArray(settings.workingDays)
		? settings.workingDays.map(Number)
		: String(settings.workingDays).replace(/[{}]/g, '').split(',').filter(Boolean).map(Number);
	return { ...settings, days };
}

async function slotsFor(tx: TenantTx, schoolId: string, timetableId: string) {
	const result = await tx.execute(sql`
		select t.section_id, e.teacher_user_id, e.classroom_id, e.weekday,
			p.start_time::text, p.end_time::text, p.kind, t.id as timetable_id, e.subject_id
		from timetable_entries e
		join timetable_periods p on p.id = e.period_id and p.school_id = e.school_id
		join timetables t on t.id = e.timetable_id and t.school_id = e.school_id
		where e.school_id = ${schoolId}::uuid
			and (t.status = 'published' or t.id = ${timetableId}::uuid)
	`);
	return rowsOf(result) as unknown as SlotRow[];
}

function toSlots(rows: SlotRow[]): TimetableSlot[] {
	return rows.map((row) => ({
		weekday: Number(row.weekday),
		start: clock(row.start_time),
		end: clock(row.end_time),
		teacherId: row.teacher_user_id,
		classroomId: row.classroom_id,
		sectionId: row.section_id,
		kind: row.kind
	}));
}

async function assertTeachable(tx: TenantTx, schoolId: string, input: SlotRow) {
	if (input.kind === 'break') throw new AuthError('A break cannot be assigned as a class period.');
	const [timetable] = await tx
		.select()
		.from(timetables)
		.where(eq(timetables.id, input.timetable_id));
	if (!timetable) throw new AuthError('Choose a timetable.');
	const assigned = await tx
		.select()
		.from(teacherAssignments)
		.where(
			and(
				eq(teacherAssignments.schoolId, schoolId),
				eq(teacherAssignments.teacherUserId, input.teacher_user_id ?? ''),
				eq(teacherAssignments.sectionId, timetable.sectionId),
				eq(teacherAssignments.sessionId, timetable.sessionId),
				eq(teacherAssignments.subjectId, input.subject_id)
			)
		);
	if (!input.teacher_user_id || assigned.length === 0) {
		throw new AuthError('That teacher is not assigned to this class and subject.');
	}
	const configured = await tx
		.select()
		.from(teacherQualifications)
		.where(
			and(
				eq(teacherQualifications.schoolId, schoolId),
				eq(teacherQualifications.subjectId, input.subject_id)
			)
		);
	if (
		configured.length > 0 &&
		!configured.some((row) => row.teacherUserId === input.teacher_user_id)
	) {
		throw new AuthError('That teacher is not qualified for this subject.');
	}
}

async function notify(
	tx: TenantTx,
	schoolId: string,
	userId: string,
	kind: string,
	title: string,
	body: string
) {
	const [preference] = await tx
		.select()
		.from(notificationPreferences)
		.where(
			and(
				eq(notificationPreferences.schoolId, schoolId),
				eq(notificationPreferences.userId, userId),
				eq(notificationPreferences.kind, kind)
			)
		);
	if (preference && !preference.enabled) return;
	await tx.insert(notifications).values({ schoolId, userId, title, body });
}

export async function saveCalendar(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { workingDays: number[]; dayStart: string; dayEnd: string; absentCountsAsZero: boolean }
) {
	const days = [...new Set(input.workingDays)].filter((day) => day >= 0 && day <= 6);
	if (days.length === 0) throw new AuthError('Choose at least one working day.');
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage', 'school.settings.manage']);
		await tx
			.update(schoolSettings)
			.set({
				workingDays: days,
				dayStart: clock(input.dayStart).slice(0, 8),
				dayEnd: clock(input.dayEnd).slice(0, 8),
				absentCountsAsZero: input.absentCountsAsZero
			})
			.where(eq(schoolSettings.schoolId, schoolId));
	});
}

export async function savePeriod(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { name: string; start: string; end: string; sortOrder: number; kind: 'teaching' | 'break' }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		const existing = await tx
			.select()
			.from(timetablePeriods)
			.where(eq(timetablePeriods.schoolId, schoolId));
		const next = [
			...existing.map((period) => ({ start: period.startTime, end: period.endTime })),
			{ start: input.start, end: input.end }
		];
		const issues = periodSlotIssues(next);
		const settings = await calendar(tx, schoolId);
		if (
			clock(input.start) < clock(settings.dayStart) ||
			clock(input.end) > clock(settings.dayEnd)
		) {
			issues.push('A period falls outside school working hours.');
		}
		if (issues.length > 0) throw new AuthError(issues[0]);
		await tx.insert(timetablePeriods).values({
			schoolId,
			name: clean(input.name),
			startTime: clock(input.start).slice(0, 8),
			endTime: clock(input.end).slice(0, 8),
			sortOrder: input.sortOrder,
			kind: input.kind
		});
	});
}

export async function saveClassroom(
	db: AppDb,
	userId: string,
	schoolId: string,
	name: string,
	capacity: number | null
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		await tx.insert(classrooms).values({
			schoolId,
			name: clean(name),
			capacity: capacity && capacity > 0 ? capacity : null
		});
	});
}

export async function assignClassTeacher(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { sectionId: string; sessionId: string; teacherUserId: string }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['classes.manage', 'school.records.manage']);
		await tx
			.insert(classTeachers)
			.values({ schoolId, ...input })
			.onConflictDoUpdate({
				target: [classTeachers.sectionId, classTeachers.sessionId],
				set: { teacherUserId: input.teacherUserId }
			});
	});
}

export async function qualifyTeacher(
	db: AppDb,
	userId: string,
	schoolId: string,
	teacherUserId: string,
	subjectId: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['classes.manage', 'school.records.manage']);
		await tx.insert(teacherQualifications).values({ schoolId, teacherUserId, subjectId });
	});
}

export async function openTimetable(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { sectionId: string; sessionId: string; name: string }
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		const [section] = await tx
			.select()
			.from(sections)
			.where(and(eq(sections.id, input.sectionId), eq(sections.schoolId, schoolId)));
		const [session] = await tx
			.select()
			.from(academicSessions)
			.where(
				and(eq(academicSessions.id, input.sessionId), eq(academicSessions.schoolId, schoolId))
			);
		if (!section || !session) throw new AuthError('That class is not in this school.');
		const [created] = await tx
			.insert(timetables)
			.values({
				schoolId,
				sectionId: input.sectionId,
				sessionId: input.sessionId,
				name: clean(input.name)
			})
			.returning();
		return created;
	});
}

export async function saveEntry(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		timetableId: string;
		lockVersion: number;
		weekday: number;
		periodId: string;
		subjectId: string;
		teacherUserId: string;
		classroomId: string | null;
	}
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		await tx.execute(sql`select id from timetables where school_id = ${schoolId}::uuid for update`);
		const [timetable] = await tx
			.select()
			.from(timetables)
			.where(and(eq(timetables.id, input.timetableId), eq(timetables.schoolId, schoolId)));
		if (!timetable || timetable.status !== 'draft')
			throw new AuthError('Only a draft timetable can be edited.');
		if (timetable.lockVersion !== input.lockVersion) {
			throw new AuthError('Another editor changed this timetable. Reload before publishing.');
		}
		const rows = await slotsFor(tx, schoolId, input.timetableId);
		const [period] = await tx
			.select()
			.from(timetablePeriods)
			.where(and(eq(timetablePeriods.id, input.periodId), eq(timetablePeriods.schoolId, schoolId)));
		if (!period) throw new AuthError('Choose a period.');
		const candidate: SlotRow = {
			section_id: timetable.sectionId,
			teacher_user_id: input.teacherUserId,
			classroom_id: input.classroomId,
			weekday: input.weekday,
			start_time: period.startTime,
			end_time: period.endTime,
			kind: period.kind as 'teaching' | 'break',
			timetable_id: timetable.id,
			subject_id: input.subjectId
		};
		await assertTeachable(tx, schoolId, candidate);
		const settings = await calendar(tx, schoolId);
		const withoutSameSlot = rows.filter(
			(row) =>
				!(
					row.timetable_id === input.timetableId &&
					Number(row.weekday) === input.weekday &&
					row.start_time === period.startTime
				)
		);
		const issues = timetableIssues(toSlots([...withoutSameSlot, candidate]), {
			workingDays: settings.days,
			dayStart: settings.dayStart,
			dayEnd: settings.dayEnd
		});
		if (issues.length > 0) throw new AuthError(issues[0]);
		await tx
			.insert(timetableEntries)
			.values({
				schoolId,
				timetableId: input.timetableId,
				weekday: input.weekday,
				periodId: input.periodId,
				subjectId: input.subjectId,
				teacherUserId: input.teacherUserId,
				classroomId: input.classroomId
			})
			.onConflictDoUpdate({
				target: [timetableEntries.timetableId, timetableEntries.weekday, timetableEntries.periodId],
				set: {
					subjectId: input.subjectId,
					teacherUserId: input.teacherUserId,
					classroomId: input.classroomId
				}
			});
		const bumped = await tx
			.update(timetables)
			.set({ lockVersion: timetable.lockVersion + 1 })
			.where(and(eq(timetables.id, timetable.id), eq(timetables.lockVersion, input.lockVersion)))
			.returning();
		if (bumped.length === 0) {
			throw new AuthError('Another editor changed this timetable. Reload before publishing.');
		}
	});
}

export async function previewTimetable(
	db: AppDb,
	userId: string,
	schoolId: string,
	timetableId: string
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		const settings = await calendar(tx, schoolId);
		const rows = await slotsFor(tx, schoolId, timetableId);
		return timetableIssues(toSlots(rows), {
			workingDays: settings.days,
			dayStart: settings.dayStart,
			dayEnd: settings.dayEnd
		});
	});
}

export async function publishTimetable(
	db: AppDb,
	userId: string,
	schoolId: string,
	timetableId: string,
	lockVersion: number
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		await tx.execute(sql`select id from timetables where school_id = ${schoolId}::uuid for update`);
		const issues = await previewInside(tx, schoolId, timetableId);
		if (issues.length > 0) throw new AuthError(issues.join(' '));
		const rows = await slotsFor(tx, schoolId, timetableId);
		for (const row of rows.filter((row) => row.timetable_id === timetableId)) {
			await assertTeachable(tx, schoolId, row);
		}
		const [current] = await tx.select().from(timetables).where(eq(timetables.id, timetableId));
		if (!current || current.status !== 'draft')
			throw new AuthError('Only a draft timetable can be published.');
		await tx.insert(timetableRevisions).values({
			schoolId,
			timetableId,
			revision: current.revision,
			snapshot: rows.filter((row) => row.timetable_id === timetableId),
			createdBy: userId
		});
		const published = await tx
			.update(timetables)
			.set({
				status: 'published',
				publishedAt: new Date(),
				lockVersion: current.lockVersion + 1
			})
			.where(and(eq(timetables.id, timetableId), eq(timetables.lockVersion, lockVersion)))
			.returning();
		if (published.length === 0) {
			throw new AuthError('Another editor changed this timetable. Reload before publishing.');
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'timetables.publish',
			entityType: 'timetable',
			entityId: timetableId
		});
		const teachers = [
			...new Set(
				rows
					.filter((row) => row.timetable_id === timetableId)
					.map((row) => row.teacher_user_id)
					.filter(Boolean)
			)
		] as string[];
		for (const teacherId of teachers) {
			await notify(
				tx,
				schoolId,
				teacherId,
				'timetable',
				'Timetable published',
				'Your class timetable is published.'
			);
		}
		const guardians = await tx
			.select()
			.from(guardianStudents)
			.innerJoin(
				studentEnrollments,
				and(
					eq(studentEnrollments.studentId, guardianStudents.studentId),
					eq(studentEnrollments.schoolId, schoolId),
					eq(studentEnrollments.sectionId, current.sectionId),
					eq(studentEnrollments.sessionId, current.sessionId)
				)
			)
			.where(eq(guardianStudents.schoolId, schoolId));
		for (const row of guardians) {
			await notify(
				tx,
				schoolId,
				row.guardian_students.guardianUserId,
				'timetable',
				'Class timetable published',
				'The class timetable is available.'
			);
		}
	});
}

async function previewInside(tx: TenantTx, schoolId: string, timetableId: string) {
	const settings = await calendar(tx, schoolId);
	return timetableIssues(toSlots(await slotsFor(tx, schoolId, timetableId)), {
		workingDays: settings.days,
		dayStart: settings.dayStart,
		dayEnd: settings.dayEnd
	});
}

export async function reviseTimetable(
	db: AppDb,
	userId: string,
	schoolId: string,
	timetableId: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		const [current] = await tx
			.select()
			.from(timetables)
			.where(and(eq(timetables.id, timetableId), eq(timetables.schoolId, schoolId)));
		if (!current || current.status !== 'published')
			throw new AuthError('Only a published timetable can be revised.');
		await tx
			.update(timetables)
			.set({
				status: 'draft',
				revision: current.revision + 1,
				lockVersion: current.lockVersion + 1
			})
			.where(eq(timetables.id, timetableId));
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'timetables.revise',
			entityType: 'timetable',
			entityId: timetableId
		});
	});
}

export async function timetableBoard(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['timetables.manage']);
		const settings = await calendar(tx, schoolId);
		return {
			settings: {
				workingDays: settings.days,
				dayStart: settings.dayStart,
				dayEnd: settings.dayEnd,
				absentCountsAsZero: settings.absentCountsAsZero
			},
			periods: await tx
				.select()
				.from(timetablePeriods)
				.where(eq(timetablePeriods.schoolId, schoolId)),
			rooms: await tx.select().from(classrooms).where(eq(classrooms.schoolId, schoolId)),
			sessions: await tx
				.select()
				.from(academicSessions)
				.where(eq(academicSessions.schoolId, schoolId)),
			sections: await tx.select().from(sections).where(eq(sections.schoolId, schoolId)),
			timetables: await tx.select().from(timetables).where(eq(timetables.schoolId, schoolId)),
			entries: await tx
				.select()
				.from(timetableEntries)
				.where(eq(timetableEntries.schoolId, schoolId)),
			revisions: await tx
				.select()
				.from(timetableRevisions)
				.where(eq(timetableRevisions.schoolId, schoolId)),
			subjects: await tx.select().from(subjects).where(eq(subjects.schoolId, schoolId)),
			assignments: await tx
				.select()
				.from(teacherAssignments)
				.where(eq(teacherAssignments.schoolId, schoolId)),
			people: await tx.select({ id: users.id, fullName: users.fullName }).from(users)
		};
	});
}

export async function exportTimetable(
	db: AppDb,
	userId: string,
	schoolId: string,
	timetableId: string
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const [timetable] = await tx
			.select()
			.from(timetables)
			.where(and(eq(timetables.id, timetableId), eq(timetables.schoolId, schoolId)));
		if (!timetable) throw new AuthError('Timetable not found.');
		if (timetable.status !== 'published') await allow(tx, schoolId, ['timetables.manage']);
		const entries = await tx
			.select()
			.from(timetableEntries)
			.where(eq(timetableEntries.timetableId, timetableId));
		const lines = ['weekday,period_id,subject_id,teacher_user_id,classroom_id'];
		for (const entry of entries) {
			lines.push(
				[
					entry.weekday,
					entry.periodId,
					entry.subjectId,
					entry.teacherUserId ?? '',
					entry.classroomId ?? ''
				].join(',')
			);
		}
		return lines.join('\n');
	});
}
