CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint
DO $role$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') THEN
		RAISE EXCEPTION 'Create role erp_app (NOSUPERUSER NOBYPASSRLS) before migrating. See scripts/dev-db.sh';
	END IF;
	IF EXISTS (
		SELECT 1 FROM pg_roles
		WHERE rolname = 'erp_app' AND (rolsuper OR rolbypassrls)
	) THEN
		RAISE EXCEPTION 'erp_app must not be superuser and must not bypass row level security';
	END IF;
END
$role$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $fn$
	SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT EXISTS (
		SELECT 1
		FROM public.users
		WHERE id = app.current_user_id()
			AND is_platform_admin
			AND deleted_at IS NULL
			AND status = 'active'
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.can_access_school(p_school uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT p_school IS NOT NULL AND (
		app.is_platform_admin()
		OR EXISTS (
			SELECT 1
			FROM public.school_memberships m
			WHERE m.school_id = p_school
				AND m.user_id = app.current_user_id()
				AND m.status = 'active'
				AND m.deleted_at IS NULL
		)
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.has_permission(p_school uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT app.can_access_school(p_school) AND (
		app.is_platform_admin()
		OR EXISTS (
			SELECT 1
			FROM public.school_memberships m
			JOIN public.role_permissions rp ON rp.role_id = m.role_id
			WHERE m.school_id = p_school
				AND m.user_id = app.current_user_id()
				AND m.status = 'active'
				AND m.deleted_at IS NULL
				AND rp.permission_key = p_key
		)
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.has_any_permission(p_school uuid, p_keys text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT app.can_access_school(p_school) AND (
		app.is_platform_admin()
		OR EXISTS (
			SELECT 1
			FROM public.school_memberships m
			JOIN public.role_permissions rp ON rp.role_id = m.role_id
			WHERE m.school_id = p_school
				AND m.user_id = app.current_user_id()
				AND m.status = 'active'
				AND m.deleted_at IS NULL
				AND rp.permission_key = ANY (p_keys)
		)
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.has_permission_somewhere(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT app.is_platform_admin() OR EXISTS (
		SELECT 1
		FROM public.school_memberships m
		JOIN public.role_permissions rp ON rp.role_id = m.role_id
		WHERE m.user_id = app.current_user_id()
			AND m.status = 'active'
			AND m.deleted_at IS NULL
			AND rp.permission_key = p_key
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.shares_school(p_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT app.is_platform_admin()
		OR p_other = app.current_user_id()
		OR EXISTS (
			SELECT 1
			FROM public.school_memberships mine
			JOIN public.school_memberships theirs ON theirs.school_id = mine.school_id
			WHERE mine.user_id = app.current_user_id()
				AND theirs.user_id = p_other
				AND mine.status = 'active'
				AND theirs.status = 'active'
				AND mine.deleted_at IS NULL
				AND theirs.deleted_at IS NULL
		);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.can_read_student(p_school uuid, p_student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT app.has_permission(p_school, 'school.records.manage')
		OR app.has_permission(p_school, 'school.teaching.write')
		OR (
			app.can_access_school(p_school)
			AND EXISTS (
				SELECT 1
				FROM public.guardian_students g
				WHERE g.school_id = p_school
					AND g.student_id = p_student
					AND g.guardian_user_id = app.current_user_id()
			)
		);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.status_can_transition(p_domain text, p_from text, p_to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
	SELECT (p_domain, p_from, p_to) IN (
		('user', 'active', 'disabled'),
		('user', 'disabled', 'active'),
		('school', 'active', 'suspended'),
		('school', 'active', 'archived'),
		('school', 'suspended', 'active'),
		('school', 'suspended', 'archived'),
		('membership', 'invited', 'active'),
		('membership', 'invited', 'suspended'),
		('membership', 'active', 'suspended'),
		('membership', 'suspended', 'active'),
		('invitation', 'pending', 'accepted'),
		('invitation', 'pending', 'revoked'),
		('invitation', 'pending', 'expired'),
		('academic_session', 'planned', 'active'),
		('academic_session', 'planned', 'closed'),
		('academic_session', 'active', 'closed'),
		('student', 'active', 'withdrawn'),
		('student', 'active', 'alumni'),
		('student', 'withdrawn', 'active'),
		('student', 'withdrawn', 'alumni'),
		('enrollment', 'active', 'completed'),
		('enrollment', 'active', 'withdrawn'),
		('enrollment', 'withdrawn', 'active'),
		('exam', 'draft', 'scheduled'),
		('exam', 'draft', 'cancelled'),
		('exam', 'scheduled', 'published'),
		('exam', 'scheduled', 'cancelled'),
		('exam', 'published', 'cancelled'),
		('report_card', 'draft', 'published'),
		('leave', 'pending', 'approved'),
		('leave', 'pending', 'rejected'),
		('leave', 'pending', 'cancelled'),
		('invoice', 'draft', 'issued'),
		('invoice', 'draft', 'void'),
		('invoice', 'issued', 'partially_paid'),
		('invoice', 'issued', 'paid'),
		('invoice', 'issued', 'void'),
		('invoice', 'partially_paid', 'paid'),
		('invoice', 'partially_paid', 'void'),
		('payment', 'pending', 'succeeded'),
		('payment', 'pending', 'failed'),
		('complaint', 'open', 'in_review'),
		('complaint', 'open', 'closed'),
		('complaint', 'in_review', 'resolved'),
		('complaint', 'in_review', 'closed'),
		('complaint', 'resolved', 'closed'),
		('document_request', 'pending', 'ready'),
		('document_request', 'pending', 'rejected'),
		('document_request', 'ready', 'collected'),
		('course', 'draft', 'published'),
		('course', 'draft', 'archived'),
		('course', 'published', 'archived')
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
	IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
		RETURN NEW;
	END IF;
	IF NOT app.status_can_transition(TG_ARGV[0], OLD.status, NEW.status) THEN
		RAISE EXCEPTION 'invalid % status transition: % -> %', TG_ARGV[0], OLD.status, NEW.status
			USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.reject_platform_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	role_scope text;
BEGIN
	SELECT scope INTO role_scope FROM public.roles WHERE id = NEW.role_id;
	IF role_scope IS DISTINCT FROM 'school' THEN
		RAISE EXCEPTION 'platform roles cannot be assigned inside a school'
			USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
INSERT INTO permissions (key, description) VALUES
	('school.members.manage', 'Invite users and assign school roles'),
	('school.settings.manage', 'Update school profile and settings'),
	('school.records.manage', 'Manage academic structure, students, and report cards'),
	('school.teaching.write', 'Record attendance and marks'),
	('school.learning.participate', 'Submit coursework'),
	('school.complaints.create', 'Raise a complaint'),
	('school.complaints.manage', 'Review complaints'),
	('school.documents.create', 'Request a student document'),
	('school.documents.manage', 'Fulfill document requests'),
	('school.fees.manage', 'Manage fee structures, invoices, and payments'),
	('school.files.write', 'Upload a file into the active school'),
	('school.leave.create', 'Apply for student leave'),
	('school.reports.read', 'Read school reports')
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
INSERT INTO roles (key, scope, description) VALUES
	('super_admin', 'platform', 'Platform operator'),
	('school_admin', 'school', 'School administrator'),
	('manager_admin', 'school', 'School operations manager'),
	('teacher', 'school', 'Teacher'),
	('parent', 'school', 'Parent or guardian')
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON true
WHERE r.key IN ('super_admin', 'school_admin')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON true
WHERE r.key = 'manager_admin'
	AND p.key NOT IN ('school.members.manage', 'school.settings.manage')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
	'school.teaching.write',
	'school.learning.participate',
	'school.complaints.create',
	'school.files.write',
	'school.leave.create',
	'school.reports.read'
)
WHERE r.key = 'teacher'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
	'school.learning.participate',
	'school.complaints.create',
	'school.documents.create',
	'school.files.write',
	'school.leave.create',
	'school.reports.read'
)
WHERE r.key = 'parent'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE app.define_school_policy(p_table text, p_select text, p_mutate text)
LANGUAGE plpgsql
AS $fn$
BEGIN
	EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
	EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);
	EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_select', p_table);
	EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO erp_app USING (%s)', p_table || '_select', p_table, p_select);
	EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_insert', p_table);
	EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO erp_app WITH CHECK (%s)', p_table || '_insert', p_table, p_mutate);
	EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_update', p_table);
	EXECUTE format(
		'CREATE POLICY %I ON %I FOR UPDATE TO erp_app USING (%s) WITH CHECK (%s)',
		p_table || '_update', p_table, p_mutate, p_mutate
	);
	EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_delete', p_table);
	EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO erp_app USING (%s)', p_table || '_delete', p_table, p_mutate);
END
$fn$;
--> statement-breakpoint
CALL app.define_school_policy('academic_sessions', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('classes', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('sections', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('subjects', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('student_enrollments', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('teacher_assignments', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('timetable_periods', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('timetables', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('timetable_entries', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('grading_rules', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('exams', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('exam_schedules', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('fee_structures', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.fees.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('courses', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''school.teaching.write''])');
--> statement-breakpoint
CALL app.define_school_policy('course_materials', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''school.teaching.write''])');
--> statement-breakpoint
CALL app.define_school_policy('assignments', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''school.teaching.write''])');
--> statement-breakpoint
CALL app.define_school_policy('school_settings', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.settings.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('invitations', 'app.has_permission(school_id, ''school.members.manage'')', 'app.has_permission(school_id, ''school.members.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('students', 'app.can_read_student(school_id, id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('guardian_students', 'app.can_access_school(school_id) AND (guardian_user_id = app.current_user_id() OR app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''school.teaching.write'']))', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('marks', 'app.can_read_student(school_id, student_id)', 'app.has_any_permission(school_id, ARRAY[''school.teaching.write'', ''school.records.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('attendance_records', 'app.can_read_student(school_id, student_id)', 'app.has_any_permission(school_id, ARRAY[''school.teaching.write'', ''school.records.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('report_cards', 'app.can_read_student(school_id, student_id)', 'app.has_permission(school_id, ''school.records.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('fee_concessions', 'app.can_read_student(school_id, student_id) OR app.has_permission(school_id, ''school.fees.manage'')', 'app.has_permission(school_id, ''school.fees.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('invoices', 'app.can_read_student(school_id, student_id) OR app.has_permission(school_id, ''school.fees.manage'')', 'app.has_permission(school_id, ''school.fees.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('payments', 'app.can_read_student(school_id, student_id) OR app.has_permission(school_id, ''school.fees.manage'')', 'app.has_permission(school_id, ''school.fees.manage'')');
--> statement-breakpoint
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE document_requests FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY document_requests_select ON document_requests FOR SELECT TO erp_app
	USING (
		app.can_read_student(school_id, student_id)
		OR app.has_permission(school_id, 'school.documents.manage')
	);
--> statement-breakpoint
CREATE POLICY document_requests_insert ON document_requests FOR INSERT TO erp_app
	WITH CHECK (
		app.has_permission(school_id, 'school.documents.create')
		AND requested_by = app.current_user_id()
		AND app.can_read_student(school_id, student_id)
	);
--> statement-breakpoint
CREATE POLICY document_requests_update ON document_requests FOR UPDATE TO erp_app
	USING (app.has_permission(school_id, 'school.documents.manage'))
	WITH CHECK (app.has_permission(school_id, 'school.documents.manage'));
--> statement-breakpoint
CREATE POLICY document_requests_delete ON document_requests FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE stored_files ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE stored_files FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY stored_files_select ON stored_files FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			uploaded_by = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write'])
		)
	);
--> statement-breakpoint
CREATE POLICY stored_files_insert ON stored_files FOR INSERT TO erp_app
	WITH CHECK (
		app.can_access_school(school_id)
		AND uploaded_by = app.current_user_id()
		AND app.has_any_permission(school_id, ARRAY['school.files.write', 'school.records.manage', 'school.teaching.write'])
	);
--> statement-breakpoint
CREATE POLICY stored_files_update ON stored_files FOR UPDATE TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write']));
--> statement-breakpoint
CREATE POLICY stored_files_delete ON stored_files FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE complaints FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY complaints_select ON complaints FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			raised_by = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY['school.complaints.manage', 'school.records.manage'])
		)
	);
--> statement-breakpoint
CREATE POLICY complaints_insert ON complaints FOR INSERT TO erp_app
	WITH CHECK (
		app.can_access_school(school_id)
		AND raised_by = app.current_user_id()
		AND app.has_permission(school_id, 'school.complaints.create')
	);
--> statement-breakpoint
CREATE POLICY complaints_update ON complaints FOR UPDATE TO erp_app
	USING (app.has_permission(school_id, 'school.complaints.manage'))
	WITH CHECK (app.has_permission(school_id, 'school.complaints.manage'));
--> statement-breakpoint
CREATE POLICY complaints_delete ON complaints FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE complaint_attachments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE complaint_attachments FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY complaint_attachments_select ON complaint_attachments FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			app.has_any_permission(school_id, ARRAY['school.complaints.manage', 'school.records.manage'])
			OR EXISTS (
				SELECT 1 FROM complaints c
				WHERE c.id = complaint_id
					AND c.school_id = complaint_attachments.school_id
					AND c.raised_by = app.current_user_id()
			)
		)
	);
--> statement-breakpoint
CREATE POLICY complaint_attachments_insert ON complaint_attachments FOR INSERT TO erp_app
	WITH CHECK (
		app.can_access_school(school_id)
		AND app.has_permission(school_id, 'school.complaints.create')
		AND EXISTS (
			SELECT 1 FROM complaints c
			WHERE c.id = complaint_id
				AND c.school_id = complaint_attachments.school_id
				AND c.raised_by = app.current_user_id()
		)
	);
--> statement-breakpoint
CREATE POLICY complaint_attachments_update ON complaint_attachments FOR UPDATE TO erp_app
	USING (app.has_permission(school_id, 'school.complaints.manage'))
	WITH CHECK (app.has_permission(school_id, 'school.complaints.manage'));
--> statement-breakpoint
CREATE POLICY complaint_attachments_delete ON complaint_attachments FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE leave_applications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY leave_applications_select ON leave_applications FOR SELECT TO erp_app
	USING (app.can_read_student(school_id, student_id) OR app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
CREATE POLICY leave_applications_insert ON leave_applications FOR INSERT TO erp_app
	WITH CHECK (
		app.has_permission(school_id, 'school.leave.create')
		AND requested_by = app.current_user_id()
		AND app.can_read_student(school_id, student_id)
	);
--> statement-breakpoint
CREATE POLICY leave_applications_update ON leave_applications FOR UPDATE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'))
	WITH CHECK (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
CREATE POLICY leave_applications_delete ON leave_applications FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE assignment_submissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY assignment_submissions_select ON assignment_submissions FOR SELECT TO erp_app
	USING (
		app.can_read_student(school_id, student_id)
		OR app.has_permission(school_id, 'school.teaching.write')
	);
--> statement-breakpoint
CREATE POLICY assignment_submissions_insert ON assignment_submissions FOR INSERT TO erp_app
	WITH CHECK (
		app.has_permission(school_id, 'school.learning.participate')
		AND app.can_read_student(school_id, student_id)
	);
--> statement-breakpoint
CREATE POLICY assignment_submissions_update ON assignment_submissions FOR UPDATE TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.teaching.write', 'school.records.manage']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.teaching.write', 'school.records.manage']));
--> statement-breakpoint
CREATE POLICY assignment_submissions_delete ON assignment_submissions FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY notifications_select ON notifications FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			user_id = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write'])
		)
	);
--> statement-breakpoint
CREATE POLICY notifications_insert ON notifications FOR INSERT TO erp_app
	WITH CHECK (
		app.can_access_school(school_id)
		AND (
			user_id = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write'])
		)
	);
--> statement-breakpoint
CREATE POLICY notifications_update ON notifications FOR UPDATE TO erp_app
	USING (user_id = app.current_user_id() AND app.can_access_school(school_id))
	WITH CHECK (user_id = app.current_user_id() AND app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY notifications_delete ON notifications FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE school_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE school_memberships FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY school_memberships_select ON school_memberships FOR SELECT TO erp_app
	USING (
		user_id = app.current_user_id()
		OR app.has_any_permission(school_id, ARRAY['school.members.manage', 'school.records.manage', 'school.teaching.write'])
	);
--> statement-breakpoint
CREATE POLICY school_memberships_insert ON school_memberships FOR INSERT TO erp_app
	WITH CHECK (app.has_permission(school_id, 'school.members.manage'));
--> statement-breakpoint
CREATE POLICY school_memberships_update ON school_memberships FOR UPDATE TO erp_app
	USING (app.has_permission(school_id, 'school.members.manage'))
	WITH CHECK (app.has_permission(school_id, 'school.members.manage'));
--> statement-breakpoint
CREATE POLICY school_memberships_delete ON school_memberships FOR DELETE TO erp_app
	USING (app.has_permission(school_id, 'school.members.manage'));
--> statement-breakpoint
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_events_select ON audit_events FOR SELECT TO erp_app
	USING (
		app.is_platform_admin()
		OR (school_id IS NOT NULL AND app.has_permission(school_id, 'school.records.manage'))
	);
--> statement-breakpoint
CREATE POLICY audit_events_insert ON audit_events FOR INSERT TO erp_app
	WITH CHECK (
		actor_user_id = app.current_user_id()
		AND (
			(school_id IS NOT NULL AND app.can_access_school(school_id))
			OR (school_id IS NULL AND app.is_platform_admin())
		)
	);
--> statement-breakpoint
CREATE POLICY audit_events_update ON audit_events FOR UPDATE TO erp_app USING (false);
--> statement-breakpoint
CREATE POLICY audit_events_delete ON audit_events FOR DELETE TO erp_app USING (false);
--> statement-breakpoint
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE users FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY users_select ON users FOR SELECT TO erp_app
	USING (id = app.current_user_id() OR app.is_platform_admin() OR app.shares_school(id));
--> statement-breakpoint
CREATE POLICY users_insert ON users FOR INSERT TO erp_app
	WITH CHECK (app.is_platform_admin() OR app.has_permission_somewhere('school.members.manage') OR id = app.current_user_id());
--> statement-breakpoint
CREATE POLICY users_update ON users FOR UPDATE TO erp_app
	USING (id = app.current_user_id() OR app.is_platform_admin())
	WITH CHECK (id = app.current_user_id() OR app.is_platform_admin());
--> statement-breakpoint
CREATE POLICY users_delete ON users FOR DELETE TO erp_app USING (app.is_platform_admin());
--> statement-breakpoint
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE schools FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY schools_select ON schools FOR SELECT TO erp_app
	USING (app.is_platform_admin() OR app.can_access_school(id));
--> statement-breakpoint
CREATE POLICY schools_insert ON schools FOR INSERT TO erp_app
	WITH CHECK (app.is_platform_admin());
--> statement-breakpoint
CREATE POLICY schools_update ON schools FOR UPDATE TO erp_app
	USING (app.is_platform_admin() OR app.has_permission(id, 'school.settings.manage'))
	WITH CHECK (app.is_platform_admin() OR app.has_permission(id, 'school.settings.manage'));
--> statement-breakpoint
CREATE POLICY schools_delete ON schools FOR DELETE TO erp_app USING (false);
--> statement-breakpoint
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_sessions_select ON user_sessions FOR SELECT TO erp_app
	USING (user_id = app.current_user_id() OR app.is_platform_admin());
--> statement-breakpoint
CREATE POLICY user_sessions_insert ON user_sessions FOR INSERT TO erp_app
	WITH CHECK (user_id = app.current_user_id() OR app.is_platform_admin());
--> statement-breakpoint
CREATE POLICY user_sessions_update ON user_sessions FOR UPDATE TO erp_app
	USING (user_id = app.current_user_id() OR app.is_platform_admin())
	WITH CHECK (user_id = app.current_user_id() OR app.is_platform_admin());
--> statement-breakpoint
CREATE POLICY user_sessions_delete ON user_sessions FOR DELETE TO erp_app
	USING (user_id = app.current_user_id() OR app.is_platform_admin());
--> statement-breakpoint
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE system_settings FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY system_settings_all ON system_settings FOR ALL TO erp_app
	USING (app.is_platform_admin())
	WITH CHECK (app.is_platform_admin());
--> statement-breakpoint
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY permissions_select ON permissions FOR SELECT TO erp_app USING (true);
--> statement-breakpoint
CREATE POLICY permissions_modify ON permissions FOR ALL TO erp_app USING (false) WITH CHECK (false);
--> statement-breakpoint
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY roles_select ON roles FOR SELECT TO erp_app USING (true);
--> statement-breakpoint
CREATE POLICY roles_modify ON roles FOR ALL TO erp_app USING (false) WITH CHECK (false);
--> statement-breakpoint
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT TO erp_app USING (true);
--> statement-breakpoint
CREATE POLICY role_permissions_modify ON role_permissions FOR ALL TO erp_app USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE TRIGGER school_memberships_role_scope
	BEFORE INSERT OR UPDATE ON school_memberships
	FOR EACH ROW EXECUTE FUNCTION app.reject_platform_role();
--> statement-breakpoint
CREATE TRIGGER invitations_role_scope
	BEFORE INSERT OR UPDATE ON invitations
	FOR EACH ROW EXECUTE FUNCTION app.reject_platform_role();
--> statement-breakpoint
CREATE TRIGGER users_status_transition
	BEFORE UPDATE OF status ON users
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('user');
--> statement-breakpoint
CREATE TRIGGER schools_status_transition
	BEFORE UPDATE OF status ON schools
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('school');
--> statement-breakpoint
CREATE TRIGGER school_memberships_status_transition
	BEFORE UPDATE OF status ON school_memberships
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('membership');
--> statement-breakpoint
CREATE TRIGGER invitations_status_transition
	BEFORE UPDATE OF status ON invitations
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('invitation');
--> statement-breakpoint
CREATE TRIGGER academic_sessions_status_transition
	BEFORE UPDATE OF status ON academic_sessions
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('academic_session');
--> statement-breakpoint
CREATE TRIGGER students_status_transition
	BEFORE UPDATE OF status ON students
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('student');
--> statement-breakpoint
CREATE TRIGGER student_enrollments_status_transition
	BEFORE UPDATE OF status ON student_enrollments
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('enrollment');
--> statement-breakpoint
CREATE TRIGGER exams_status_transition
	BEFORE UPDATE OF status ON exams
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('exam');
--> statement-breakpoint
CREATE TRIGGER report_cards_status_transition
	BEFORE UPDATE OF status ON report_cards
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('report_card');
--> statement-breakpoint
CREATE TRIGGER leave_applications_status_transition
	BEFORE UPDATE OF status ON leave_applications
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('leave');
--> statement-breakpoint
CREATE TRIGGER invoices_status_transition
	BEFORE UPDATE OF status ON invoices
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('invoice');
--> statement-breakpoint
CREATE TRIGGER payments_status_transition
	BEFORE UPDATE OF status ON payments
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('payment');
--> statement-breakpoint
CREATE TRIGGER complaints_status_transition
	BEFORE UPDATE OF status ON complaints
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('complaint');
--> statement-breakpoint
CREATE TRIGGER document_requests_status_transition
	BEFORE UPDATE OF status ON document_requests
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('document_request');
--> statement-breakpoint
CREATE TRIGGER courses_status_transition
	BEFORE UPDATE OF status ON courses
	FOR EACH ROW EXECUTE FUNCTION app.enforce_status_transition('course');
--> statement-breakpoint
DO $touch$
DECLARE
	table_name text;
BEGIN
	FOR table_name IN
		SELECT c.table_name
		FROM information_schema.columns c
		WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
	LOOP
		EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_touch_updated_at', table_name);
		EXECUTE format(
			'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at()',
			table_name || '_touch_updated_at',
			table_name
		);
	END LOOP;
END
$touch$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public, app TO erp_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_app;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON permissions, roles, role_permissions FROM erp_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON audit_events FROM erp_app;
--> statement-breakpoint
REVOKE DELETE ON schools, users, students, invoices, payments, marks FROM erp_app;
--> statement-breakpoint
REVOKE INSERT, UPDATE ON users FROM erp_app;
--> statement-breakpoint
GRANT INSERT (
	id, email, phone, password_hash, full_name, status, created_at, updated_at, deleted_at
) ON users TO erp_app;
--> statement-breakpoint
GRANT UPDATE (
	email, phone, password_hash, full_name, status, updated_at, deleted_at
) ON users TO erp_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION
	app.current_user_id(),
	app.is_platform_admin(),
	app.can_access_school(uuid),
	app.has_permission(uuid, text),
	app.has_any_permission(uuid, text[]),
	app.has_permission_somewhere(text),
	app.shares_school(uuid),
	app.can_read_student(uuid, uuid),
	app.status_can_transition(text, text, text)
FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION
	app.current_user_id(),
	app.is_platform_admin(),
	app.can_access_school(uuid),
	app.has_permission(uuid, text),
	app.has_any_permission(uuid, text[]),
	app.has_permission_somewhere(text),
	app.shares_school(uuid),
	app.can_read_student(uuid, uuid),
	app.status_can_transition(text, text, text)
TO erp_app;
--> statement-breakpoint
REVOKE ALL ON PROCEDURE app.define_school_policy(text, text, text) FROM PUBLIC;
--> statement-breakpoint
DROP PROCEDURE app.define_school_policy(text, text, text);
