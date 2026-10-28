ALTER TABLE school_settings
	ADD COLUMN working_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
	ADD COLUMN day_start time NOT NULL DEFAULT '08:00',
	ADD COLUMN day_end time NOT NULL DEFAULT '15:00',
	ADD COLUMN absent_counts_as_zero boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE school_settings
	ADD CONSTRAINT school_settings_days_chk CHECK (
		cardinality(working_days) > 0
		AND working_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
	),
	ADD CONSTRAINT school_settings_hours_chk CHECK (day_end > day_start);
--> statement-breakpoint
ALTER TABLE timetable_periods
	ADD COLUMN kind text NOT NULL DEFAULT 'teaching';
--> statement-breakpoint
ALTER TABLE timetable_periods
	ADD CONSTRAINT timetable_periods_kind_chk CHECK (kind IN ('teaching', 'break'));
--> statement-breakpoint
ALTER TABLE timetables
	ADD COLUMN status text NOT NULL DEFAULT 'draft',
	ADD COLUMN revision integer NOT NULL DEFAULT 1,
	ADD COLUMN lock_version integer NOT NULL DEFAULT 1,
	ADD COLUMN published_at timestamptz;
--> statement-breakpoint
ALTER TABLE timetables
	ADD CONSTRAINT timetables_status_chk CHECK (status IN ('draft', 'published')),
	ADD CONSTRAINT timetables_revision_chk CHECK (revision > 0 AND lock_version > 0);
--> statement-breakpoint
CREATE UNIQUE INDEX timetables_section_session_uidx ON timetables (school_id, section_id, session_id);
--> statement-breakpoint
CREATE TABLE classrooms (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	name text NOT NULL,
	capacity integer,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT classrooms_id_school_uidx UNIQUE (id, school_id),
	CONSTRAINT classrooms_name_uidx UNIQUE (school_id, name),
	CONSTRAINT classrooms_capacity_chk CHECK (capacity IS NULL OR capacity > 0)
);
--> statement-breakpoint
ALTER TABLE classrooms ADD CONSTRAINT classrooms_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE timetable_entries ADD COLUMN classroom_id uuid;
--> statement-breakpoint
ALTER TABLE timetable_entries ADD CONSTRAINT timetable_entries_classroom_fk FOREIGN KEY (classroom_id, school_id) REFERENCES classrooms(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE class_teachers (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	section_id uuid NOT NULL,
	session_id uuid NOT NULL,
	teacher_user_id uuid NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT class_teachers_id_school_uidx UNIQUE (id, school_id),
	CONSTRAINT class_teachers_section_uidx UNIQUE (section_id, session_id)
);
--> statement-breakpoint
ALTER TABLE class_teachers ADD CONSTRAINT class_teachers_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE class_teachers ADD CONSTRAINT class_teachers_teacher_user_id_users_id_fk FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE class_teachers ADD CONSTRAINT class_teachers_section_fk FOREIGN KEY (section_id, school_id) REFERENCES sections(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE class_teachers ADD CONSTRAINT class_teachers_session_fk FOREIGN KEY (session_id, school_id) REFERENCES academic_sessions(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE teacher_qualifications (
	school_id uuid NOT NULL,
	teacher_user_id uuid NOT NULL,
	subject_id uuid NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT teacher_qualifications_pk PRIMARY KEY (school_id, teacher_user_id, subject_id)
);
--> statement-breakpoint
ALTER TABLE teacher_qualifications ADD CONSTRAINT teacher_qualifications_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE teacher_qualifications ADD CONSTRAINT teacher_qualifications_teacher_user_id_users_id_fk FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE teacher_qualifications ADD CONSTRAINT teacher_qualifications_subject_fk FOREIGN KEY (subject_id, school_id) REFERENCES subjects(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE timetable_revisions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	timetable_id uuid NOT NULL,
	revision integer NOT NULL,
	snapshot jsonb NOT NULL,
	created_by uuid NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT timetable_revisions_uidx UNIQUE (timetable_id, revision)
);
--> statement-breakpoint
ALTER TABLE timetable_revisions ADD CONSTRAINT timetable_revisions_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE timetable_revisions ADD CONSTRAINT timetable_revisions_timetable_fk FOREIGN KEY (timetable_id, school_id) REFERENCES timetables(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE timetable_revisions ADD CONSTRAINT timetable_revisions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE exams ADD COLUMN exam_type text NOT NULL DEFAULT 'custom';
--> statement-breakpoint
ALTER TABLE exams ADD COLUMN instructions text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE exams ADD COLUMN max_marks integer;
--> statement-breakpoint
ALTER TABLE exams ADD COLUMN passing_marks integer;
--> statement-breakpoint
ALTER TABLE exams ADD COLUMN duration_minutes integer;
--> statement-breakpoint
ALTER TABLE exams DROP CONSTRAINT exams_status_chk;
--> statement-breakpoint
ALTER TABLE exams
	ADD CONSTRAINT exams_status_chk CHECK (status IN ('draft', 'scheduled', 'published', 'completed', 'cancelled')),
	ADD CONSTRAINT exams_type_chk CHECK (exam_type IN ('unit', 'monthly', 'half_yearly', 'annual', 'practical', 'custom')),
	ADD CONSTRAINT exams_marks_chk CHECK (
		(max_marks IS NULL OR max_marks > 0)
		AND (passing_marks IS NULL OR (max_marks IS NOT NULL AND passing_marks >= 0 AND passing_marks <= max_marks))
		AND (duration_minutes IS NULL OR duration_minutes > 0)
	);
--> statement-breakpoint
ALTER TABLE exam_schedules ADD COLUMN invigilator_user_id uuid;
--> statement-breakpoint
ALTER TABLE exam_schedules ADD COLUMN seating_plan text;
--> statement-breakpoint
ALTER TABLE exam_schedules ADD CONSTRAINT exam_schedules_invigilator_fk FOREIGN KEY (invigilator_user_id) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE marks ALTER COLUMN marks_obtained DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE marks DROP CONSTRAINT marks_range_chk;
--> statement-breakpoint
ALTER TABLE marks DROP CONSTRAINT marks_cap_chk;
--> statement-breakpoint
ALTER TABLE marks
	ADD COLUMN outcome text NOT NULL DEFAULT 'scored',
	ADD COLUMN workflow text NOT NULL DEFAULT 'draft',
	ADD COLUMN theory_obtained integer,
	ADD COLUMN theory_max integer,
	ADD COLUMN practical_obtained integer,
	ADD COLUMN practical_max integer,
	ADD COLUMN internal_obtained integer,
	ADD COLUMN internal_max integer,
	ADD COLUMN remark text;
--> statement-breakpoint
ALTER TABLE marks
	ADD CONSTRAINT marks_outcome_chk CHECK (
		(
			outcome = 'scored'
			AND marks_obtained IS NOT NULL
			AND max_marks > 0
			AND marks_obtained >= 0
			AND marks_obtained <= max_marks
		)
		OR (
			outcome IN ('absent', 'exempt', 'not_assessed')
			AND marks_obtained IS NULL
			AND max_marks > 0
		)
	),
	ADD CONSTRAINT marks_workflow_chk CHECK (workflow IN ('draft', 'submitted', 'approved', 'reopened')),
	ADD CONSTRAINT marks_theory_chk CHECK (
		(theory_max IS NULL AND theory_obtained IS NULL)
		OR (theory_max > 0 AND theory_obtained IS NOT NULL AND theory_obtained >= 0 AND theory_obtained <= theory_max)
	),
	ADD CONSTRAINT marks_practical_chk CHECK (
		(practical_max IS NULL AND practical_obtained IS NULL)
		OR (practical_max > 0 AND practical_obtained IS NOT NULL AND practical_obtained >= 0 AND practical_obtained <= practical_max)
	),
	ADD CONSTRAINT marks_internal_chk CHECK (
		(internal_max IS NULL AND internal_obtained IS NULL)
		OR (internal_max > 0 AND internal_obtained IS NOT NULL AND internal_obtained >= 0 AND internal_obtained <= internal_max)
	);
--> statement-breakpoint
ALTER TABLE report_cards DROP CONSTRAINT report_cards_status_chk;
--> statement-breakpoint
ALTER TABLE report_cards
	ADD COLUMN remarks text,
	ADD COLUMN revision integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE report_cards
	ADD CONSTRAINT report_cards_status_chk CHECK (status IN ('draft', 'approved', 'published', 'revised')),
	ADD CONSTRAINT report_cards_revision_chk CHECK (revision > 0);
--> statement-breakpoint
ALTER TABLE attendance_records ADD COLUMN workflow text NOT NULL DEFAULT 'submitted';
--> statement-breakpoint
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_workflow_chk CHECK (workflow IN ('draft', 'submitted'));
--> statement-breakpoint
CREATE TABLE attendance_audit (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	attendance_id uuid NOT NULL,
	actor_user_id uuid,
	previous_status text NOT NULL,
	next_status text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE attendance_audit ADD CONSTRAINT attendance_audit_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE attendance_audit ADD CONSTRAINT attendance_audit_attendance_fk FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE attendance_corrections (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	attendance_id uuid NOT NULL,
	requested_by uuid NOT NULL,
	note text NOT NULL,
	status text NOT NULL DEFAULT 'pending',
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT attendance_corrections_status_chk CHECK (status IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE attendance_corrections ADD CONSTRAINT attendance_corrections_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE attendance_corrections ADD CONSTRAINT attendance_corrections_attendance_fk FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE attendance_corrections ADD CONSTRAINT attendance_corrections_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE courses ADD COLUMN section_id uuid;
--> statement-breakpoint
ALTER TABLE courses ADD CONSTRAINT courses_section_fk FOREIGN KEY (section_id, school_id) REFERENCES sections(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE assignments ADD COLUMN instructions text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE assignments ADD COLUMN status text NOT NULL DEFAULT 'published';
--> statement-breakpoint
ALTER TABLE assignments ADD CONSTRAINT assignments_status_chk CHECK (status IN ('draft', 'published'));
--> statement-breakpoint
CREATE TABLE staff_leave (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	user_id uuid NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	reason text NOT NULL,
	status text NOT NULL DEFAULT 'pending',
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT staff_leave_dates_chk CHECK (end_date >= start_date),
	CONSTRAINT staff_leave_status_chk CHECK (status IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE staff_leave ADD CONSTRAINT staff_leave_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE staff_leave ADD CONSTRAINT staff_leave_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE meeting_requests (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	teacher_user_id uuid NOT NULL,
	student_id uuid NOT NULL,
	note text NOT NULL,
	status text NOT NULL DEFAULT 'pending',
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT meeting_requests_status_chk CHECK (status IN ('pending', 'accepted', 'declined'))
);
--> statement-breakpoint
ALTER TABLE meeting_requests ADD CONSTRAINT meeting_requests_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE meeting_requests ADD CONSTRAINT meeting_requests_teacher_user_id_users_id_fk FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE meeting_requests ADD CONSTRAINT meeting_requests_student_fk FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE notification_preferences (
	school_id uuid NOT NULL,
	user_id uuid NOT NULL,
	kind text NOT NULL,
	enabled boolean NOT NULL DEFAULT true,
	CONSTRAINT notification_preferences_pk PRIMARY KEY (school_id, user_id, kind),
	CONSTRAINT notification_preferences_kind_chk CHECK (kind IN ('timetable', 'exam', 'results', 'attendance', 'notice'))
);
--> statement-breakpoint
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade ON UPDATE no action;
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
		('exam', 'published', 'completed'),
		('exam', 'published', 'cancelled'),
		('report_card', 'draft', 'approved'),
		('report_card', 'draft', 'published'),
		('report_card', 'approved', 'published'),
		('report_card', 'published', 'revised'),
		('report_card', 'revised', 'published'),
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
CREATE OR REPLACE FUNCTION app.guard_attendance_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF TG_OP = 'UPDATE'
		AND OLD.workflow = 'submitted'
		AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.workflow IS DISTINCT FROM OLD.workflow)
	THEN
		IF NOT app.has_permission(OLD.school_id, 'school.records.manage') THEN
			RAISE EXCEPTION 'finalized attendance cannot be edited' USING ERRCODE = '42501';
		END IF;
		INSERT INTO public.attendance_audit (school_id, attendance_id, actor_user_id, previous_status, next_status)
		VALUES (OLD.school_id, OLD.id, app.current_user_id(), OLD.status, NEW.status);
	END IF;
	RETURN NEW;
END
$fn$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS attendance_guard_edit ON attendance_records;
--> statement-breakpoint
CREATE TRIGGER attendance_guard_edit
	BEFORE UPDATE ON attendance_records
	FOR EACH ROW
	EXECUTE FUNCTION app.guard_attendance_edit();
--> statement-breakpoint
DROP POLICY IF EXISTS timetables_select ON timetables;
--> statement-breakpoint
CREATE POLICY timetables_select ON timetables FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage'])
		OR (
			status = 'published'
			AND app.can_access_school(school_id)
			AND (
				EXISTS (
					SELECT 1 FROM teacher_assignments ta
					WHERE ta.school_id = timetables.school_id
						AND ta.section_id = timetables.section_id
						AND ta.session_id = timetables.session_id
						AND ta.teacher_user_id = app.current_user_id()
				)
				OR EXISTS (
					SELECT 1 FROM timetable_entries te
					WHERE te.timetable_id = timetables.id AND te.teacher_user_id = app.current_user_id()
				)
				OR EXISTS (
					SELECT 1
					FROM student_enrollments e
					JOIN guardian_students g
						ON g.school_id = e.school_id AND g.student_id = e.student_id
					WHERE e.school_id = timetables.school_id
						AND e.section_id = timetables.section_id
						AND e.session_id = timetables.session_id
						AND e.status = 'active'
						AND g.guardian_user_id = app.current_user_id()
				)
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS timetable_entries_select ON timetable_entries;
--> statement-breakpoint
CREATE POLICY timetable_entries_select ON timetable_entries FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage'])
		OR EXISTS (
			SELECT 1 FROM timetables t
			WHERE t.id = timetable_entries.timetable_id
				AND t.school_id = timetable_entries.school_id
				AND t.status = 'published'
				AND app.can_access_school(t.school_id)
				AND (
					timetable_entries.teacher_user_id = app.current_user_id()
					OR EXISTS (
						SELECT 1 FROM teacher_assignments ta
						WHERE ta.school_id = t.school_id
							AND ta.section_id = t.section_id
							AND ta.session_id = t.session_id
							AND ta.teacher_user_id = app.current_user_id()
					)
					OR EXISTS (
						SELECT 1
						FROM student_enrollments e
						JOIN guardian_students g
							ON g.school_id = e.school_id AND g.student_id = e.student_id
						WHERE e.school_id = t.school_id
							AND e.section_id = t.section_id
							AND e.session_id = t.session_id
							AND e.status = 'active'
							AND g.guardian_user_id = app.current_user_id()
					)
				)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS exams_select ON exams;
--> statement-breakpoint
CREATE POLICY exams_select ON exams FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'exams.manage', 'results.publish', 'marks.submit'])
		OR (
			status IN ('scheduled', 'published', 'completed')
			AND app.can_access_school(school_id)
			AND EXISTS (
				SELECT 1
				FROM exam_schedules s
				WHERE s.exam_id = exams.id
					AND s.school_id = exams.school_id
					AND (
						s.invigilator_user_id = app.current_user_id()
						OR EXISTS (
							SELECT 1 FROM teacher_assignments ta
							WHERE ta.school_id = s.school_id
								AND ta.section_id = s.section_id
								AND ta.subject_id = s.subject_id
								AND ta.teacher_user_id = app.current_user_id()
						)
						OR EXISTS (
							SELECT 1
							FROM student_enrollments e
							JOIN guardian_students g
								ON g.school_id = e.school_id AND g.student_id = e.student_id
							WHERE e.school_id = s.school_id
								AND e.section_id = s.section_id
								AND e.status = 'active'
								AND g.guardian_user_id = app.current_user_id()
						)
					)
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS exam_schedules_select ON exam_schedules;
--> statement-breakpoint
CREATE POLICY exam_schedules_select ON exam_schedules FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'exams.manage', 'results.publish', 'marks.submit'])
		OR (
			app.can_access_school(school_id)
			AND EXISTS (
				SELECT 1 FROM exams e
				WHERE e.id = exam_schedules.exam_id
					AND e.school_id = exam_schedules.school_id
					AND e.status IN ('scheduled', 'published', 'completed')
			)
			AND (
				invigilator_user_id = app.current_user_id()
				OR EXISTS (
					SELECT 1 FROM teacher_assignments ta
					WHERE ta.school_id = exam_schedules.school_id
						AND ta.section_id = exam_schedules.section_id
						AND ta.subject_id = exam_schedules.subject_id
						AND ta.teacher_user_id = app.current_user_id()
				)
				OR EXISTS (
					SELECT 1
					FROM student_enrollments e
					JOIN guardian_students g
						ON g.school_id = e.school_id AND g.student_id = e.student_id
					WHERE e.school_id = exam_schedules.school_id
						AND e.section_id = exam_schedules.section_id
						AND e.status = 'active'
						AND g.guardian_user_id = app.current_user_id()
				)
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS marks_select ON marks;
--> statement-breakpoint
CREATE POLICY marks_select ON marks FOR SELECT TO erp_app
	USING (
		(
			app.has_any_permission(school_id, ARRAY['school.records.manage', 'marks.submit', 'results.publish'])
			AND app.can_read_student(school_id, student_id)
		)
		OR (
			workflow = 'approved'
			AND EXISTS (
				SELECT 1 FROM exams e
				WHERE e.id = marks.exam_id
					AND e.school_id = marks.school_id
					AND e.status IN ('published', 'completed')
			)
			AND EXISTS (
				SELECT 1 FROM guardian_students g
				WHERE g.school_id = marks.school_id
					AND g.student_id = marks.student_id
					AND g.guardian_user_id = app.current_user_id()
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS report_cards_select ON report_cards;
--> statement-breakpoint
CREATE POLICY report_cards_select ON report_cards FOR SELECT TO erp_app
	USING (
		(
			app.has_any_permission(school_id, ARRAY['school.records.manage', 'results.publish'])
			AND app.can_access_school(school_id)
		)
		OR (
			status IN ('approved', 'published', 'revised')
			AND app.has_permission(school_id, 'marks.submit')
			AND app.can_read_student(school_id, student_id)
		)
		OR (
			status = 'published'
			AND EXISTS (
				SELECT 1 FROM guardian_students g
				WHERE g.school_id = report_cards.school_id
					AND g.student_id = report_cards.student_id
					AND g.guardian_user_id = app.current_user_id()
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS courses_select ON courses;
--> statement-breakpoint
CREATE POLICY courses_select ON courses FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write'])
		OR (
			status = 'published'
			AND section_id IS NOT NULL
			AND app.can_access_school(school_id)
			AND (
				EXISTS (
					SELECT 1 FROM teacher_assignments ta
					WHERE ta.school_id = courses.school_id
						AND ta.section_id = courses.section_id
						AND ta.teacher_user_id = app.current_user_id()
				)
				OR EXISTS (
					SELECT 1
					FROM student_enrollments e
					JOIN guardian_students g
						ON g.school_id = e.school_id AND g.student_id = e.student_id
					WHERE e.school_id = courses.school_id
						AND e.section_id = courses.section_id
						AND e.status = 'active'
						AND g.guardian_user_id = app.current_user_id()
				)
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS assignments_select ON assignments;
--> statement-breakpoint
CREATE POLICY assignments_select ON assignments FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write'])
		OR (
			status = 'published'
			AND EXISTS (
				SELECT 1 FROM courses c
				WHERE c.id = assignments.course_id
					AND c.school_id = assignments.school_id
					AND c.status = 'published'
					AND c.section_id IS NOT NULL
					AND (
						EXISTS (
							SELECT 1 FROM teacher_assignments ta
							WHERE ta.school_id = c.school_id
								AND ta.section_id = c.section_id
								AND ta.teacher_user_id = app.current_user_id()
						)
						OR EXISTS (
							SELECT 1
							FROM student_enrollments e
							JOIN guardian_students g
								ON g.school_id = e.school_id AND g.student_id = e.student_id
							WHERE e.school_id = c.school_id
								AND e.section_id = c.section_id
								AND e.status = 'active'
								AND g.guardian_user_id = app.current_user_id()
						)
					)
			)
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS school_notices_select ON school_notices;
--> statement-breakpoint
CREATE POLICY school_notices_select ON school_notices FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
DROP POLICY IF EXISTS notifications_insert ON notifications;
--> statement-breakpoint
CREATE POLICY notifications_insert ON notifications FOR INSERT TO erp_app
	WITH CHECK (
		app.can_access_school(school_id)
		AND (
			user_id = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY[
				'school.records.manage', 'school.teaching.write', 'timetables.manage', 'exams.manage', 'results.publish'
			])
		)
	);
--> statement-breakpoint
DROP POLICY IF EXISTS complaints_select ON complaints;
--> statement-breakpoint
CREATE POLICY complaints_select ON complaints FOR SELECT TO erp_app
	USING (
		app.can_access_school(school_id)
		AND (
			raised_by = app.current_user_id()
			OR app.has_any_permission(school_id, ARRAY['school.complaints.manage', 'school.records.manage', 'complaints.resolve'])
			OR (
				student_id IS NOT NULL
				AND app.can_read_student(school_id, student_id)
				AND app.has_any_permission(school_id, ARRAY['attendance.mark', 'marks.submit', 'school.teaching.write'])
			)
		)
	);
--> statement-breakpoint
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE classrooms FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY classrooms_select ON classrooms FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY classrooms_mutate ON classrooms FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage']));
--> statement-breakpoint
ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE class_teachers FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY class_teachers_select ON class_teachers FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY class_teachers_mutate ON class_teachers FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.records.manage', 'classes.manage']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'classes.manage']));
--> statement-breakpoint
ALTER TABLE teacher_qualifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE teacher_qualifications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY teacher_qualifications_select ON teacher_qualifications FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY teacher_qualifications_mutate ON teacher_qualifications FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.records.manage', 'classes.manage']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'classes.manage']));
--> statement-breakpoint
ALTER TABLE timetable_revisions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE timetable_revisions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY timetable_revisions_select ON timetable_revisions FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage'])
		OR EXISTS (
			SELECT 1 FROM timetables t
			WHERE t.id = timetable_revisions.timetable_id
				AND t.school_id = timetable_revisions.school_id
				AND t.status = 'published'
				AND app.can_access_school(t.school_id)
		)
	);
--> statement-breakpoint
CREATE POLICY timetable_revisions_insert ON timetable_revisions FOR INSERT TO erp_app
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage']));
--> statement-breakpoint
ALTER TABLE attendance_audit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE attendance_audit FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY attendance_audit_select ON attendance_audit FOR SELECT TO erp_app
	USING (
		app.has_permission(school_id, 'school.records.manage')
		OR app.has_permission(school_id, 'attendance.mark')
	);
--> statement-breakpoint
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE attendance_corrections FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY attendance_corrections_select ON attendance_corrections FOR SELECT TO erp_app
	USING (
		requested_by = app.current_user_id()
		OR app.has_permission(school_id, 'school.records.manage')
	);
--> statement-breakpoint
CREATE POLICY attendance_corrections_insert ON attendance_corrections FOR INSERT TO erp_app
	WITH CHECK (
		requested_by = app.current_user_id()
		AND app.has_permission(school_id, 'attendance.mark')
	);
--> statement-breakpoint
CREATE POLICY attendance_corrections_update ON attendance_corrections FOR UPDATE TO erp_app
	USING (app.has_permission(school_id, 'school.records.manage'))
	WITH CHECK (app.has_permission(school_id, 'school.records.manage'));
--> statement-breakpoint
ALTER TABLE staff_leave ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE staff_leave FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY staff_leave_select ON staff_leave FOR SELECT TO erp_app
	USING (
		user_id = app.current_user_id()
		OR app.has_any_permission(school_id, ARRAY['school.records.manage', 'users.manage'])
	);
--> statement-breakpoint
CREATE POLICY staff_leave_insert ON staff_leave FOR INSERT TO erp_app
	WITH CHECK (user_id = app.current_user_id() AND app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY staff_leave_update ON staff_leave FOR UPDATE TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.records.manage', 'users.manage']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'users.manage']));
--> statement-breakpoint
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE meeting_requests FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY meeting_requests_select ON meeting_requests FOR SELECT TO erp_app
	USING (
		teacher_user_id = app.current_user_id()
		OR app.can_read_student(school_id, student_id)
	);
--> statement-breakpoint
CREATE POLICY meeting_requests_insert ON meeting_requests FOR INSERT TO erp_app
	WITH CHECK (
		teacher_user_id = app.current_user_id()
		AND app.has_permission(school_id, 'school.teaching.write')
		AND app.can_read_student(school_id, student_id)
	);
--> statement-breakpoint
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY notification_preferences_all ON notification_preferences FOR ALL TO erp_app
	USING (user_id = app.current_user_id() AND app.can_access_school(school_id))
	WITH CHECK (user_id = app.current_user_id() AND app.can_access_school(school_id));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.can_read_student(p_school uuid, p_student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT app.has_any_permission(p_school, ARRAY['school.records.manage', 'users.manage', 'results.publish', 'exams.manage'])
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
DROP POLICY IF EXISTS marks_update ON marks;
--> statement-breakpoint
CREATE POLICY marks_update ON marks FOR UPDATE TO erp_app
	USING (
		app.can_read_student(school_id, student_id)
		AND app.has_any_permission(school_id, ARRAY['marks.submit', 'school.teaching.write', 'school.records.manage', 'results.publish'])
	)
	WITH CHECK (
		app.can_read_student(school_id, student_id)
		AND (
			app.has_any_permission(school_id, ARRAY['results.publish', 'school.records.manage'])
			OR (
				app.has_any_permission(school_id, ARRAY['marks.submit', 'school.teaching.write'])
				AND workflow IN ('draft', 'submitted', 'reopened')
			)
		)
	);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON classrooms, class_teachers, teacher_qualifications, timetable_revisions, attendance_corrections, staff_leave, meeting_requests, notification_preferences TO erp_app;
--> statement-breakpoint
GRANT SELECT ON attendance_audit TO erp_app;
