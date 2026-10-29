INSERT INTO roles (key, scope, description) VALUES
	('student', 'school', 'Student')
ON CONFLICT (key) DO NOTHING;
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
WHERE r.key = 'student'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE guardian_students DROP CONSTRAINT guardian_students_relationship_chk;
--> statement-breakpoint
ALTER TABLE guardian_students ADD CONSTRAINT guardian_students_relationship_chk
	CHECK (relationship IN ('mother', 'father', 'guardian', 'other', 'self'));
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
	IF p_role NOT IN ('school_admin', 'manager_admin', 'teacher', 'parent', 'student') THEN
		RAISE EXCEPTION 'that role cannot be assigned' USING ERRCODE = '23514';
	END IF;
	SELECT id INTO role_id FROM public.roles WHERE key = p_role AND scope = 'school';
	IF role_id IS NULL THEN
		RAISE EXCEPTION 'that role cannot be assigned' USING ERRCODE = '23514';
	END IF;
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
