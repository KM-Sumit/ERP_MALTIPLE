DROP POLICY IF EXISTS school_memberships_select ON school_memberships;
--> statement-breakpoint
CREATE POLICY school_memberships_select ON school_memberships FOR SELECT TO erp_app
	USING (
		user_id = app.current_user_id()
		OR app.is_platform_admin()
		OR app.has_any_permission(school_id, ARRAY['school.members.manage', 'school.records.manage', 'school.teaching.write'])
	);
