import { and, desc, eq } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import {
	academicSessions,
	attendanceRecords,
	classes,
	complaints,
	courseMaterials,
	courses,
	documentRequests,
	exams,
	guardianStudents,
	invoices,
	payments,
	reportCards,
	schoolNotices,
	sections,
	sessionTimetableFiles,
	studentEnrollments,
	students,
	subjects,
	timetableEntries,
	timetablePeriods,
	timetables
} from '../db/schema';
import { withSchoolUser, type AppDb, type TenantTx } from '../db/tenant';
import { linkedStudent } from './access';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function rupees(paise: number) {
	return Math.round(paise) / 100;
}

async function desk(tx: TenantTx, schoolId: string, userId: string, studentId: string | null) {
	const links = await tx
		.select()
		.from(guardianStudents)
		.where(and(eq(guardianStudents.schoolId, schoolId), eq(guardianStudents.guardianUserId, userId)));
	const rows = await tx.select().from(students).where(eq(students.schoolId, schoolId));
	const children = rows
		.filter((child) => links.some((link) => link.studentId === child.id))
		.map((child) => ({
			id: child.id,
			firstName: child.firstName,
			lastName: child.lastName,
			admissionNo: child.admissionNo,
			dateOfBirth: child.dateOfBirth
		}));
	const selected = studentId ? children.find((child) => child.id === studentId) : children[0];
	if (studentId && !selected) throw new AuthError('permission denied');
	if (!selected) return { children, selected: null, placement: null };
	await linkedStudent(tx, schoolId, userId, selected.id);
	const [place] = await tx
		.select({
			sectionId: sections.id,
			sectionName: sections.name,
			classId: classes.id,
			className: classes.name,
			sessionId: academicSessions.id,
			sessionName: academicSessions.name,
			rollNumber: studentEnrollments.rollNumber
		})
		.from(studentEnrollments)
		.innerJoin(
			sections,
			and(
				eq(sections.id, studentEnrollments.sectionId),
				eq(sections.schoolId, studentEnrollments.schoolId)
			)
		)
		.innerJoin(
			classes,
			and(eq(classes.id, sections.classId), eq(classes.schoolId, sections.schoolId))
		)
		.innerJoin(
			academicSessions,
			and(
				eq(academicSessions.id, classes.sessionId),
				eq(academicSessions.schoolId, classes.schoolId)
			)
		)
		.where(
			and(eq(studentEnrollments.studentId, selected.id), eq(studentEnrollments.status, 'active'))
		)
		.limit(1);
	return {
		children,
		selected,
				placement: place
			? {
					sectionId: place.sectionId,
					sectionName: place.sectionName,
					classId: place.classId,
					className: place.className,
					sessionId: place.sessionId,
					sessionName: place.sessionName,
					rollNumber: place.rollNumber
				}
			: null
	};
}

function istWeekday() {
	const ist = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
	return ist.getUTCDay();
}

export async function studentHome(db: AppDb, userId: string, schoolId: string, studentId: string | null) {
	return withSchoolUser(db, userId, schoolId, (tx) => desk(tx, schoolId, userId, studentId));
}

export async function studentAttendance(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.selected) return { ...base, rows: [] };
		const rows = await tx
			.select({
				id: attendanceRecords.id,
				date: attendanceRecords.attendanceDate,
				status: attendanceRecords.status
			})
			.from(attendanceRecords)
			.where(eq(attendanceRecords.studentId, base.selected.id))
			.orderBy(desc(attendanceRecords.attendanceDate));
		return { ...base, rows };
	});
}

export async function studentSchedule(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	const weekday = istWeekday();
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.placement) return { ...base, weekday, dayName: days[weekday], periods: [], week: [], files: [] };
		const periods = await tx
			.select({
				id: timetableEntries.id,
				subject: subjects.name,
				start: timetablePeriods.startTime,
				end: timetablePeriods.endTime,
				period: timetablePeriods.name,
				weekday: timetableEntries.weekday
			})
			.from(timetableEntries)
			.innerJoin(
				timetables,
				and(
					eq(timetables.id, timetableEntries.timetableId),
					eq(timetables.schoolId, timetableEntries.schoolId)
				)
			)
			.innerJoin(
				subjects,
				and(eq(subjects.id, timetableEntries.subjectId), eq(subjects.schoolId, timetableEntries.schoolId))
			)
			.innerJoin(
				timetablePeriods,
				and(
					eq(timetablePeriods.id, timetableEntries.periodId),
					eq(timetablePeriods.schoolId, timetableEntries.schoolId)
				)
			)
			.where(
				and(
					eq(timetables.sectionId, base.placement.sectionId),
					eq(timetables.status, 'published')
				)
			)
			.orderBy(timetableEntries.weekday, timetablePeriods.sortOrder);
		const files = await tx
			.select({ fileId: sessionTimetableFiles.fileId })
			.from(sessionTimetableFiles)
			.where(
				and(
					eq(sessionTimetableFiles.schoolId, schoolId),
					eq(sessionTimetableFiles.classId, base.placement.classId)
				)
			)
			.orderBy(desc(sessionTimetableFiles.createdAt));
		return {
			...base,
			weekday,
			dayName: days[weekday],
			periods: periods.filter((row) => row.weekday === weekday),
			week: periods,
			files
		};
	});
}

async function classFiles(tx: TenantTx, schoolId: string, sectionId: string) {
	return tx
		.select({
			id: courseMaterials.id,
			title: courseMaterials.title,
			kind: courseMaterials.kind,
			fileId: courseMaterials.fileId,
			course: courses.title
		})
		.from(courseMaterials)
		.innerJoin(
			courses,
			and(eq(courses.id, courseMaterials.courseId), eq(courses.schoolId, courseMaterials.schoolId))
		)
		.where(and(eq(courses.schoolId, schoolId), eq(courses.sectionId, sectionId), eq(courses.status, 'published')))
		.orderBy(desc(courseMaterials.createdAt));
}

export async function studentCourses(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.placement) return { ...base, items: [] };
		const items = (await classFiles(tx, schoolId, base.placement.sectionId)).filter(
			(item) => item.kind !== 'note'
		);
		return { ...base, items };
	});
}

export async function studentNotes(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.placement) return { ...base, items: [] };
		const items = (await classFiles(tx, schoolId, base.placement.sectionId)).filter(
			(item) => item.kind === 'note'
		);
		return { ...base, items };
	});
}

export async function studentResults(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.selected) return { ...base, cards: [] };
		const cards = await tx
			.select({
				id: reportCards.id,
				grade: reportCards.grade,
				percentage: reportCards.percentage,
				totalMarks: reportCards.totalMarks,
				maxMarks: reportCards.maxMarks,
				remarks: reportCards.remarks,
				exam: exams.name
			})
			.from(reportCards)
			.leftJoin(
				exams,
				and(eq(exams.id, reportCards.examId), eq(exams.schoolId, reportCards.schoolId))
			)
			.where(and(eq(reportCards.studentId, base.selected.id), eq(reportCards.status, 'published')));
		return { ...base, cards };
	});
}

export async function studentFees(db: AppDb, userId: string, schoolId: string, studentId: string | null) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.selected) return { ...base, invoices: [], payments: [] };
		const invoiceRows = await tx
			.select()
			.from(invoices)
			.where(and(eq(invoices.studentId, base.selected.id), eq(invoices.schoolId, schoolId)));
		const paymentRows = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.studentId, base.selected.id), eq(payments.schoolId, schoolId)));
		return {
			...base,
			invoices: invoiceRows
				.filter((invoice) => invoice.status !== 'draft')
				.map((invoice) => {
					const balancePaise =
						invoice.amountPaise -
						invoice.concessionPaise +
						invoice.lateFeePaise -
						invoice.waiverPaise -
						invoice.amountPaidPaise;
					return {
						id: invoice.id,
						label: invoice.periodLabel,
						status: invoice.status,
						dueOn: invoice.dueOn,
						amount: rupees(invoice.amountPaise),
						paid: rupees(invoice.amountPaidPaise),
						balance: rupees(balancePaise)
					};
				}),
			payments: paymentRows.map((payment) => ({
				id: payment.id,
				status: payment.status,
				amount: rupees(payment.amountPaise)
			}))
		};
	});
}

export async function studentComplaints(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		const rows = await tx
			.select({
				id: complaints.id,
				subject: complaints.subject,
				status: complaints.status,
				resolutionNote: complaints.resolutionNote
			})
			.from(complaints)
			.where(and(eq(complaints.schoolId, schoolId), eq(complaints.raisedBy, userId)))
			.orderBy(desc(complaints.createdAt));
		return { ...base, complaints: rows };
	});
}

export async function studentDocuments(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		if (!base.selected) return { ...base, documents: [] };
		const documents = await tx
			.select({
				id: documentRequests.id,
				docType: documentRequests.docType,
				status: documentRequests.status,
				reviewNote: documentRequests.reviewNote
			})
			.from(documentRequests)
			.where(eq(documentRequests.studentId, base.selected.id))
			.orderBy(desc(documentRequests.createdAt));
		return { ...base, documents };
	});
}

export async function studentNotices(
	db: AppDb,
	userId: string,
	schoolId: string,
	studentId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const base = await desk(tx, schoolId, userId, studentId);
		const notices = await tx
			.select({
				id: schoolNotices.id,
				title: schoolNotices.title,
				body: schoolNotices.body,
				createdAt: schoolNotices.createdAt
			})
			.from(schoolNotices)
			.where(eq(schoolNotices.schoolId, schoolId))
			.orderBy(desc(schoolNotices.createdAt))
			.limit(30);
		return { ...base, notices };
	});
}
