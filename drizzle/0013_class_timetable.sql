ALTER TABLE session_timetable_files ADD COLUMN class_id uuid;
--> statement-breakpoint
ALTER TABLE session_timetable_files
	ADD CONSTRAINT session_timetable_files_class_fk
	FOREIGN KEY (class_id, school_id) REFERENCES classes (id, school_id) ON DELETE RESTRICT;
