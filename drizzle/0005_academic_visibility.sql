CREATE OR REPLACE FUNCTION app.exam_is_open(p_exam uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT EXISTS (
		SELECT 1 FROM public.exams e
		WHERE e.id = p_exam AND e.status IN ('scheduled', 'published', 'completed')
	);
$fn$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.published_timetable_for(p_timetable uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT EXISTS (
		SELECT 1 FROM public.timetables t
		WHERE t.id = p_timetable
			AND t.status = 'published'
			AND app.can_access_school(t.school_id)
			AND (
				EXISTS (
					SELECT 1 FROM public.teacher_assignments ta
					WHERE ta.school_id = t.school_id
						AND ta.section_id = t.section_id
						AND ta.session_id = t.session_id
						AND ta.teacher_user_id = p_user
				)
				OR EXISTS (
					SELECT 1 FROM public.timetable_entries te
					WHERE te.timetable_id = t.id AND te.teacher_user_id = p_user
				)
				OR EXISTS (
					SELECT 1
					FROM public.student_enrollments e
					JOIN public.guardian_students g
						ON g.school_id = e.school_id AND g.student_id = e.student_id
					WHERE e.school_id = t.school_id
						AND e.section_id = t.section_id
						AND e.session_id = t.session_id
						AND e.status = 'active'
						AND g.guardian_user_id = p_user
				)
			)
	);
$fn$;
--> statement-breakpoint
DROP POLICY IF EXISTS timetables_select ON timetables;
--> statement-breakpoint
CREATE POLICY timetables_select ON timetables FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage'])
		OR app.published_timetable_for(id, app.current_user_id())
	);
--> statement-breakpoint
DROP POLICY IF EXISTS timetable_entries_select ON timetable_entries;
--> statement-breakpoint
CREATE POLICY timetable_entries_select ON timetable_entries FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.records.manage', 'timetables.manage'])
		OR app.published_timetable_for(timetable_id, app.current_user_id())
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
				SELECT 1 FROM public.exam_schedules s
				WHERE s.exam_id = exams.id
					AND s.school_id = exams.school_id
					AND (
						s.invigilator_user_id = app.current_user_id()
						OR EXISTS (
							SELECT 1 FROM public.teacher_assignments ta
							WHERE ta.school_id = s.school_id
								AND ta.section_id = s.section_id
								AND ta.subject_id = s.subject_id
								AND ta.teacher_user_id = app.current_user_id()
						)
						OR EXISTS (
							SELECT 1
							FROM public.student_enrollments e
							JOIN public.guardian_students g
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
			app.exam_is_open(exam_id)
			AND app.can_access_school(school_id)
			AND (
				invigilator_user_id = app.current_user_id()
				OR EXISTS (
					SELECT 1 FROM public.teacher_assignments ta
					WHERE ta.school_id = exam_schedules.school_id
						AND ta.section_id = exam_schedules.section_id
						AND ta.subject_id = exam_schedules.subject_id
						AND ta.teacher_user_id = app.current_user_id()
				)
				OR EXISTS (
					SELECT 1
					FROM public.student_enrollments e
					JOIN public.guardian_students g
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
REVOKE ALL ON FUNCTION app.exam_is_open(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.published_timetable_for(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.exam_is_open(uuid), app.published_timetable_for(uuid, uuid) TO erp_app;
