import { and, eq, ne, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { rowsOf } from '../auth/session';
import { writeAudit } from '../audit/log';
import {
	academicSessions,
	examSchedules,
	exams,
	gradingRules,
	guardianStudents,
	marks,
	notifications,
	notificationPreferences,
	reportCards,
	schoolSettings,
	schools,
	sections,
	studentEnrollments,
	students,
	subjects,
	teacherAssignments
} from '../db/schema';
import { withSchoolUser, type AppDb, type TenantTx } from '../db/tenant';
import { assertStatusTransition } from '../domain/transitions';
import { allow } from './access';
import { simplePdf } from './pdf';
import { componentTotal, examSlotIssues, summarizeMarks, type MarkOutcome } from './rules';

const EXAM_TYPES = ['unit', 'monthly', 'half_yearly', 'annual', 'practical', 'custom'] as const;

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

export async function createExam(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		sessionId: string;
		name: string;
		examType: string;
		instructions: string;
		maxMarks: number | null;
		passingMarks: number | null;
		durationMinutes: number | null;
	}
) {
	if (!EXAM_TYPES.includes(input.examType as (typeof EXAM_TYPES)[number])) {
		throw new AuthError('Choose an examination type.');
	}
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['exams.manage']);
		const [created] = await tx
			.insert(exams)
			.values({
				schoolId,
				sessionId: input.sessionId,
				name: input.name.trim(),
				examType: input.examType,
				instructions: input.instructions.trim(),
				maxMarks: input.maxMarks,
				passingMarks: input.passingMarks,
				durationMinutes: input.durationMinutes
			})
			.returning();
		return created;
	});
}

export async function addExamSlot(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		examId: string;
		subjectId: string;
		sectionId: string;
		startsAt: string;
		endsAt: string;
		room: string | null;
		invigilatorUserId: string | null;
		seatingPlan: string | null;
	}
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['exams.manage']);
		await tx.execute(sql`select id from exams where school_id = ${schoolId}::uuid for update`);
		const [exam] = await tx
			.select()
			.from(exams)
			.where(and(eq(exams.id, input.examId), eq(exams.schoolId, schoolId)));
		if (!exam || exam.status !== 'draft')
			throw new AuthError('Exam slots can only be added to a draft.');
		const [session] = await tx
			.select()
			.from(academicSessions)
			.where(eq(academicSessions.id, exam.sessionId));
		if (!session) throw new AuthError('Academic session is missing.');
		const [section] = await tx
			.select()
			.from(sections)
			.where(and(eq(sections.id, input.sectionId), eq(sections.schoolId, schoolId)));
		if (!section) throw new AuthError('That class is not in this school.');
		const start = Date.parse(input.startsAt);
		const end = Date.parse(input.endsAt);
		if (exam.durationMinutes && Math.round((end - start) / 60000) !== exam.durationMinutes) {
			throw new AuthError('An exam duration is invalid.');
		}
		const existing = await tx
			.select({
				sectionId: examSchedules.sectionId,
				subjectId: examSchedules.subjectId,
				startsAt: examSchedules.startsAt,
				endsAt: examSchedules.endsAt,
				room: examSchedules.room,
				invigilatorUserId: examSchedules.invigilatorUserId,
				status: exams.status
			})
			.from(examSchedules)
			.innerJoin(exams, eq(exams.id, examSchedules.examId))
			.where(and(eq(examSchedules.schoolId, schoolId), ne(exams.status, 'cancelled')));
		const issues = examSlotIssues(
			[
				...existing.map((row) => ({
					sectionId: row.sectionId,
					subjectId: row.subjectId,
					start: new Date(row.startsAt).getTime(),
					end: new Date(row.endsAt).getTime(),
					room: row.room,
					invigilatorId: row.invigilatorUserId
				})),
				{
					sectionId: input.sectionId,
					subjectId: input.subjectId,
					start,
					end,
					room: input.room,
					invigilatorId: input.invigilatorUserId
				}
			],
			{
				start: Date.parse(`${session.startDate}T00:00:00Z`),
				end: Date.parse(`${session.endDate}T23:59:59Z`)
			}
		);
		if (issues.length > 0) throw new AuthError(issues[0]);
		await tx.insert(examSchedules).values({
			schoolId,
			examId: input.examId,
			subjectId: input.subjectId,
			sectionId: input.sectionId,
			startsAt: new Date(input.startsAt),
			endsAt: new Date(input.endsAt),
			room: input.room,
			invigilatorUserId: input.invigilatorUserId,
			seatingPlan: input.seatingPlan
		});
	});
}

export async function publishExamSchedule(
	db: AppDb,
	userId: string,
	schoolId: string,
	examId: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['exams.manage']);
		const [exam] = await tx
			.select()
			.from(exams)
			.where(and(eq(exams.id, examId), eq(exams.schoolId, schoolId)));
		if (!exam) throw new AuthError('Exam not found.');
		assertStatusTransition('exam', exam.status, 'scheduled');
		const slots = await tx.select().from(examSchedules).where(eq(examSchedules.examId, examId));
		if (slots.length === 0) throw new AuthError('Add at least one exam slot before publication.');
		await tx.update(exams).set({ status: 'scheduled' }).where(eq(exams.id, examId));
		const guardians = await tx
			.select()
			.from(guardianStudents)
			.innerJoin(
				studentEnrollments,
				and(
					eq(studentEnrollments.studentId, guardianStudents.studentId),
					eq(studentEnrollments.schoolId, schoolId)
				)
			)
			.where(eq(guardianStudents.schoolId, schoolId));
		const sectionIds = new Set(slots.map((slot) => slot.sectionId));
		for (const row of guardians) {
			if (!sectionIds.has(row.student_enrollments.sectionId)) continue;
			await notify(
				tx,
				schoolId,
				row.guardian_students.guardianUserId,
				'exam',
				'Exam timetable published',
				exam.name
			);
		}
		for (const slot of slots) {
			if (slot.invigilatorUserId) {
				await notify(tx, schoolId, slot.invigilatorUserId, 'exam', 'Exam duty assigned', exam.name);
			}
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'exams.schedule.publish',
			entityType: 'exam',
			entityId: examId
		});
	});
}

export async function cancelExam(db: AppDb, userId: string, schoolId: string, examId: string) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['exams.manage']);
		const [exam] = await tx.select().from(exams).where(eq(exams.id, examId));
		if (!exam) throw new AuthError('Exam not found.');
		assertStatusTransition('exam', exam.status, 'cancelled');
		await tx.update(exams).set({ status: 'cancelled' }).where(eq(exams.id, examId));
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'exams.cancel',
			entityType: 'exam',
			entityId: examId,
			metadata: { notice: `${exam.name} was cancelled.` }
		});
	});
}

function scoredParts(input: {
	theoryObtained: number | null;
	theoryMax: number | null;
	practicalObtained: number | null;
	practicalMax: number | null;
	internalObtained: number | null;
	internalMax: number | null;
	marksObtained: number | null;
	maxMarks: number | null;
}) {
	const parts = [
		input.theoryMax != null ? { obtained: input.theoryObtained ?? 0, max: input.theoryMax } : null,
		input.practicalMax != null
			? { obtained: input.practicalObtained ?? 0, max: input.practicalMax }
			: null,
		input.internalMax != null
			? { obtained: input.internalObtained ?? 0, max: input.internalMax }
			: null
	].filter((part): part is { obtained: number; max: number } => part !== null);
	if (parts.length > 0) return componentTotal(parts);
	if (input.marksObtained == null || input.maxMarks == null)
		throw new AuthError('Enter marks and a maximum.');
	return componentTotal([{ obtained: input.marksObtained, max: input.maxMarks }]);
}

export async function saveMark(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		examId: string;
		studentId: string;
		subjectId: string;
		outcome: MarkOutcome;
		marksObtained: number | null;
		maxMarks: number | null;
		theoryObtained: number | null;
		theoryMax: number | null;
		practicalObtained: number | null;
		practicalMax: number | null;
		internalObtained: number | null;
		internalMax: number | null;
		remark: string | null;
	}
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		const readable = await tx.execute(
			sql`select app.can_read_student(${schoolId}::uuid, ${input.studentId}::uuid) as ok`
		);
		if (rowsOf(readable)[0]?.ok !== true) throw new AuthError('permission denied');
		const publisher = await tx.execute(
			sql`select app.has_permission(${schoolId}::uuid, 'results.publish') as ok`
		);
		const canPublish = rowsOf(publisher)[0]?.ok === true;
		if (!canPublish) await allow(tx, schoolId, ['marks.submit']);
		const [exam] = await tx.select().from(exams).where(eq(exams.id, input.examId));
		if (!exam || exam.status === 'cancelled' || exam.status === 'completed') {
			throw new AuthError('Marks are closed for this exam.');
		}
		const assignment = await tx
			.select()
			.from(teacherAssignments)
			.innerJoin(
				studentEnrollments,
				and(
					eq(studentEnrollments.sectionId, teacherAssignments.sectionId),
					eq(studentEnrollments.sessionId, teacherAssignments.sessionId),
					eq(studentEnrollments.studentId, input.studentId)
				)
			)
			.where(
				and(
					eq(teacherAssignments.schoolId, schoolId),
					eq(teacherAssignments.subjectId, input.subjectId),
					eq(teacherAssignments.teacherUserId, userId)
				)
			);
		if (!canPublish && assignment.length === 0) throw new AuthError('permission denied');
		const [existing] = await tx
			.select()
			.from(marks)
			.where(
				and(
					eq(marks.examId, input.examId),
					eq(marks.studentId, input.studentId),
					eq(marks.subjectId, input.subjectId)
				)
			);
		if (existing && existing.workflow === 'approved' && !canPublish) {
			throw new AuthError('Approved marks can only be changed by reopening the result.');
		}
		const totals =
			input.outcome === 'scored'
				? scoredParts(input)
				: {
						obtained: null as number | null,
						max: input.maxMarks && input.maxMarks > 0 ? input.maxMarks : exam.maxMarks
					};
		if (!totals.max || totals.max <= 0) throw new AuthError('invalid denominator');
		const values = {
			schoolId,
			examId: input.examId,
			studentId: input.studentId,
			subjectId: input.subjectId,
			outcome: input.outcome,
			marksObtained: input.outcome === 'scored' ? totals.obtained : null,
			maxMarks: totals.max,
			theoryObtained: input.outcome === 'scored' ? input.theoryObtained : null,
			theoryMax: input.outcome === 'scored' ? input.theoryMax : null,
			practicalObtained: input.outcome === 'scored' ? input.practicalObtained : null,
			practicalMax: input.outcome === 'scored' ? input.practicalMax : null,
			internalObtained: input.outcome === 'scored' ? input.internalObtained : null,
			internalMax: input.outcome === 'scored' ? input.internalMax : null,
			remark: input.remark,
			workflow: existing?.workflow === 'reopened' ? 'reopened' : 'draft'
		};
		if (existing) {
			await tx.update(marks).set(values).where(eq(marks.id, existing.id));
		} else {
			await tx.insert(marks).values(values);
		}
	});
}

export async function submitMarks(
	db: AppDb,
	userId: string,
	schoolId: string,
	examId: string,
	subjectId: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['marks.submit']);
		await tx
			.update(marks)
			.set({ workflow: 'submitted' })
			.where(
				and(
					eq(marks.schoolId, schoolId),
					eq(marks.examId, examId),
					eq(marks.subjectId, subjectId),
					eq(marks.workflow, 'draft')
				)
			);
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'marks.submit',
			entityType: 'exam',
			entityId: examId
		});
	});
}

export async function approveResults(db: AppDb, userId: string, schoolId: string, examId: string) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['results.publish']);
		const [settings] = await tx
			.select()
			.from(schoolSettings)
			.where(eq(schoolSettings.schoolId, schoolId));
		const bands = await tx.select().from(gradingRules).where(eq(gradingRules.schoolId, schoolId));
		await tx
			.update(marks)
			.set({ workflow: 'approved' })
			.where(and(eq(marks.examId, examId), eq(marks.workflow, 'submitted')));
		const rows = await tx
			.select()
			.from(marks)
			.where(and(eq(marks.examId, examId), eq(marks.workflow, 'approved')));
		const byStudent = new Map<string, typeof rows>();
		for (const row of rows) {
			byStudent.set(row.studentId, [...(byStudent.get(row.studentId) ?? []), row]);
		}
		for (const [studentId, studentMarks] of byStudent) {
			const summary = summarizeMarks(
				studentMarks.map((row) => ({
					outcome: row.outcome as MarkOutcome,
					marksObtained: row.marksObtained,
					maxMarks: row.maxMarks
				})),
				settings?.absentCountsAsZero ?? false,
				bands.map((band) => ({
					min: Number(band.minPercent),
					max: Number(band.maxPercent),
					grade: band.grade
				}))
			);
			const [existing] = await tx
				.select()
				.from(reportCards)
				.where(and(eq(reportCards.examId, examId), eq(reportCards.studentId, studentId)));
			if (!existing) {
				await tx.insert(reportCards).values({
					schoolId,
					examId,
					studentId,
					status: 'approved',
					totalMarks: summary.obtained,
					maxMarks: summary.max,
					percentage: summary.percentage == null ? null : String(summary.percentage),
					grade: summary.grade
				});
			}
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'results.approve',
			entityType: 'exam',
			entityId: examId
		});
	});
}

export async function publishReportCards(
	db: AppDb,
	userId: string,
	schoolId: string,
	examId: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['results.publish']);
		const [exam] = await tx.select().from(exams).where(eq(exams.id, examId));
		if (!exam) throw new AuthError('Exam not found.');
		if (exam.status === 'scheduled') {
			assertStatusTransition('exam', exam.status, 'published');
			await tx.update(exams).set({ status: 'published' }).where(eq(exams.id, examId));
		}
		const cards = await tx
			.select()
			.from(reportCards)
			.where(and(eq(reportCards.examId, examId), eq(reportCards.status, 'approved')));
		for (const card of cards) {
			assertStatusTransition('report_card', card.status, 'published');
			await tx
				.update(reportCards)
				.set({ status: 'published', publishedAt: new Date() })
				.where(eq(reportCards.id, card.id));
			const guardians = await tx
				.select()
				.from(guardianStudents)
				.where(
					and(
						eq(guardianStudents.schoolId, schoolId),
						eq(guardianStudents.studentId, card.studentId)
					)
				);
			for (const guardian of guardians) {
				await notify(
					tx,
					schoolId,
					guardian.guardianUserId,
					'results',
					'Report card published',
					exam.name
				);
			}
		}
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'results.publish',
			entityType: 'exam',
			entityId: examId
		});
	});
}

export async function reopenReportCard(
	db: AppDb,
	userId: string,
	schoolId: string,
	cardId: string,
	remarks: string
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['results.publish']);
		const [card] = await tx.select().from(reportCards).where(eq(reportCards.id, cardId));
		if (!card) throw new AuthError('Report card not found.');
		assertStatusTransition('report_card', card.status, 'revised');
		await tx
			.update(reportCards)
			.set({ status: 'revised', remarks, revision: card.revision + 1 })
			.where(eq(reportCards.id, cardId));
		await tx
			.update(marks)
			.set({ workflow: 'reopened' })
			.where(and(eq(marks.examId, card.examId), eq(marks.studentId, card.studentId)));
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'results.reopen',
			entityType: 'report_card',
			entityId: cardId,
			metadata: { remarks }
		});
	});
}

export async function reportCardPdf(
	db: AppDb,
	userId: string,
	schoolId: string,
	cardId: string,
	parentOnly: boolean
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const [card] = await tx.select().from(reportCards).where(eq(reportCards.id, cardId));
		if (!card) throw new AuthError('Report card not found.');
		if (parentOnly && card.status !== 'published') throw new AuthError('permission denied');
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		const [student] = await tx.select().from(students).where(eq(students.id, card.studentId));
		const [exam] = await tx.select().from(exams).where(eq(exams.id, card.examId));
		const rows = await tx
			.select()
			.from(marks)
			.innerJoin(subjects, eq(subjects.id, marks.subjectId))
			.where(and(eq(marks.examId, card.examId), eq(marks.studentId, card.studentId)));
		const lines = [
			school?.name ?? 'School',
			student ? `${student.firstName} ${student.lastName}` : 'Student',
			exam?.name ?? 'Exam',
			`Total ${card.totalMarks ?? 0} / ${card.maxMarks ?? 0}`,
			`Percentage ${card.percentage ?? 'not calculated'}`,
			`Grade ${card.grade ?? '-'}`,
			card.remarks ?? ''
		];
		for (const row of rows) {
			const value =
				row.marks.outcome === 'scored' ? String(row.marks.marksObtained) : row.marks.outcome;
			lines.push(`${row.subjects.name}: ${value}`);
		}
		return simplePdf(lines.filter(Boolean));
	});
}

export async function examBoard(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['exams.manage', 'results.publish', 'marks.submit']);
		return {
			exams: await tx.select().from(exams).where(eq(exams.schoolId, schoolId)),
			slots: await tx.select().from(examSchedules).where(eq(examSchedules.schoolId, schoolId)),
			sessions: await tx
				.select()
				.from(academicSessions)
				.where(eq(academicSessions.schoolId, schoolId)),
			sections: await tx.select().from(sections).where(eq(sections.schoolId, schoolId)),
			subjects: await tx.select().from(subjects).where(eq(subjects.schoolId, schoolId)),
			marks: await tx.select().from(marks).where(eq(marks.schoolId, schoolId)),
			cards: await tx.select().from(reportCards).where(eq(reportCards.schoolId, schoolId)),
			students: await tx.select().from(students).where(eq(students.schoolId, schoolId))
		};
	});
}
