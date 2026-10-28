CREATE OR REPLACE FUNCTION app.exam_results_released(p_exam uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
	SELECT EXISTS (
		SELECT 1 FROM public.exams e
		WHERE e.id = p_exam AND e.status IN ('published', 'completed')
	);
$fn$;
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
			AND app.exam_results_released(exam_id)
			AND EXISTS (
				SELECT 1 FROM public.guardian_students g
				WHERE g.school_id = marks.school_id
					AND g.student_id = marks.student_id
					AND g.guardian_user_id = app.current_user_id()
			)
		)
	);
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.exam_results_released(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.exam_results_released(uuid) TO erp_app;
