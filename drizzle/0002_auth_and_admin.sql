ALTER TABLE users
	ADD COLUMN failed_login_count integer NOT NULL DEFAULT 0,
	ADD COLUMN locked_until timestamptz,
	ADD COLUMN email_verified_at timestamptz;
--> statement-breakpoint
ALTER TABLE users
	ADD CONSTRAINT users_failed_login_chk CHECK (failed_login_count >= 0);
--> statement-breakpoint
ALTER TABLE school_settings
	ADD COLUMN contact_email text,
	ADD COLUMN contact_phone text,
	ADD COLUMN address text,
	ADD COLUMN logo_path text,
	ADD COLUMN theme_color text NOT NULL DEFAULT '#0f766e',
	ADD COLUMN locale text NOT NULL DEFAULT 'en-IN',
	ADD COLUMN attendance_policy text NOT NULL DEFAULT 'Daily attendance is recorded per section.',
	ADD COLUMN grading_policy text NOT NULL DEFAULT 'Marks are recorded out of the exam maximum.',
	ADD COLUMN plan_key text NOT NULL DEFAULT 'standard',
	ADD COLUMN student_limit integer;
--> statement-breakpoint
ALTER TABLE school_settings
	ADD CONSTRAINT school_settings_theme_chk CHECK (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
	ADD CONSTRAINT school_settings_limit_chk CHECK (student_limit IS NULL OR student_limit >= 0);
--> statement-breakpoint
CREATE TABLE membership_permissions (
	membership_id uuid NOT NULL REFERENCES school_memberships (id) ON DELETE CASCADE,
	permission_key text NOT NULL REFERENCES permissions (key) ON DELETE RESTRICT,
	PRIMARY KEY (membership_id, permission_key)
);
--> statement-breakpoint
CREATE TABLE user_secrets (
	user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
	totp_secret text,
	totp_enabled boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE TABLE password_resets (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	token_hash text NOT NULL UNIQUE,
	expires_at timestamptz NOT NULL,
	used_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX password_resets_user_idx ON password_resets (user_id);
--> statement-breakpoint
CREATE TABLE login_challenges (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	token_hash text NOT NULL UNIQUE,
	expires_at timestamptz NOT NULL,
	used_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE school_onboarding (
	school_id uuid PRIMARY KEY REFERENCES schools (id) ON DELETE RESTRICT,
	step text NOT NULL DEFAULT 'profile',
	draft jsonb NOT NULL DEFAULT '{}'::jsonb,
	completed_at timestamptz,
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT school_onboarding_step_chk CHECK (
		step IN ('profile', 'address', 'session', 'classes', 'staff', 'policies', 'fees', 'locale', 'review')
	)
);
--> statement-breakpoint
CREATE TABLE school_notices (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	school_id uuid NOT NULL REFERENCES schools (id) ON DELETE RESTRICT,
	title text NOT NULL,
	body text NOT NULL,
	created_by uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX school_notices_school_idx ON school_notices (school_id, created_at);
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
			JOIN public.schools s ON s.id = m.school_id
			WHERE m.school_id = p_school
				AND m.user_id = app.current_user_id()
				AND m.status = 'active'
				AND m.deleted_at IS NULL
				AND s.status = 'active'
				AND s.deleted_at IS NULL
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
	SELECT app.can_access_school(p_school) AND EXISTS (
		SELECT 1
		FROM public.school_memberships m
		WHERE m.school_id = p_school
			AND m.user_id = app.current_user_id()
			AND m.status = 'active'
			AND m.deleted_at IS NULL
			AND (
				EXISTS (
					SELECT 1
					FROM public.role_permissions rp
					WHERE rp.role_id = m.role_id
						AND rp.permission_key = p_key
				)
				OR EXISTS (
					SELECT 1
					FROM public.membership_permissions mp
					WHERE mp.membership_id = m.id
						AND mp.permission_key = p_key
				)
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
	SELECT app.can_access_school(p_school) AND EXISTS (
		SELECT 1
		FROM public.school_memberships m
		WHERE m.school_id = p_school
			AND m.user_id = app.current_user_id()
			AND m.status = 'active'
			AND m.deleted_at IS NULL
			AND (
				EXISTS (
					SELECT 1
					FROM public.role_permissions rp
					WHERE rp.role_id = m.role_id
						AND rp.permission_key = ANY (p_keys)
				)
				OR EXISTS (
					SELECT 1
					FROM public.membership_permissions mp
					WHERE mp.membership_id = m.id
						AND mp.permission_key = ANY (p_keys)
				)
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
	SELECT EXISTS (
		SELECT 1
		FROM public.school_memberships m
		JOIN public.schools s ON s.id = m.school_id
		WHERE m.user_id = app.current_user_id()
			AND m.status = 'active'
			AND m.deleted_at IS NULL
			AND s.status = 'active'
			AND s.deleted_at IS NULL
			AND (
				EXISTS (
					SELECT 1 FROM public.role_permissions rp
					WHERE rp.role_id = m.role_id AND rp.permission_key = p_key
				)
				OR EXISTS (
					SELECT 1 FROM public.membership_permissions mp
					WHERE mp.membership_id = m.id AND mp.permission_key = p_key
				)
			)
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
	SELECT p_other = app.current_user_id()
		OR EXISTS (
			SELECT 1
			FROM public.school_memberships mine
			JOIN public.school_memberships theirs ON theirs.school_id = mine.school_id
			JOIN public.schools s ON s.id = mine.school_id
			WHERE mine.user_id = app.current_user_id()
				AND theirs.user_id = p_other
				AND mine.status = 'active'
				AND theirs.status = 'active'
				AND mine.deleted_at IS NULL
				AND theirs.deleted_at IS NULL
				AND s.status = 'active'
				AND s.deleted_at IS NULL
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
		OR app.has_permission(p_school, 'users.manage')
		OR (
			app.has_any_permission(
				p_school,
				ARRAY['school.teaching.write', 'attendance.mark', 'marks.submit']
			)
			AND EXISTS (
				SELECT 1
				FROM public.teacher_assignments ta
				JOIN public.student_enrollments e
					ON e.school_id = ta.school_id
					AND e.section_id = ta.section_id
					AND e.session_id = ta.session_id
				WHERE ta.school_id = p_school
					AND ta.teacher_user_id = app.current_user_id()
					AND e.student_id = p_student
					AND e.status = 'active'
			)
		)
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
CREATE OR REPLACE FUNCTION app.guard_school_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF app.is_platform_admin() AND NOT app.has_permission(NEW.id, 'school.settings.manage') THEN
		IF NEW.name IS DISTINCT FROM OLD.name
			OR NEW.code IS DISTINCT FROM OLD.code
			OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
			RAISE EXCEPTION 'platform admin cannot change school identity'
				USING ERRCODE = '42501';
		END IF;
	END IF;
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS schools_guard_identity ON schools;
--> statement-breakpoint
CREATE TRIGGER schools_guard_identity
	BEFORE UPDATE ON schools
	FOR EACH ROW
	EXECUTE FUNCTION app.guard_school_identity();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.guard_school_branding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF app.is_platform_admin() AND NOT app.has_permission(NEW.school_id, 'school.settings.manage') THEN
		IF NEW.timezone IS DISTINCT FROM OLD.timezone
			OR NEW.currency IS DISTINCT FROM OLD.currency
			OR NEW.late_fee_grace_days IS DISTINCT FROM OLD.late_fee_grace_days
			OR NEW.contact_email IS DISTINCT FROM OLD.contact_email
			OR NEW.contact_phone IS DISTINCT FROM OLD.contact_phone
			OR NEW.address IS DISTINCT FROM OLD.address
			OR NEW.logo_path IS DISTINCT FROM OLD.logo_path
			OR NEW.theme_color IS DISTINCT FROM OLD.theme_color
			OR NEW.locale IS DISTINCT FROM OLD.locale
			OR NEW.attendance_policy IS DISTINCT FROM OLD.attendance_policy
			OR NEW.grading_policy IS DISTINCT FROM OLD.grading_policy THEN
			RAISE EXCEPTION 'platform admin cannot change school branding'
				USING ERRCODE = '42501';
		END IF;
	END IF;
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS school_settings_guard_branding ON school_settings;
--> statement-breakpoint
CREATE TRIGGER school_settings_guard_branding
	BEFORE UPDATE ON school_settings
	FOR EACH ROW
	EXECUTE FUNCTION app.guard_school_branding();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.enforce_student_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	lim integer;
	current_count integer;
BEGIN
	SELECT student_limit INTO lim FROM public.school_settings WHERE school_id = NEW.school_id;
	IF lim IS NULL THEN
		RETURN NEW;
	END IF;
	SELECT count(*) INTO current_count
	FROM public.students
	WHERE school_id = NEW.school_id AND deleted_at IS NULL;
	IF current_count >= lim THEN
		RAISE EXCEPTION 'student limit reached' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS students_enforce_limit ON students;
--> statement-breakpoint
CREATE TRIGGER students_enforce_limit
	BEFORE INSERT ON students
	FOR EACH ROW
	EXECUTE FUNCTION app.enforce_student_limit();
--> statement-breakpoint
INSERT INTO permissions (key, description) VALUES
	('schools.create', 'Create a school account'),
	('schools.update', 'Update platform-level school status and limits'),
	('users.manage', 'Create and manage user accounts'),
	('roles.assign', 'Assign roles and explicit permissions'),
	('classes.manage', 'Manage classes, sections, and subjects'),
	('timetables.manage', 'Manage timetables'),
	('exams.manage', 'Manage exams'),
	('marks.submit', 'Submit marks for assigned students'),
	('results.publish', 'Publish report cards'),
	('attendance.mark', 'Record attendance for assigned students'),
	('fees.configure', 'Configure fee structures'),
	('payments.record', 'Record fee payments'),
	('complaints.resolve', 'Resolve complaints'),
	('documents.approve', 'Approve document requests'),
	('reports.export', 'Export school reports')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'school_admin'
	AND p.key IN (
		'schools.update', 'users.manage', 'roles.assign', 'classes.manage', 'timetables.manage',
		'exams.manage', 'marks.submit', 'results.publish', 'attendance.mark', 'fees.configure',
		'payments.record', 'complaints.resolve', 'documents.approve', 'reports.export'
	)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN ('attendance.mark', 'marks.submit')
WHERE r.key = 'teacher'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'super_admin'
	AND p.key IN (
		'schools.create', 'schools.update', 'users.manage', 'roles.assign', 'reports.export'
	)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM role_permissions rp
USING roles r
WHERE rp.role_id = r.id AND r.key = 'manager_admin';
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
CALL app.define_school_policy('academic_sessions', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''classes.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('classes', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''classes.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('sections', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''classes.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('subjects', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''classes.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('timetable_periods', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''timetables.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('timetables', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''timetables.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('timetable_entries', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''timetables.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('grading_rules', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''exams.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('exams', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''exams.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('exam_schedules', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.records.manage'', ''exams.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('fee_structures', 'app.can_access_school(school_id)', 'app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''fees.configure''])');
--> statement-breakpoint
CALL app.define_school_policy('marks', 'app.can_read_student(school_id, student_id)', 'app.can_read_student(school_id, student_id) AND app.has_any_permission(school_id, ARRAY[''marks.submit'', ''school.teaching.write'', ''school.records.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('attendance_records', 'app.can_read_student(school_id, student_id)', 'app.can_read_student(school_id, student_id) AND app.has_any_permission(school_id, ARRAY[''attendance.mark'', ''school.teaching.write'', ''school.records.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('report_cards', 'app.can_read_student(school_id, student_id)', 'app.can_read_student(school_id, student_id) AND app.has_any_permission(school_id, ARRAY[''results.publish'', ''school.records.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('fee_concessions', 'app.can_read_student(school_id, student_id) OR app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''fees.configure'', ''payments.record''])', 'app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''fees.configure''])');
--> statement-breakpoint
CALL app.define_school_policy('invoices', 'app.can_read_student(school_id, student_id) OR app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''fees.configure'', ''payments.record''])', 'app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''fees.configure''])');
--> statement-breakpoint
CALL app.define_school_policy('payments', 'app.can_read_student(school_id, student_id) OR app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''fees.configure'', ''payments.record''])', 'app.has_any_permission(school_id, ARRAY[''school.fees.manage'', ''payments.record''])');
--> statement-breakpoint
CALL app.define_school_policy('school_settings', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.settings.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('invitations', 'app.has_any_permission(school_id, ARRAY[''school.members.manage'', ''users.manage''])', 'app.has_any_permission(school_id, ARRAY[''school.members.manage'', ''users.manage''])');
--> statement-breakpoint
CALL app.define_school_policy('school_onboarding', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.settings.manage'')');
--> statement-breakpoint
CALL app.define_school_policy('school_notices', 'app.can_access_school(school_id)', 'app.has_permission(school_id, ''school.settings.manage'')');
--> statement-breakpoint
DROP POLICY IF EXISTS complaints_update ON complaints;
--> statement-breakpoint
CREATE POLICY complaints_update ON complaints FOR UPDATE TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.complaints.manage', 'complaints.resolve']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.complaints.manage', 'complaints.resolve']));
--> statement-breakpoint
DROP POLICY IF EXISTS document_requests_update ON document_requests;
--> statement-breakpoint
CREATE POLICY document_requests_update ON document_requests FOR UPDATE TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.documents.manage', 'documents.approve']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.documents.manage', 'documents.approve']));
--> statement-breakpoint
DROP POLICY IF EXISTS school_memberships_insert ON school_memberships;
--> statement-breakpoint
CREATE POLICY school_memberships_insert ON school_memberships FOR INSERT TO erp_app
	WITH CHECK (
		app.is_platform_admin()
		OR app.has_any_permission(school_id, ARRAY['school.members.manage', 'users.manage'])
	);
--> statement-breakpoint
DROP POLICY IF EXISTS school_memberships_update ON school_memberships;
--> statement-breakpoint
CREATE POLICY school_memberships_update ON school_memberships FOR UPDATE TO erp_app
	USING (
		app.is_platform_admin()
		OR app.has_any_permission(school_id, ARRAY['school.members.manage', 'users.manage', 'roles.assign'])
	)
	WITH CHECK (
		app.is_platform_admin()
		OR app.has_any_permission(school_id, ARRAY['school.members.manage', 'users.manage', 'roles.assign'])
	);
--> statement-breakpoint
ALTER TABLE membership_permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE membership_permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY membership_permissions_select ON membership_permissions FOR SELECT TO erp_app
	USING (
		EXISTS (
			SELECT 1 FROM public.school_memberships m
			WHERE m.id = membership_id
				AND (
					m.user_id = app.current_user_id()
					OR app.has_any_permission(m.school_id, ARRAY['school.members.manage', 'users.manage', 'roles.assign'])
				)
		)
	);
--> statement-breakpoint
CREATE POLICY membership_permissions_insert ON membership_permissions FOR INSERT TO erp_app
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.school_memberships m
			WHERE m.id = membership_id
				AND app.has_any_permission(m.school_id, ARRAY['roles.assign', 'users.manage', 'school.members.manage'])
		)
	);
--> statement-breakpoint
CREATE POLICY membership_permissions_delete ON membership_permissions FOR DELETE TO erp_app
	USING (
		EXISTS (
			SELECT 1 FROM public.school_memberships m
			WHERE m.id = membership_id
				AND app.has_any_permission(m.school_id, ARRAY['roles.assign', 'users.manage', 'school.members.manage'])
		)
	);
--> statement-breakpoint
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_secrets FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_secrets_select ON user_secrets FOR SELECT TO erp_app
	USING (user_id = app.current_user_id());
--> statement-breakpoint
CREATE POLICY user_secrets_insert ON user_secrets FOR INSERT TO erp_app
	WITH CHECK (user_id = app.current_user_id());
--> statement-breakpoint
CREATE POLICY user_secrets_update ON user_secrets FOR UPDATE TO erp_app
	USING (user_id = app.current_user_id())
	WITH CHECK (user_id = app.current_user_id());
--> statement-breakpoint
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE password_resets FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE login_challenges ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE login_challenges FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TRIGGER school_onboarding_touch_updated_at
	BEFORE UPDATE ON school_onboarding
	FOR EACH ROW
	EXECUTE FUNCTION app.touch_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.lookup_login(p_email text)
RETURNS TABLE (
	user_id uuid,
	password_hash text,
	status text,
	locked_until timestamptz,
	failed_login_count integer,
	is_platform_admin boolean,
	full_name text,
	email_verified_at timestamptz,
	totp_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT u.id, u.password_hash, u.status, u.locked_until, u.failed_login_count,
		u.is_platform_admin, u.full_name, u.email_verified_at, COALESCE(s.totp_enabled, false)
	FROM public.users u
	LEFT JOIN public.user_secrets s ON s.user_id = u.id
	WHERE lower(u.email) = lower(btrim(p_email))
		AND u.deleted_at IS NULL
	LIMIT 1;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.record_login_failure(p_user uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	next_count integer;
	locked timestamptz;
BEGIN
	UPDATE public.users
	SET failed_login_count = failed_login_count + 1,
		locked_until = CASE
			WHEN failed_login_count + 1 >= 5 THEN now() + interval '15 minutes'
			ELSE locked_until
		END
	WHERE id = p_user
	RETURNING failed_login_count, locked_until INTO next_count, locked;
	RETURN locked;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.record_login_success(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	UPDATE public.users
	SET failed_login_count = 0, locked_until = NULL
	WHERE id = p_user;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.open_session(
	p_user uuid,
	p_school uuid,
	p_token_hash text,
	p_expires timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	session_id uuid;
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM public.users u
		WHERE u.id = p_user AND u.status = 'active' AND u.deleted_at IS NULL AND u.email_verified_at IS NOT NULL
	) THEN
		RAISE EXCEPTION 'account cannot start a session' USING ERRCODE = '42501';
	END IF;
	INSERT INTO public.user_sessions (user_id, school_id, token_hash, expires_at)
	VALUES (p_user, p_school, p_token_hash, p_expires)
	RETURNING id INTO session_id;
	RETURN session_id;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.session_from_token(p_token_hash text)
RETURNS TABLE (
	session_id uuid,
	user_id uuid,
	school_id uuid,
	full_name text,
	is_platform_admin boolean,
	role_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT s.id, s.user_id, s.school_id, u.full_name, u.is_platform_admin, r.key
	FROM public.user_sessions s
	JOIN public.users u ON u.id = s.user_id
	LEFT JOIN public.school_memberships m
		ON m.user_id = s.user_id
		AND m.school_id = s.school_id
		AND m.status = 'active'
		AND m.deleted_at IS NULL
	LEFT JOIN public.roles r ON r.id = m.role_id
	WHERE s.token_hash = p_token_hash
		AND s.revoked_at IS NULL
		AND s.expires_at > now()
		AND u.status = 'active'
		AND u.deleted_at IS NULL
	LIMIT 1;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.revoke_session(p_token_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	UPDATE public.user_sessions
	SET revoked_at = now()
	WHERE token_hash = p_token_hash AND revoked_at IS NULL;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.revoke_user_sessions(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF p_user IS DISTINCT FROM app.current_user_id()
		AND NOT app.is_platform_admin()
		AND NOT EXISTS (
			SELECT 1
			FROM public.school_memberships mine
			JOIN public.school_memberships theirs ON theirs.school_id = mine.school_id
			WHERE mine.user_id = app.current_user_id()
				AND theirs.user_id = p_user
				AND mine.status = 'active'
				AND mine.deleted_at IS NULL
				AND app.has_any_permission(mine.school_id, ARRAY['users.manage', 'school.members.manage'])
		) THEN
		RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
	END IF;
	UPDATE public.user_sessions
	SET revoked_at = now()
	WHERE user_id = p_user AND revoked_at IS NULL;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.set_session_school(p_token_hash text, p_school uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	actor uuid;
	role_key text;
BEGIN
	SELECT user_id INTO actor
	FROM public.user_sessions
	WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now();
	IF actor IS NULL THEN
		RAISE EXCEPTION 'session is not active' USING ERRCODE = '42501';
	END IF;
	SELECT r.key INTO role_key
	FROM public.school_memberships m
	JOIN public.roles r ON r.id = m.role_id
	JOIN public.schools s ON s.id = m.school_id
	WHERE m.user_id = actor
		AND m.school_id = p_school
		AND m.status = 'active'
		AND m.deleted_at IS NULL
		AND s.status = 'active'
		AND s.deleted_at IS NULL
		AND r.scope = 'school'
	LIMIT 1;
	IF role_key IS NULL THEN
		RAISE EXCEPTION 'school is not available to this account' USING ERRCODE = '42501';
	END IF;
	UPDATE public.user_sessions SET school_id = p_school WHERE token_hash = p_token_hash;
	RETURN role_key;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.account_schools(p_token_hash text)
RETURNS TABLE (
	school_id uuid,
	school_name text,
	school_code text,
	school_status text,
	role_key text,
	membership_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT s.id, s.name, s.code, s.status, r.key, m.status
	FROM public.user_sessions sess
	JOIN public.school_memberships m ON m.user_id = sess.user_id
	JOIN public.schools s ON s.id = m.school_id
	JOIN public.roles r ON r.id = m.role_id
	WHERE sess.token_hash = p_token_hash
		AND sess.revoked_at IS NULL
		AND sess.expires_at > now()
		AND m.deleted_at IS NULL
		AND s.deleted_at IS NULL
	ORDER BY s.name;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.permissions_for(p_token_hash text, p_school uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT COALESCE(array_agg(DISTINCT key), ARRAY[]::text[])
	FROM (
		SELECT rp.permission_key AS key
		FROM public.user_sessions sess
		JOIN public.school_memberships m ON m.user_id = sess.user_id
		JOIN public.role_permissions rp ON rp.role_id = m.role_id
		WHERE sess.token_hash = p_token_hash
			AND sess.revoked_at IS NULL
			AND sess.expires_at > now()
			AND m.school_id = p_school
			AND m.status = 'active'
			AND m.deleted_at IS NULL
		UNION
		SELECT mp.permission_key
		FROM public.user_sessions sess
		JOIN public.school_memberships m ON m.user_id = sess.user_id
		JOIN public.membership_permissions mp ON mp.membership_id = m.id
		WHERE sess.token_hash = p_token_hash
			AND sess.revoked_at IS NULL
			AND sess.expires_at > now()
			AND m.school_id = p_school
			AND m.status = 'active'
			AND m.deleted_at IS NULL
	) granted;
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.issue_password_reset(p_email text, p_token_hash text, p_expires timestamptz)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	actor uuid;
BEGIN
	SELECT id INTO actor
	FROM public.users
	WHERE lower(email) = lower(btrim(p_email)) AND deleted_at IS NULL AND status = 'active';
	IF actor IS NULL THEN
		RETURN false;
	END IF;
	INSERT INTO public.password_resets (user_id, token_hash, expires_at)
	VALUES (actor, p_token_hash, p_expires);
	RETURN true;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.consume_password_reset(p_token_hash text, p_password_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	actor uuid;
	reset_id uuid;
BEGIN
	SELECT id, user_id INTO reset_id, actor
	FROM public.password_resets
	WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now()
	FOR UPDATE;
	IF actor IS NULL THEN
		RETURN NULL;
	END IF;
	UPDATE public.users
	SET password_hash = p_password_hash, failed_login_count = 0, locked_until = NULL
	WHERE id = actor AND status = 'active' AND deleted_at IS NULL;
	UPDATE public.password_resets SET used_at = now() WHERE id = reset_id;
	UPDATE public.user_sessions SET revoked_at = now() WHERE user_id = actor AND revoked_at IS NULL;
	RETURN actor;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.issue_login_challenge(p_user uuid, p_token_hash text, p_expires timestamptz)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	INSERT INTO public.login_challenges (user_id, token_hash, expires_at)
	VALUES (p_user, p_token_hash, p_expires);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.consume_login_challenge(p_token_hash text)
RETURNS TABLE (user_id uuid, totp_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	actor uuid;
	challenge uuid;
	secret text;
BEGIN
	SELECT c.id, c.user_id, s.totp_secret
	INTO challenge, actor, secret
	FROM public.login_challenges c
	JOIN public.user_secrets s ON s.user_id = c.user_id
	WHERE c.token_hash = p_token_hash
		AND c.used_at IS NULL
		AND c.expires_at > now()
		AND s.totp_enabled
	FOR UPDATE OF c;
	IF actor IS NULL THEN
		RETURN;
	END IF;
	UPDATE public.login_challenges SET used_at = now() WHERE id = challenge;
	user_id := actor;
	totp_secret := secret;
	RETURN NEXT;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.bootstrap_platform_admin(p_email text, p_name text, p_password_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	created uuid;
BEGIN
	IF EXISTS (SELECT 1 FROM public.users WHERE is_platform_admin AND deleted_at IS NULL) THEN
		RAISE EXCEPTION 'platform admin already exists' USING ERRCODE = '42501';
	END IF;
	INSERT INTO public.users (email, full_name, password_hash, status, is_platform_admin, email_verified_at)
	VALUES (lower(btrim(p_email)), p_name, p_password_hash, 'active', true, now())
	RETURNING id INTO created;
	RETURN created;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.platform_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT EXISTS (SELECT 1 FROM public.users WHERE is_platform_admin AND deleted_at IS NULL);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.provision_school_admin(
	p_school uuid,
	p_email text,
	p_name text,
	p_token_hash text,
	p_expires timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	actor uuid;
	role_id uuid;
	invite_id uuid;
BEGIN
	IF NOT app.is_platform_admin() THEN
		RAISE EXCEPTION 'platform access denied' USING ERRCODE = '42501';
	END IF;
	IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school AND deleted_at IS NULL AND status <> 'archived') THEN
		RAISE EXCEPTION 'school is not available' USING ERRCODE = '42501';
	END IF;
	SELECT id INTO role_id FROM public.roles WHERE key = 'school_admin' AND scope = 'school';
	SELECT id INTO actor FROM public.users WHERE lower(email) = lower(btrim(p_email)) AND deleted_at IS NULL;
	IF actor IS NULL THEN
		INSERT INTO public.users (email, full_name, status)
		VALUES (lower(btrim(p_email)), p_name, 'active')
		RETURNING id INTO actor;
	END IF;
	INSERT INTO public.school_memberships (school_id, user_id, role_id, status)
	VALUES (p_school, actor, role_id, 'invited')
	ON CONFLICT DO NOTHING;
	INSERT INTO public.invitations (school_id, role_id, email, token_hash, status, expires_at)
	VALUES (p_school, role_id, lower(btrim(p_email)), p_token_hash, 'pending', p_expires)
	RETURNING id INTO invite_id;
	RETURN invite_id;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.invitation_preview(p_token_hash text)
RETURNS TABLE (email text, school_name text, role_key text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT i.email, s.name, r.key, i.expires_at
	FROM public.invitations i
	JOIN public.schools s ON s.id = i.school_id
	JOIN public.roles r ON r.id = i.role_id
	WHERE i.token_hash = p_token_hash
		AND i.status = 'pending'
		AND i.expires_at > now();
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.accept_invitation(p_token_hash text, p_name text, p_password_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	invite public.invitations%ROWTYPE;
	actor uuid;
BEGIN
	SELECT * INTO invite
	FROM public.invitations
	WHERE token_hash = p_token_hash AND status = 'pending' AND expires_at > now()
	FOR UPDATE;
	IF invite.id IS NULL THEN
		RETURN NULL;
	END IF;
	SELECT id INTO actor
	FROM public.users
	WHERE lower(email) = lower(invite.email) AND deleted_at IS NULL;
	IF actor IS NULL THEN
		INSERT INTO public.users (email, full_name, password_hash, status, email_verified_at)
		VALUES (lower(invite.email), p_name, p_password_hash, 'active', now())
		RETURNING id INTO actor;
	ELSE
		UPDATE public.users
		SET password_hash = COALESCE(password_hash, p_password_hash),
			full_name = COALESCE(NULLIF(btrim(p_name), ''), full_name),
			email_verified_at = COALESCE(email_verified_at, now()),
			failed_login_count = 0,
			locked_until = NULL
		WHERE id = actor AND status = 'active';
	END IF;
	UPDATE public.school_memberships
	SET status = 'active'
	WHERE school_id = invite.school_id AND user_id = actor AND role_id = invite.role_id AND deleted_at IS NULL;
	IF NOT FOUND THEN
		INSERT INTO public.school_memberships (school_id, user_id, role_id, status)
		VALUES (invite.school_id, actor, invite.role_id, 'active');
	END IF;
	UPDATE public.invitations
	SET status = 'accepted', accepted_by_user_id = actor
	WHERE id = invite.id;
	RETURN actor;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.school_usage(p_school uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF NOT (
		app.is_platform_admin()
		OR app.has_any_permission(p_school, ARRAY['school.settings.manage', 'reports.export', 'school.reports.read'])
	) THEN
		RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
	END IF;
	RETURN jsonb_build_object(
		'students', (SELECT count(*) FROM public.students WHERE school_id = p_school AND deleted_at IS NULL),
		'staff', (SELECT count(*) FROM public.school_memberships WHERE school_id = p_school AND deleted_at IS NULL AND status = 'active'),
		'files', (SELECT count(*) FROM public.stored_files WHERE school_id = p_school AND deleted_at IS NULL),
		'storageBytes', (SELECT COALESCE(sum(byte_size), 0) FROM public.stored_files WHERE school_id = p_school AND deleted_at IS NULL)
	);
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.platform_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF NOT app.is_platform_admin() THEN
		RAISE EXCEPTION 'platform access denied' USING ERRCODE = '42501';
	END IF;
	RETURN jsonb_build_object(
		'schools', (SELECT count(*) FROM public.schools WHERE deleted_at IS NULL),
		'active', (SELECT count(*) FROM public.schools WHERE deleted_at IS NULL AND status = 'active'),
		'suspended', (SELECT count(*) FROM public.schools WHERE deleted_at IS NULL AND status = 'suspended'),
		'archived', (SELECT count(*) FROM public.schools WHERE deleted_at IS NULL AND status = 'archived'),
		'users', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL)
	);
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.invite_school_member(
	p_school uuid,
	p_email text,
	p_name text,
	p_role text,
	p_token_hash text,
	p_expires timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	actor uuid;
	role_id uuid;
BEGIN
	IF NOT app.has_any_permission(p_school, ARRAY['users.manage', 'school.members.manage']) THEN
		RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
	END IF;
	IF p_role NOT IN ('school_admin', 'manager_admin', 'teacher', 'parent') THEN
		RAISE EXCEPTION 'that role cannot be assigned' USING ERRCODE = '23514';
	END IF;
	SELECT id INTO role_id FROM public.roles WHERE key = p_role AND scope = 'school';
	SELECT id INTO actor FROM public.users WHERE lower(email) = lower(btrim(p_email)) AND deleted_at IS NULL;
	IF actor IS NULL THEN
		INSERT INTO public.users (email, full_name, status)
		VALUES (lower(btrim(p_email)), btrim(p_name), 'active')
		RETURNING id INTO actor;
	END IF;
	INSERT INTO public.school_memberships (school_id, user_id, role_id, status)
	VALUES (p_school, actor, role_id, 'invited');
	INSERT INTO public.invitations (school_id, role_id, email, token_hash, status, expires_at)
	VALUES (p_school, role_id, lower(btrim(p_email)), p_token_hash, 'pending', p_expires);
	RETURN actor;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.create_school(p_name text, p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	created uuid;
BEGIN
	IF NOT app.is_platform_admin() THEN
		RAISE EXCEPTION 'platform access denied' USING ERRCODE = '42501';
	END IF;
	IF btrim(p_name) = '' OR char_length(btrim(p_name)) > 120 THEN
		RAISE EXCEPTION 'school name is invalid' USING ERRCODE = '23514';
	END IF;
	IF p_code !~ '^[a-z0-9-]{2,32}$' THEN
		RAISE EXCEPTION 'school code is invalid' USING ERRCODE = '23514';
	END IF;
	INSERT INTO public.schools (name, code) VALUES (btrim(p_name), p_code) RETURNING id INTO created;
	INSERT INTO public.school_settings (school_id) VALUES (created);
	INSERT INTO public.school_onboarding (school_id) VALUES (created);
	RETURN created;
END
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.set_school_limits(p_school uuid, p_plan text, p_limit integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF NOT app.is_platform_admin() THEN
		RAISE EXCEPTION 'platform access denied' USING ERRCODE = '42501';
	END IF;
	IF p_limit IS NOT NULL AND p_limit < 0 THEN
		RAISE EXCEPTION 'student limit must be zero or greater' USING ERRCODE = '23514';
	END IF;
	UPDATE public.school_settings
	SET plan_key = p_plan, student_limit = p_limit
	WHERE school_id = p_school;
END
$fn$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON membership_permissions, school_onboarding, school_notices, user_secrets TO erp_app;
--> statement-breakpoint
GRANT SELECT ON password_resets, login_challenges TO erp_app;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON password_resets, login_challenges FROM erp_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION
	app.lookup_login(text),
	app.record_login_failure(uuid),
	app.record_login_success(uuid),
	app.open_session(uuid, uuid, text, timestamptz),
	app.session_from_token(text),
	app.revoke_session(text),
	app.revoke_user_sessions(uuid),
	app.set_session_school(text, uuid),
	app.account_schools(text),
	app.permissions_for(text, uuid),
	app.issue_password_reset(text, text, timestamptz),
	app.consume_password_reset(text, text),
	app.issue_login_challenge(uuid, text, timestamptz),
	app.consume_login_challenge(text),
	app.bootstrap_platform_admin(text, text, text),
	app.platform_admin_exists(),
	app.provision_school_admin(uuid, text, text, text, timestamptz),
	app.invitation_preview(text),
	app.accept_invitation(text, text, text),
	app.school_usage(uuid),
	app.platform_overview(),
	app.invite_school_member(uuid, text, text, text, text, timestamptz),
	app.create_school(text, text),
	app.set_school_limits(uuid, text, integer)
FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION
	app.lookup_login(text),
	app.record_login_failure(uuid),
	app.record_login_success(uuid),
	app.open_session(uuid, uuid, text, timestamptz),
	app.session_from_token(text),
	app.revoke_session(text),
	app.revoke_user_sessions(uuid),
	app.set_session_school(text, uuid),
	app.account_schools(text),
	app.permissions_for(text, uuid),
	app.issue_password_reset(text, text, timestamptz),
	app.consume_password_reset(text, text),
	app.issue_login_challenge(uuid, text, timestamptz),
	app.consume_login_challenge(text),
	app.bootstrap_platform_admin(text, text, text),
	app.platform_admin_exists(),
	app.provision_school_admin(uuid, text, text, text, timestamptz),
	app.invitation_preview(text),
	app.accept_invitation(text, text, text),
	app.school_usage(uuid),
	app.platform_overview(),
	app.invite_school_member(uuid, text, text, text, text, timestamptz),
	app.create_school(text, text),
	app.set_school_limits(uuid, text, integer)
TO erp_app;
--> statement-breakpoint
DROP PROCEDURE app.define_school_policy(text, text, text);
