import { describe, expect, it } from 'vitest';
import { TenantAccessError } from './errors';
import { bindSchoolRequest, type SessionSchool } from './school-context';

const schoolA = '11111111-1111-4111-8111-111111111111';
const schoolB = '22222222-2222-4222-8222-222222222222';
const userA = '33333333-3333-4333-8333-333333333333';

const session: SessionSchool = {
	userId: userA,
	schoolId: schoolA,
	membershipSchoolIds: [schoolA]
};

describe('bindSchoolRequest', () => {
	it('keeps the session school when the client omits school_id', () => {
		expect(bindSchoolRequest(session, undefined)).toEqual({ userId: userA, schoolId: schoolA });
	});

	it('accepts a client school id only when it matches the session', () => {
		expect(bindSchoolRequest(session, schoolA).schoolId).toBe(schoolA);
	});

	it('rejects a client school id for another school', () => {
		expect(() => bindSchoolRequest(session, schoolB)).toThrow(TenantAccessError);
	});

	it('rejects a session school the user does not belong to', () => {
		expect(() =>
			bindSchoolRequest({ ...session, membershipSchoolIds: [schoolB] }, undefined)
		).toThrow(TenantAccessError);
	});
});
