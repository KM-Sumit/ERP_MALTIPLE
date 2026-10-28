ALTER TABLE fee_structures
	ADD COLUMN category text NOT NULL DEFAULT 'other',
	ADD COLUMN schedule text NOT NULL DEFAULT 'annual',
	ADD COLUMN class_id uuid,
	ADD COLUMN late_kind text NOT NULL DEFAULT 'fixed',
	ADD COLUMN late_percent numeric(5,2) NOT NULL DEFAULT 0,
	ADD COLUMN late_max_paise integer,
	ADD COLUMN skip_non_working boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE fee_structures
	ADD CONSTRAINT fee_structures_category_chk CHECK (category IN ('tuition', 'admission', 'transport', 'examination', 'other')),
	ADD CONSTRAINT fee_structures_schedule_chk CHECK (schedule IN ('monthly', 'quarterly', 'half_yearly', 'annual')),
	ADD CONSTRAINT fee_structures_late_kind_chk CHECK (late_kind IN ('none', 'fixed', 'per_day', 'percent', 'one_time')),
	ADD CONSTRAINT fee_structures_late_percent_chk CHECK (late_percent >= 0 AND late_percent <= 100),
	ADD CONSTRAINT fee_structures_late_max_chk CHECK (late_max_paise IS NULL OR late_max_paise >= 0);
--> statement-breakpoint
ALTER TABLE fee_structures
	ADD CONSTRAINT fee_structures_class_fk FOREIGN KEY (class_id, school_id) REFERENCES classes(id, school_id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE invoices
	ADD COLUMN waiver_paise integer NOT NULL DEFAULT 0,
	ADD COLUMN policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
	ADD COLUMN created_by uuid;
--> statement-breakpoint
ALTER TABLE invoices
	ADD CONSTRAINT invoices_waiver_chk CHECK (waiver_paise >= 0),
	ADD CONSTRAINT invoices_paid_chk CHECK (amount_paid_paise <= amount_paise - concession_paise + late_fee_paise - waiver_paise);
--> statement-breakpoint
ALTER TABLE invoices
	ADD CONSTRAINT invoices_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE invoice_lines (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	invoice_id uuid NOT NULL,
	label text NOT NULL,
	amount_paise integer NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT invoice_lines_amount_chk CHECK (amount_paise >= 0)
);
--> statement-breakpoint
ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_school_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_invoice_fk FOREIGN KEY (invoice_id, school_id) REFERENCES invoices(id, school_id) ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE refunds (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	payment_id uuid NOT NULL,
	amount_paise integer NOT NULL,
	reason text NOT NULL,
	status text NOT NULL DEFAULT 'succeeded',
	created_by uuid,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT refunds_amount_chk CHECK (amount_paise > 0),
	CONSTRAINT refunds_status_chk CHECK (status IN ('succeeded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE refunds ADD CONSTRAINT refunds_school_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE refunds ADD CONSTRAINT refunds_payment_fk FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE refunds ADD CONSTRAINT refunds_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE payment_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	provider text NOT NULL,
	event_id text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT payment_events_uidx UNIQUE (provider, event_id)
);
--> statement-breakpoint
ALTER TABLE payment_events ADD CONSTRAINT payment_events_school_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE school_holidays (
	school_id uuid NOT NULL,
	holiday_date date NOT NULL,
	name text NOT NULL,
	CONSTRAINT school_holidays_pk PRIMARY KEY (school_id, holiday_date)
);
--> statement-breakpoint
ALTER TABLE school_holidays ADD CONSTRAINT school_holidays_school_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE complaints DROP CONSTRAINT complaints_status_chk;
--> statement-breakpoint
ALTER TABLE complaints
	ADD COLUMN category text NOT NULL DEFAULT 'general',
	ADD COLUMN priority text NOT NULL DEFAULT 'normal',
	ADD COLUMN assignee_user_id uuid,
	ADD COLUMN resolution_note text;
--> statement-breakpoint
ALTER TABLE complaints
	ADD CONSTRAINT complaints_status_chk CHECK (status IN ('open', 'in_review', 'assigned', 'resolved', 'closed')),
	ADD CONSTRAINT complaints_priority_chk CHECK (priority IN ('low', 'normal', 'high'));
--> statement-breakpoint
ALTER TABLE complaints ADD CONSTRAINT complaints_assignee_fk FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE complaint_attachments DROP CONSTRAINT complaint_attachments_kind_chk;
--> statement-breakpoint
ALTER TABLE complaint_attachments
	ADD CONSTRAINT complaint_attachments_kind_chk CHECK (kind IN ('voice', 'photo', 'document'));
--> statement-breakpoint
ALTER TABLE document_requests ADD COLUMN review_note text;
--> statement-breakpoint
ALTER TABLE stored_files DROP CONSTRAINT stored_files_purpose_chk;
--> statement-breakpoint
ALTER TABLE stored_files
	ADD CONSTRAINT stored_files_purpose_chk CHECK (purpose IN ('complaint_voice', 'complaint_photo', 'note', 'assignment', 'document', 'certificate', 'other'));
--> statement-breakpoint
ALTER TABLE course_materials ADD COLUMN external_url text;
--> statement-breakpoint
ALTER TABLE course_materials ADD COLUMN version integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE course_materials DROP CONSTRAINT course_materials_kind_chk;
--> statement-breakpoint
ALTER TABLE course_materials
	ADD CONSTRAINT course_materials_kind_chk CHECK (kind IN ('note', 'pdf', 'video', 'link'));
--> statement-breakpoint
CREATE TABLE chapters (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	course_id uuid NOT NULL,
	title text NOT NULL,
	sort_order integer NOT NULL DEFAULT 1,
	created_at timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE chapters ADD CONSTRAINT chapters_school_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE chapters ADD CONSTRAINT chapters_course_fk FOREIGN KEY (course_id, school_id) REFERENCES courses(id, school_id) ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE document_downloads (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	school_id uuid NOT NULL,
	request_id uuid NOT NULL,
	user_id uuid NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE document_downloads ADD CONSTRAINT document_downloads_school_fk FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE document_downloads ADD CONSTRAINT document_downloads_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE notifications ADD COLUMN event_key text;
--> statement-breakpoint
CREATE UNIQUE INDEX notifications_event_uidx ON notifications (school_id, user_id, event_key) WHERE event_key IS NOT NULL;
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
		('invoice', 'paid', 'partially_paid'),
		('invoice', 'paid', 'issued'),
		('payment', 'pending', 'succeeded'),
		('payment', 'pending', 'failed'),
		('complaint', 'open', 'in_review'),
		('complaint', 'open', 'closed'),
		('complaint', 'in_review', 'assigned'),
		('complaint', 'in_review', 'resolved'),
		('complaint', 'in_review', 'closed'),
		('complaint', 'assigned', 'resolved'),
		('complaint', 'assigned', 'in_review'),
		('complaint', 'resolved', 'in_review'),
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
DROP POLICY IF EXISTS invoices_select ON invoices;
--> statement-breakpoint
CREATE POLICY invoices_select ON invoices FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure', 'payments.record'])
		OR (status <> 'draft' AND app.can_read_student(school_id, student_id))
	);
--> statement-breakpoint
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE invoice_lines FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY invoice_lines_select ON invoice_lines FOR SELECT TO erp_app
	USING (
		app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure', 'payments.record'])
		OR EXISTS (
			SELECT 1 FROM invoices i
			JOIN guardian_students g ON g.school_id = i.school_id AND g.student_id = i.student_id
			WHERE i.id = invoice_lines.invoice_id AND i.school_id = invoice_lines.school_id
				AND i.status <> 'draft' AND g.guardian_user_id = app.current_user_id()
		)
	);
--> statement-breakpoint
CREATE POLICY invoice_lines_write ON invoice_lines FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure']));
--> statement-breakpoint
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE refunds FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY refunds_select ON refunds FOR SELECT TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure', 'payments.record', 'reports.export']));
--> statement-breakpoint
CREATE POLICY refunds_insert ON refunds FOR INSERT TO erp_app
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'payments.record']));
--> statement-breakpoint
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE payment_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY payment_events_all ON payment_events FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'payments.record']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'payments.record']));
--> statement-breakpoint
ALTER TABLE school_holidays ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE school_holidays FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY school_holidays_select ON school_holidays FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY school_holidays_write ON school_holidays FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.fees.manage', 'fees.configure']));
--> statement-breakpoint
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE chapters FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY chapters_select ON chapters FOR SELECT TO erp_app
	USING (app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY chapters_write ON chapters FOR ALL TO erp_app
	USING (app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write', 'classes.manage']))
	WITH CHECK (app.has_any_permission(school_id, ARRAY['school.records.manage', 'school.teaching.write', 'classes.manage']));
--> statement-breakpoint
ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE document_downloads FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY document_downloads_select ON document_downloads FOR SELECT TO erp_app
	USING (user_id = app.current_user_id() OR app.has_any_permission(school_id, ARRAY['documents.approve', 'school.documents.manage']));
--> statement-breakpoint
CREATE POLICY document_downloads_insert ON document_downloads FOR INSERT TO erp_app
	WITH CHECK (user_id = app.current_user_id() AND app.can_access_school(school_id));
--> statement-breakpoint
CREATE POLICY payments_parent_pending ON payments FOR INSERT TO erp_app
	WITH CHECK (
		provider = 'cashfree'
		AND status = 'pending'
		AND app.can_read_student(school_id, student_id)
	);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.settle_gateway_payment(
	p_event text,
	p_order text,
	p_amount integer,
	p_paid boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
	payment public.payments%ROWTYPE;
	invoice public.invoices%ROWTYPE;
	due integer;
	paid integer;
	next_status text;
BEGIN
	SELECT * INTO payment
	FROM public.payments
	WHERE provider = 'cashfree' AND provider_reference = p_order
	FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'unknown payment' USING ERRCODE = '23514';
	END IF;
	BEGIN
		INSERT INTO public.payment_events (school_id, provider, event_id)
		VALUES (payment.school_id, 'cashfree', p_event);
	EXCEPTION WHEN unique_violation THEN
		RETURN 'duplicate';
	END;
	IF payment.amount_paise <> p_amount THEN
		RAISE EXCEPTION 'amount mismatch' USING ERRCODE = '23514';
	END IF;
	IF payment.status = 'succeeded' THEN
		RETURN 'duplicate';
	END IF;
	IF NOT p_paid THEN
		UPDATE public.payments SET status = 'failed', updated_at = now()
		WHERE id = payment.id AND status = 'pending';
		RETURN 'failed';
	END IF;
	SELECT * INTO invoice FROM public.invoices WHERE id = payment.invoice_id FOR UPDATE;
	due := invoice.amount_paise - invoice.concession_paise + invoice.late_fee_paise - invoice.waiver_paise;
	IF payment.amount_paise > due - invoice.amount_paid_paise THEN
		RAISE EXCEPTION 'exceeds balance' USING ERRCODE = '23514';
	END IF;
	paid := invoice.amount_paid_paise + payment.amount_paise;
	next_status := CASE
		WHEN paid <= 0 THEN 'issued'
		WHEN paid < due THEN 'partially_paid'
		ELSE 'paid'
	END;
	UPDATE public.invoices
	SET amount_paid_paise = paid, status = next_status, updated_at = now()
	WHERE id = invoice.id;
	UPDATE public.payments
	SET status = 'succeeded', paid_at = now(), updated_at = now()
	WHERE id = payment.id AND status = 'pending';
	RETURN 'succeeded';
END
$fn$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.settle_gateway_payment(text, text, integer, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.settle_gateway_payment(text, text, integer, boolean) TO erp_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_lines, refunds, payment_events, school_holidays, chapters, document_downloads TO erp_app;
