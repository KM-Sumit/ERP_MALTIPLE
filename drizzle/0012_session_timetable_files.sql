CREATE TABLE session_timetable_files (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	session_id uuid NOT NULL,
	file_id uuid NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT session_timetable_files_id_school_uidx UNIQUE (id, school_id),
	CONSTRAINT session_timetable_files_file_uidx UNIQUE (file_id),
	CONSTRAINT session_timetable_files_session_fk FOREIGN KEY (session_id, school_id) REFERENCES academic_sessions (id, school_id) ON DELETE RESTRICT,
	CONSTRAINT session_timetable_files_file_fk FOREIGN KEY (file_id, school_id) REFERENCES stored_files (id, school_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX session_timetable_files_school_idx ON session_timetable_files (school_id, session_id);
--> statement-breakpoint
ALTER TABLE session_timetable_files ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE session_timetable_files FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY session_timetable_files_select ON session_timetable_files FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY session_timetable_files_insert ON session_timetable_files FOR INSERT TO erp_app
	WITH CHECK (
		app.has_any_permission(school_id, ARRAY['timetables.manage', 'classes.manage', 'school.records.manage'])
	);
--> statement-breakpoint
GRANT SELECT, INSERT ON session_timetable_files TO erp_app;
