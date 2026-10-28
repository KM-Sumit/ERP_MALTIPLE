import { and, eq, isNull } from 'drizzle-orm';
import { TenantAccessError } from '../authz/errors';
import {
	exams,
	guardianStudents,
	invoices,
	marks,
	storedFiles,
	students,
	teacherAssignments
} from '../db/schema';
import type { TenantTx } from '../db/tenant';

export async function listStudents(tx: TenantTx, schoolId: string) {
	return tx
		.select()
		.from(students)
		.where(and(eq(students.schoolId, schoolId), isNull(students.deletedAt)));
}

export async function listInvoices(tx: TenantTx, schoolId: string) {
	return tx.select().from(invoices).where(eq(invoices.schoolId, schoolId));
}

export async function listExams(tx: TenantTx, schoolId: string) {
	return tx.select().from(exams).where(eq(exams.schoolId, schoolId));
}

export async function listMarks(tx: TenantTx, schoolId: string) {
	return tx.select().from(marks).where(eq(marks.schoolId, schoolId));
}

export async function listGuardianLinks(tx: TenantTx, schoolId: string) {
	return tx.select().from(guardianStudents).where(eq(guardianStudents.schoolId, schoolId));
}

export async function listTeacherAssignments(tx: TenantTx, schoolId: string) {
	return tx.select().from(teacherAssignments).where(eq(teacherAssignments.schoolId, schoolId));
}

export async function getStoredFile(tx: TenantTx, schoolId: string, fileId: string) {
	const rows = await tx
		.select()
		.from(storedFiles)
		.where(
			and(
				eq(storedFiles.id, fileId),
				eq(storedFiles.schoolId, schoolId),
				isNull(storedFiles.deletedAt)
			)
		);
	const row = rows[0];
	if (!row) throw new TenantAccessError('file is not available in this school');
	const prefix = `schools/${schoolId}/`;
	if (!row.storageKey.startsWith(prefix) || row.storageKey.includes('..')) {
		throw new TenantAccessError('file is not available in this school');
	}
	return row;
}
