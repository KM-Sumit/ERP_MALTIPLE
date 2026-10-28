import { and, desc, eq } from 'drizzle-orm';
import { AuthError } from '../auth/service';
import { writeAudit } from '../audit/log';
import { simplePdf } from '../academics/pdf';
import { allow } from '../academics/access';
import {
	chapters,
	complaints,
	courseMaterials,
	courses,
	documentDownloads,
	documentRequests,
	notifications,
	schools
} from '../db/schema';
import { withSchoolUser, type AppDb } from '../db/tenant';
import { assertStatusTransition } from '../domain/transitions';

export async function updateComplaint(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { complaintId: string; status: string; assigneeUserId?: string | null; note?: string }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['complaints.resolve', 'school.complaints.manage']);
		const [current] = await tx
			.select()
			.from(complaints)
			.where(and(eq(complaints.id, input.complaintId), eq(complaints.schoolId, schoolId)));
		if (!current) throw new AuthError('Complaint not found.');
		assertStatusTransition('complaint', current.status, input.status);
		await tx
			.update(complaints)
			.set({
				status: input.status,
				assigneeUserId: input.assigneeUserId ?? current.assigneeUserId,
				resolutionNote: input.note ?? current.resolutionNote
			})
			.where(eq(complaints.id, current.id));
		await tx
			.insert(notifications)
			.values({
				schoolId,
				userId: current.raisedBy,
				title: 'Complaint updated',
				body: `${current.subject} is now ${input.status}.`,
				eventKey: `complaint:${current.id}:${input.status}`
			})
			.onConflictDoNothing();
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'complaints.update',
			entityType: 'complaint',
			entityId: current.id,
			metadata: { status: input.status }
		});
	});
}

export async function reviewDocument(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { requestId: string; status: 'ready' | 'rejected'; note: string }
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['documents.approve', 'school.documents.manage']);
		const [current] = await tx
			.select()
			.from(documentRequests)
			.where(eq(documentRequests.id, input.requestId));
		if (!current) throw new AuthError('Request not found.');
		assertStatusTransition('document_request', current.status, input.status);
		await tx
			.update(documentRequests)
			.set({ status: input.status, reviewNote: input.note.trim() })
			.where(eq(documentRequests.id, current.id));
		await writeAudit(tx, {
			schoolId,
			actorUserId: userId,
			action: 'documents.review',
			entityType: 'document_request',
			entityId: current.id,
			metadata: { status: input.status }
		});
		await tx
			.insert(notifications)
			.values({
				schoolId,
				userId: current.requestedBy,
				title: 'Document request updated',
				body: `${current.docType} is ${input.status}.`,
				eventKey: `document:${current.id}:${input.status}`
			})
			.onConflictDoNothing();
	});
}

export async function documentPdf(db: AppDb, userId: string, schoolId: string, requestId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const [request] = await tx
			.select()
			.from(documentRequests)
			.where(and(eq(documentRequests.id, requestId), eq(documentRequests.schoolId, schoolId)));
		if (!request || request.status !== 'ready') throw new AuthError('That document is not ready.');
		if (request.requestedBy !== userId) {
			await allow(tx, schoolId, ['documents.approve', 'school.documents.manage']);
		}
		const [school] = await tx.select().from(schools).where(eq(schools.id, schoolId));
		await tx.insert(documentDownloads).values({ schoolId, requestId, userId });
		return simplePdf([
			school?.name ?? 'School',
			request.docType,
			`Student ${request.studentId}`,
			request.reviewNote ?? '',
			'Issued by the school office'
		]);
	});
}

export async function publishMaterial(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: {
		courseId: string;
		title: string;
		kind: 'note' | 'pdf' | 'video' | 'link';
		externalUrl: string | null;
	}
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['school.teaching.write', 'classes.manage', 'school.records.manage']);
		if (
			(input.kind === 'video' || input.kind === 'link') &&
			!input.externalUrl?.startsWith('https://')
		) {
			throw new AuthError('External resources must use an https URL.');
		}
		await tx.insert(courseMaterials).values({
			schoolId,
			courseId: input.courseId,
			title: input.title.trim(),
			kind: input.kind,
			externalUrl: input.externalUrl
		});
	});
}

export async function addChapter(
	db: AppDb,
	userId: string,
	schoolId: string,
	courseId: string,
	title: string,
	sortOrder: number
) {
	await withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['classes.manage', 'school.teaching.write', 'school.records.manage']);
		await tx.insert(chapters).values({ schoolId, courseId, title: title.trim(), sortOrder });
	});
}

export async function listComplaints(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['complaints.resolve', 'school.complaints.manage']);
		return tx
			.select()
			.from(complaints)
			.where(eq(complaints.schoolId, schoolId))
			.orderBy(desc(complaints.createdAt))
			.limit(100);
	});
}

export async function listDocuments(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['documents.approve', 'school.documents.manage']);
		return tx
			.select()
			.from(documentRequests)
			.where(eq(documentRequests.schoolId, schoolId))
			.orderBy(desc(documentRequests.createdAt))
			.limit(100);
	});
}

export async function publishCourse(
	db: AppDb,
	userId: string,
	schoolId: string,
	input: { title: string; sectionId: string; subjectId: string }
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		await allow(tx, schoolId, ['classes.manage', 'school.teaching.write', 'school.records.manage']);
		const [course] = await tx
			.insert(courses)
			.values({
				schoolId,
				title: input.title.trim(),
				sectionId: input.sectionId,
				subjectId: input.subjectId,
				status: 'published'
			})
			.returning();
		return course;
	});
}
