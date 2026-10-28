export const ASSIGNABLE_PERMISSIONS = [
	'users.manage',
	'roles.assign',
	'classes.manage',
	'timetables.manage',
	'exams.manage',
	'marks.submit',
	'results.publish',
	'attendance.mark',
	'fees.configure',
	'payments.record',
	'complaints.resolve',
	'documents.approve',
	'reports.export'
] as const;

export type AssignablePermission = (typeof ASSIGNABLE_PERMISSIONS)[number];

const assignable = new Set<string>(ASSIGNABLE_PERMISSIONS);

export function isAssignablePermission(key: string): key is AssignablePermission {
	return assignable.has(key);
}

export function hasPermission(permissions: readonly string[], key: string) {
	return permissions.includes(key);
}
