DROP POLICY IF EXISTS courses_select ON courses;
--> statement-breakpoint
CREATE POLICY courses_select ON courses FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			status = 'published'
			OR app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write', 'classes.manage'])
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS course_materials_select ON course_materials;
--> statement-breakpoint
CREATE POLICY course_materials_select ON course_materials FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write', 'classes.manage'])
			OR EXISTS (
				SELECT 1 FROM courses c
				WHERE c.id = course_id
					AND c.school_id = course_materials.school_id
					AND c.status = 'published'
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS chapters_select ON chapters;
--> statement-breakpoint
CREATE POLICY chapters_select ON chapters FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write', 'classes.manage'])
			OR EXISTS (
				SELECT 1 FROM courses c
				WHERE c.id = course_id AND c.school_id = chapters.school_id AND c.status = 'published'
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS notifications_insert ON notifications;
--> statement-breakpoint
CREATE POLICY notifications_insert ON notifications FOR INSERT TO erp_app
	WITH CHECK (
		app.can_access_school(school_id)
		AND (
			user_id = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY[
				'school.records.manage', 'school.teaching.write', 'timetables.manage', 'exams.manage',
				'results.publish', 'complaints.resolve', 'documents.approve', 'fees.configure', 'payments.record'
			])
		)
	);
--> statement-breakpoint
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
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS complaint_attachments_select ON complaint_attachments;
--> statement-breakpoint
CREATE POLICY complaint_attachments_select ON complaint_attachments FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			app.has_any_permission(school_id, ARRAY['school.complaints.manage', 'school.records.manage', 'complaints.resolve'])
			OR EXISTS (
				SELECT 1 FROM complaints c
				WHERE c.id = complaint_id
					AND c.school_id = complaint_attachments.school_id
					AND c.raised_by = app.current_user_id()
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS document_requests_select ON document_requests;
--> statement-breakpoint
CREATE POLICY document_requests_select ON document_requests FOR SELECT TO erp_app
	USING (
		app.can_read_student(school_id, student_id)
		OR app.has_any_permission(school_id, ARRAY['school.documents.manage', 'documents.approve'])
	);
--> statement-breakpoint
ALTER TABLE document_downloads
	ADD CONSTRAINT document_downloads_request_fk
	FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE restrict;
