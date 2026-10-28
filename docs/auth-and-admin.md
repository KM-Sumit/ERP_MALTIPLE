# Authentication and school administration

Passwords are hashed with bcrypt (`@node-rs/bcrypt`). The app does not store plaintext passwords or implement its own password cipher. Session tokens are random 32-byte values; only their SHA-256 hashes are stored. The browser cookie `erp_session` is `HttpOnly` and `SameSite=Lax`, lasts 12 hours, and is marked `Secure` outside local development.

There is no mail server in this deployment. Password-reset links are not returned by the forgot-password form. Invitation links are shown once to the administrator who created them so the invitation can be delivered manually. A reset token is available only to server-side tests through the reset service.

## Sign-in

`/setup` creates the first Super Admin and then refuses every later attempt. `/login` checks the password, then account status. Five failed attempts lock the account for 15 minutes. Disabled users and users who have not accepted an invitation cannot start a session. A suspended school does not block the password check; it is omitted from school selection, and existing school context is dropped, so members cannot open school data until the school is active again.

Privileged accounts (Super Admin, School Admin, Manager Admin) can turn on time-based one-time passwords from Account. The shared secret stays in `user_secrets`, which a school member cannot read for anyone else. A correct password then returns a short-lived challenge instead of a session. The challenge is single-use.

Logout revokes the server session. Changing a password or choosing “sign out every session” revokes all sessions for that user. Password reset does the same.

A person in more than one school chooses a school at `/select-school`. The choice is checked against an active membership in an active school. Membership in one school does not grant another.

## Permissions

School Admin keeps the school role permissions, including the module keys `users.manage`, `roles.assign`, `classes.manage`, `timetables.manage`, `exams.manage`, `marks.submit`, `results.publish`, `attendance.mark`, `fees.configure`, `payments.record`, `complaints.resolve`, `documents.approve`, and `reports.export`.

Manager Admin has no permissions from the role. A School Admin assigns module keys on that manager’s membership. `schools.create` cannot be granted. Teachers mark attendance and submit marks only for students enrolled in a section assigned to them. Parents see and act on verified linked children only.

Super Admin is `users.is_platform_admin`. That flag allows school creation, status changes, the first School Admin invitation, plan limits, and platform audit. It does not grant student, mark, or invoice rows. Database triggers reject a platform admin’s attempt to rename a school or change its branding; those updates belong to a School Admin of that school. A suspended school is reactivated from its platform page by typing the school code. Archived schools cannot return to active.

Row-level security remains enabled. Login, reset, invitation, and session lookups use `SECURITY DEFINER` functions because an anonymous request has no user context. Those functions do not provide a general user directory.

## Dashboards

`/admin` lists live school counts, creates a school (duplicate codes are rejected), opens a school, provisions the first School Admin, sets a plan and student limit, and records support status. `/school/setup` saves each onboarding step to the school’s own rows, so an unfinished school can be resumed. School profile, academics, staff, students, policies, notices, reports, and audit are separate pages. Navigation hides actions the account cannot perform, and the page load plus the form action both reject the request when the permission is missing.

Direct report export is `GET /school/reports/export`. It returns 401 without a session and 403 without `reports.export`.
