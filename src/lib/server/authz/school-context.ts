import { z } from 'zod';
import { TenantAccessError } from './errors';

const schoolIdSchema = z.string().uuid();

export type SessionSchool = {
	userId: string;
	schoolId: string;
	membershipSchoolIds: readonly string[];
};

/**
 * The active school comes from the server session.
 * A client-supplied school id is accepted only when it is the same school.
 */
export function bindSchoolRequest(
	session: SessionSchool,
	requestedSchoolId: unknown
): { userId: string; schoolId: string } {
	if (!schoolIdSchema.safeParse(session.userId).success) {
		throw new TenantAccessError('invalid session user');
	}
	if (!schoolIdSchema.safeParse(session.schoolId).success) {
		throw new TenantAccessError('invalid session school');
	}
	if (!session.membershipSchoolIds.includes(session.schoolId)) {
		throw new TenantAccessError('cross-school access denied');
	}

	if (requestedSchoolId != null && requestedSchoolId !== '') {
		const parsed = schoolIdSchema.safeParse(requestedSchoolId);
		if (!parsed.success || parsed.data !== session.schoolId) {
			throw new TenantAccessError('cross-school access denied');
		}
	}

	return { userId: session.userId, schoolId: session.schoolId };
}
