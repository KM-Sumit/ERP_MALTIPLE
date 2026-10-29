DROP POLICY IF EXISTS stored_files_select ON stored_files;
--> statement-breakpoint
CREATE POLICY stored_files_select ON stored_files FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			uploaded_by = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY[
				'school.records.manage', 'school.teaching.write', 'complaints.resolve', 'documents.approve'
			])
			OR EXISTS (
				SELECT 1
				FROM course_materials m
				JOIN courses c ON c.id = m.course_id AND c.school_id = m.school_id
				JOIN student_enrollments e
					ON e.section_id = c.section_id AND e.school_id = c.school_id AND e.status = 'active'
				JOIN guardian_students g
					ON g.student_id = e.student_id AND g.school_id = e.school_id
				WHERE m.file_id = stored_files.id
					AND m.school_id = stored_files.school_id
					AND c.status = 'published'
					AND g.guardian_user_id = app.current_user_id()
			)
			OR EXISTS (
				SELECT 1
				FROM session_timetable_files t
				JOIN classes cl ON cl.id = t.class_id AND cl.school_id = t.school_id
				JOIN sections sec ON sec.class_id = cl.id AND sec.school_id = cl.school_id
				JOIN student_enrollments e
					ON e.section_id = sec.id AND e.school_id = sec.school_id AND e.status = 'active'
				JOIN guardian_students g
					ON g.student_id = e.student_id AND g.school_id = e.school_id
				WHERE t.file_id = stored_files.id
					AND t.school_id = stored_files.school_id
					AND g.guardian_user_id = app.current_user_id()
			)
		)
	);
