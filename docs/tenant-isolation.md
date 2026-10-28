# Tenant isolation

A browser request cannot choose another school by changing `school_id`. Isolation is enforced in PostgreSQL and again in the server transaction. Filtering in a Svelte page is not the control.

## How a request is bound

1. The server session will carry `userId` and `schoolId` after login. Today `src/hooks.server.ts` sets both to null.
2. `bindSchoolRequest` compares any client-supplied school id with the session school. A different id throws `TenantAccessError`. A school that is not in the user's membership list is also rejected.
3. `withSchoolUser` opens a transaction and runs `set_config('app.user_id', ..., true)`. The third argument makes the setting local to that transaction, so a pooled connection cannot keep the previous tenant.
4. The same transaction calls `app.can_access_school`. If the user has no active membership, the callback never runs.
5. Queries still add `school_id` in the `WHERE` clause. Row-level security applies even if that filter is forgotten.

`withPlatformAdmin` is the only path that can see every school. It requires `users.is_platform_admin`. The `erp_app` role is not allowed to set that column.

## Row-level security

Every application table has `ENABLE` and `FORCE ROW LEVEL SECURITY`. Policies are granted to `erp_app` only. A superuser still bypasses them, which is why migrations and the app must not share a role. `assertAppRole` checks `rolsuper` and `rolbypassrls` before a tenant transaction.

Policies call `SECURITY DEFINER` functions in the `app` schema. Those functions read memberships as the table owner, which avoids recursive policy checks. `search_path` is fixed to `pg_catalog, public`.

| Question                                                  | Rule                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| Can this user see this school?                            | Active membership, or platform admin                       |
| Can this user change structure, students, fees, or exams? | Permission on that school, from `role_permissions`         |
| Can a parent see a student, marks, or invoice?            | Guardian link for that student, not merely the same school |
| Can a teacher see students and marks?                     | `school.teaching.write` on that school only                |
| Can anyone read a file?                                   | Same school, and the uploader or school staff              |
| Can anyone read another user's session?                   | Only that user, or a platform admin                        |
| Can audit rows be edited?                                 | No. Insert only, and the actor must be the current user    |

Changing `app.school_id` does not grant rows. Policies use the user id and memberships, not the school setting. An update that sets `students.school_id` to another school fails the `WITH CHECK` policy.

## Roles

| Role            | Scope                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| `super_admin`   | Platform catalog only. School access comes from `is_platform_admin`, not from a membership. |
| `school_admin`  | All school permissions, including members and settings.                                     |
| `manager_admin` | School operations except members and settings.                                              |
| `teacher`       | Attendance, marks, coursework, complaints, files, leave, reports.                           |
| `parent`        | Own children, complaints, document requests, files they uploaded, leave requests.           |

A trigger rejects a membership or invitation that uses a platform-scoped role.

## Tests

`src/lib/server/db/tenant-isolation.spec.ts` runs against PostgreSQL as `erp_app`. It covers:

- No tenant user on the connection returns no students.
- Setting `app.school_id` to another school still returns no rows.
- Parent, teacher, and school admin are denied `withSchoolUser` for a school they do not belong to.
- A parent sees their child, that child's marks and invoice, and not a classmate or another school.
- A teacher sees their school and not the other school's exams or assignments.
- Files from another school, and another parent's file, are denied.
- Inserting or moving a student into another school is denied.
- A platform admin can read both schools. A school admin cannot create a school.
- `erp_app` cannot set `is_platform_admin`.
- A parent cannot insert an invoice, read the audit log, notify another user, or decide leave.
- A composite foreign key rejects an enrollment that mixes schools.
- Database status transitions match `statusTransitions`, including a rejected leave reversal.

Unit tests cover `bindSchoolRequest` and storage keys without a database. Start the local cluster with `npm run db:up` before `npm test`.
