# Architecture

This is one SvelteKit application on PostgreSQL. There is no service mesh and no separate worker process. Background work runs in the web process through `src/lib/server/jobs/run.ts`.

## Tenancy

One shared database and one shared set of tables. A school owns its rows through `school_id`. Platform records are users, schools, the role catalog, system settings, and sessions. School records are academic, financial, files, and operations. Memberships connect a user to a school and a school-scoped role. Guardian links connect a parent user to a student inside one school.

Details and the security rules are in [tenant-isolation.md](./tenant-isolation.md).

## Modules

| Area           | Path                                     | Responsibility                                                       |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Routes and UI  | `src/routes`                             | SvelteKit pages for platform, school, teacher, and parent portals.   |
| Request locals | `src/hooks.server.ts`                    | Loads the session cookie into `userId`, `schoolId`, and permissions. |
| School binding | `src/lib/server/authz/school-context.ts` | Accepts a client school id only when it equals the server session.   |
| Validation     | `src/lib/server/authz/school-context.ts` | UUID checks for the session and the requested school.                |
| Status rules   | `src/lib/server/domain/transitions.ts`   | Allowed status changes. The database enforces the same graph.        |
| Database       | `src/lib/server/db`                      | Drizzle schema, lazy client, tenant transactions.                    |
| Repositories   | `src/lib/server/repositories`            | School-scoped queries. They still depend on row-level security.      |
| Services       | `src/lib/server/services`                | Use a repository transaction and the status graph.                   |
| Files          | `src/lib/server/storage`                 | Object keys are `schools/{schoolId}/files/{fileId}`.                 |
| Jobs           | `src/lib/server/jobs/run.ts`             | Runs work in-process inside `withSchoolUser`.                        |
| Notifications  | `src/lib/server/notifications`           | Inserts a row for a user in the active school.                       |
| Audit          | `src/lib/server/audit/log.ts`            | Append-only events. Updates and deletes are denied.                  |

`getDb()` connects only when a request asks for data. `npm run build` does not need a live database. `GET /health` does.

## Database roles

| URL                      | Role                     | Used for             |
| ------------------------ | ------------------------ | -------------------- |
| `MIGRATION_DATABASE_URL` | Superuser or `BYPASSRLS` | `npm run db:migrate` |
| `DATABASE_URL`           | `erp_app`                | Application queries  |

`erp_app` is not a superuser and cannot bypass row-level security. `withSchoolUser` refuses to run when the connection is a superuser or has `BYPASSRLS`. `is_platform_admin` cannot be inserted or updated by `erp_app`.

Local cluster:

```sh
npm run db:up
MIGRATION_DATABASE_URL=postgres://postgres@127.0.0.1:54329/school_erp npm run db:migrate
```

The cluster files stay in `.local/pg`.

## Schema boundaries

Platform: `users`, `schools`, `permissions`, `roles`, `role_permissions`, `user_sessions`, `system_settings`.

Membership: `school_memberships`, `invitations`. Platform roles cannot be stored as a school membership.

Academic: `academic_sessions`, `classes`, `sections`, `subjects`, `students`, `student_enrollments`, `guardian_students`, `teacher_assignments`.

Timetable: `timetable_periods`, `timetables`, `timetable_entries`. Examination dates live in `exam_schedules`.

Assessment: `grading_rules`, `exams`, `marks`, `report_cards`, `attendance_records`, `leave_applications`.

Finance: `fee_structures`, `fee_concessions`, `invoices`, `invoice_lines`, `payments`, `refunds`, `payment_events`, `school_holidays`. Amounts are integer paise. An invoice stores the late-fee policy that applied when it was issued.

Learning: `courses`, `course_materials`, `assignments`, `assignment_submissions`.

Files and parent requests: `stored_files`, `complaints`, `complaint_attachments`, `document_requests`, `notifications`, `audit_events`.

Child rows that point at another school-owned row use a foreign key on `(parent_id, school_id)`, so a student id from school A cannot be enrolled in school B.

Soft delete columns exist on users, schools, students, memberships, and files. Schools, users, students, invoices, payments, and marks cannot be hard-deleted by `erp_app`. Status changes for workflow tables go through `app.enforce_status_transition`.

## Runtime connection

`getDb()` uses a postgres.js pool with `max: 10`. That number is a configuration limit, not a measured request capacity.

## What is not connected

Email, SMS, web push, and WhatsApp are not sent. Cashfree checkout is not opened in the browser. A signed webhook can settle a pending Cashfree payment when `CASHFREE_SECRET_KEY` is set. Uploads are private files on local disk (`FILE_STORAGE_PATH` or `.local/uploads`), not a remote object store. There is no malware scanner.

Operational notes are in [deployment.md](./deployment.md), [backup-and-recovery.md](./backup-and-recovery.md), and [known-issues.md](./known-issues.md).
