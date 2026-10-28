CREATE TABLE "academic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_sessions_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "academic_sessions_name_uidx" UNIQUE("school_id","name"),
	CONSTRAINT "academic_sessions_status_chk" CHECK ("academic_sessions"."status" in ('planned', 'active', 'closed')),
	CONSTRAINT "academic_sessions_dates_chk" CHECK ("academic_sessions"."end_date" >= "academic_sessions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grade_level" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "classes_name_uidx" UNIQUE("school_id","session_id","name"),
	CONSTRAINT "classes_grade_chk" CHECK ("classes"."grade_level" between 0 and 20)
);
--> statement-breakpoint
CREATE TABLE "guardian_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"guardian_user_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_students_pair_uidx" UNIQUE("guardian_user_id","student_id"),
	CONSTRAINT "guardian_students_relationship_chk" CHECK ("guardian_students"."relationship" in ('mother', 'father', 'guardian', 'other'))
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sections_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "sections_name_uidx" UNIQUE("class_id","name")
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"roll_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_enrollments_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "student_enrollments_session_uidx" UNIQUE("student_id","session_id"),
	CONSTRAINT "student_enrollments_status_chk" CHECK ("student_enrollments"."status" in ('active', 'completed', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"admission_no" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date,
	"status" text DEFAULT 'active' NOT NULL,
	"current_section_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "students_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "students_status_chk" CHECK ("students"."status" in ('active', 'withdrawn', 'alumni'))
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "subjects_code_uidx" UNIQUE("school_id","code")
);
--> statement-breakpoint
CREATE TABLE "teacher_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_assignments_uidx" UNIQUE("school_id","session_id","section_id","subject_id","teacher_user_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"status" text NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_records_day_uidx" UNIQUE("student_id","attendance_date"),
	CONSTRAINT "attendance_records_status_chk" CHECK ("attendance_records"."status" in ('present', 'absent', 'late', 'excused'))
);
--> statement-breakpoint
CREATE TABLE "exam_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"room" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_schedules_slot_uidx" UNIQUE("exam_id","subject_id","section_id"),
	CONSTRAINT "exam_schedules_time_chk" CHECK ("exam_schedules"."ends_at" > "exam_schedules"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exams_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "exams_name_uidx" UNIQUE("school_id","session_id","name"),
	CONSTRAINT "exams_status_chk" CHECK ("exams"."status" in ('draft', 'scheduled', 'published', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "grading_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_percent" numeric(5, 2) NOT NULL,
	"max_percent" numeric(5, 2) NOT NULL,
	"grade" text NOT NULL,
	"grade_point" numeric(4, 2) NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grading_rules_band_uidx" UNIQUE("school_id","session_id","grade"),
	CONSTRAINT "grading_rules_range_chk" CHECK ("grading_rules"."min_percent" >= 0 and "grading_rules"."max_percent" <= 100),
	CONSTRAINT "grading_rules_order_chk" CHECK ("grading_rules"."min_percent" < "grading_rules"."max_percent")
);
--> statement-breakpoint
CREATE TABLE "leave_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_applications_dates_chk" CHECK ("leave_applications"."end_date" >= "leave_applications"."start_date"),
	CONSTRAINT "leave_applications_status_chk" CHECK ("leave_applications"."status" in ('pending', 'approved', 'rejected', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"marks_obtained" integer NOT NULL,
	"max_marks" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marks_entry_uidx" UNIQUE("exam_id","student_id","subject_id"),
	CONSTRAINT "marks_range_chk" CHECK ("marks"."max_marks" > 0 and "marks"."marks_obtained" >= 0),
	CONSTRAINT "marks_cap_chk" CHECK ("marks"."marks_obtained" <= "marks"."max_marks")
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_marks" integer,
	"max_marks" integer,
	"percentage" numeric(5, 2),
	"grade" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_cards_exam_student_uidx" UNIQUE("exam_id","student_id"),
	CONSTRAINT "report_cards_status_chk" CHECK ("report_cards"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "stored_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"purpose" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "stored_files_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "stored_files_key_uidx" UNIQUE("storage_key"),
	CONSTRAINT "stored_files_size_chk" CHECK ("stored_files"."byte_size" >= 0),
	CONSTRAINT "stored_files_purpose_chk" CHECK ("stored_files"."purpose" in ('complaint_voice', 'complaint_photo', 'note', 'assignment', 'document', 'other'))
);
--> statement-breakpoint
CREATE TABLE "fee_concessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"fee_structure_id" uuid,
	"kind" text NOT NULL,
	"amount_paise" integer,
	"percent" numeric(5, 2),
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_concessions_kind_chk" CHECK ("fee_concessions"."kind" in ('amount', 'percent')),
	CONSTRAINT "fee_concessions_value_chk" CHECK ((
				("fee_concessions"."kind" = 'amount' and "fee_concessions"."amount_paise" is not null and "fee_concessions"."amount_paise" >= 0 and "fee_concessions"."percent" is null)
				or ("fee_concessions"."kind" = 'percent' and "fee_concessions"."percent" is not null and "fee_concessions"."percent" >= 0 and "fee_concessions"."percent" <= 100 and "fee_concessions"."amount_paise" is null)
			))
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"late_fee_paise" integer DEFAULT 0 NOT NULL,
	"late_fee_grace_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_structures_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "fee_structures_name_uidx" UNIQUE("school_id","session_id","name"),
	CONSTRAINT "fee_structures_amount_chk" CHECK ("fee_structures"."amount_paise" >= 0 and "fee_structures"."late_fee_paise" >= 0),
	CONSTRAINT "fee_structures_grace_chk" CHECK ("fee_structures"."late_fee_grace_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"fee_structure_id" uuid NOT NULL,
	"period_label" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"concession_paise" integer DEFAULT 0 NOT NULL,
	"late_fee_paise" integer DEFAULT 0 NOT NULL,
	"amount_paid_paise" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "invoices_period_uidx" UNIQUE("school_id","student_id","fee_structure_id","period_label"),
	CONSTRAINT "invoices_amount_chk" CHECK ("invoices"."amount_paise" >= 0 and "invoices"."concession_paise" >= 0 and "invoices"."late_fee_paise" >= 0 and "invoices"."amount_paid_paise" >= 0),
	CONSTRAINT "invoices_status_chk" CHECK ("invoices"."status" in ('draft', 'issued', 'partially_paid', 'paid', 'void'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"amount_paise" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_reference" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_chk" CHECK ("payments"."amount_paise" > 0),
	CONSTRAINT "payments_status_chk" CHECK ("payments"."status" in ('pending', 'succeeded', 'failed')),
	CONSTRAINT "payments_provider_chk" CHECK ("payments"."provider" in ('manual', 'cashfree'))
);
--> statement-breakpoint
CREATE TABLE "assignment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"file_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_submissions_once_uidx" UNIQUE("assignment_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone,
	"max_marks" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "assignments_marks_chk" CHECK ("assignments"."max_marks" is null or "assignments"."max_marks" > 0)
);
--> statement-breakpoint
CREATE TABLE "course_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_materials_kind_chk" CHECK ("course_materials"."kind" in ('note', 'pdf'))
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"subject_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "courses_status_chk" CHECK ("courses"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "complaint_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"complaint_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_attachments_kind_chk" CHECK ("complaint_attachments"."kind" in ('voice', 'photo'))
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"raised_by" uuid NOT NULL,
	"student_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "complaints_status_chk" CHECK ("complaints"."status" in ('open', 'in_review', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"doc_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_requests_status_chk" CHECK ("document_requests"."status" in ('pending', 'ready', 'rejected', 'collected'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"email" text,
	"phone" text,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "invitations_status_chk" CHECK ("invitations"."status" in ('pending', 'accepted', 'revoked', 'expired')),
	CONSTRAINT "invitations_contact_chk" CHECK ("invitations"."email" is not null or "invitations"."phone" is not null)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"scope" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key"),
	CONSTRAINT "roles_scope_chk" CHECK ("roles"."scope" in ('platform', 'school'))
);
--> statement-breakpoint
CREATE TABLE "school_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "school_memberships_status_chk" CHECK ("school_memberships"."status" in ('invited', 'active', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE "school_settings" (
	"school_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"late_fee_grace_days" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_settings_grace_chk" CHECK ("school_settings"."late_fee_grace_days" >= 0),
	CONSTRAINT "school_settings_currency_chk" CHECK (char_length("school_settings"."currency") = 3)
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schools_status_chk" CHECK ("schools"."status" in ('active', 'suspended', 'archived')),
	CONSTRAINT "schools_code_lower_chk" CHECK ("schools"."code" = lower("schools"."code"))
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"school_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text,
	"full_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_status_chk" CHECK ("users"."status" in ('active', 'disabled')),
	CONSTRAINT "users_contact_chk" CHECK ("users"."email" is not null or "users"."phone" is not null)
);
--> statement-breakpoint
CREATE TABLE "timetable_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"timetable_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"period_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_user_id" uuid,
	"room" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_entries_slot_uidx" UNIQUE("timetable_id","weekday","period_id"),
	CONSTRAINT "timetable_entries_weekday_chk" CHECK ("timetable_entries"."weekday" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "timetable_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"sort_order" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_periods_id_school_uidx" UNIQUE("id","school_id"),
	CONSTRAINT "timetable_periods_order_uidx" UNIQUE("school_id","sort_order"),
	CONSTRAINT "timetable_periods_time_chk" CHECK ("timetable_periods"."end_time" > "timetable_periods"."start_time")
);
--> statement-breakpoint
CREATE TABLE "timetables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetables_id_school_uidx" UNIQUE("id","school_id")
);
--> statement-breakpoint
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_session_school_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_guardian_user_id_users_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_school_fk" FOREIGN KEY ("class_id","school_id") REFERENCES "public"."classes"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "enrollments_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "enrollments_section_school_fk" FOREIGN KEY ("section_id","school_id") REFERENCES "public"."sections"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "enrollments_session_school_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_section_school_fk" FOREIGN KEY ("current_section_id","school_id") REFERENCES "public"."sections"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_section_fk" FOREIGN KEY ("section_id","school_id") REFERENCES "public"."sections"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_fk" FOREIGN KEY ("subject_id","school_id") REFERENCES "public"."subjects"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_session_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_section_school_fk" FOREIGN KEY ("section_id","school_id") REFERENCES "public"."sections"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_exam_fk" FOREIGN KEY ("exam_id","school_id") REFERENCES "public"."exams"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_subject_fk" FOREIGN KEY ("subject_id","school_id") REFERENCES "public"."subjects"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_section_fk" FOREIGN KEY ("section_id","school_id") REFERENCES "public"."sections"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_session_school_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_rules" ADD CONSTRAINT "grading_rules_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_rules" ADD CONSTRAINT "grading_rules_session_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_student_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_exam_school_fk" FOREIGN KEY ("exam_id","school_id") REFERENCES "public"."exams"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_subject_school_fk" FOREIGN KEY ("subject_id","school_id") REFERENCES "public"."subjects"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_exam_fk" FOREIGN KEY ("exam_id","school_id") REFERENCES "public"."exams"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_concessions" ADD CONSTRAINT "fee_concessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_concessions" ADD CONSTRAINT "fee_concessions_student_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_concessions" ADD CONSTRAINT "fee_concessions_structure_fk" FOREIGN KEY ("fee_structure_id","school_id") REFERENCES "public"."fee_structures"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_session_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_structure_school_fk" FOREIGN KEY ("fee_structure_id","school_id") REFERENCES "public"."fee_structures"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_school_fk" FOREIGN KEY ("invoice_id","school_id") REFERENCES "public"."invoices"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "submissions_assignment_fk" FOREIGN KEY ("assignment_id","school_id") REFERENCES "public"."assignments"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "submissions_student_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "submissions_file_fk" FOREIGN KEY ("file_id","school_id") REFERENCES "public"."stored_files"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_fk" FOREIGN KEY ("course_id","school_id") REFERENCES "public"."courses"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_course_fk" FOREIGN KEY ("course_id","school_id") REFERENCES "public"."courses"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_file_fk" FOREIGN KEY ("file_id","school_id") REFERENCES "public"."stored_files"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_subject_school_fk" FOREIGN KEY ("subject_id","school_id") REFERENCES "public"."subjects"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaint_fk" FOREIGN KEY ("complaint_id","school_id") REFERENCES "public"."complaints"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_file_fk" FOREIGN KEY ("file_id","school_id") REFERENCES "public"."stored_files"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_student_school_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_student_fk" FOREIGN KEY ("student_id","school_id") REFERENCES "public"."students"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_timetable_fk" FOREIGN KEY ("timetable_id","school_id") REFERENCES "public"."timetables"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_period_fk" FOREIGN KEY ("period_id","school_id") REFERENCES "public"."timetable_periods"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_subject_fk" FOREIGN KEY ("subject_id","school_id") REFERENCES "public"."subjects"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_section_school_fk" FOREIGN KEY ("section_id","school_id") REFERENCES "public"."sections"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_session_school_fk" FOREIGN KEY ("session_id","school_id") REFERENCES "public"."academic_sessions"("id","school_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_sessions_one_active_uidx" ON "academic_sessions" USING btree ("school_id") WHERE "academic_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "academic_sessions_school_idx" ON "academic_sessions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "classes_school_idx" ON "classes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "guardian_students_school_idx" ON "guardian_students" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "guardian_students_guardian_idx" ON "guardian_students" USING btree ("guardian_user_id");--> statement-breakpoint
CREATE INDEX "sections_school_idx" ON "sections" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "student_enrollments_school_idx" ON "student_enrollments" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_admission_active_uidx" ON "students" USING btree ("school_id","admission_no") WHERE "students"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "students_school_section_idx" ON "students" USING btree ("school_id","current_section_id");--> statement-breakpoint
CREATE INDEX "subjects_school_idx" ON "subjects" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_school_idx" ON "teacher_assignments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_teacher_idx" ON "teacher_assignments" USING btree ("teacher_user_id");--> statement-breakpoint
CREATE INDEX "attendance_records_school_date_idx" ON "attendance_records" USING btree ("school_id","attendance_date");--> statement-breakpoint
CREATE INDEX "exam_schedules_school_idx" ON "exam_schedules" USING btree ("school_id","starts_at");--> statement-breakpoint
CREATE INDEX "exams_school_idx" ON "exams" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "grading_rules_school_idx" ON "grading_rules" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "leave_applications_school_idx" ON "leave_applications" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "marks_school_exam_idx" ON "marks" USING btree ("school_id","exam_id");--> statement-breakpoint
CREATE INDEX "report_cards_school_idx" ON "report_cards" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "stored_files_school_idx" ON "stored_files" USING btree ("school_id","purpose");--> statement-breakpoint
CREATE INDEX "fee_concessions_school_student_idx" ON "fee_concessions" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE INDEX "fee_structures_school_idx" ON "fee_structures" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "invoices_school_status_idx" ON "invoices" USING btree ("school_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_uidx" ON "payments" USING btree ("provider","provider_reference") WHERE "payments"."provider_reference" is not null;--> statement-breakpoint
CREATE INDEX "payments_school_invoice_idx" ON "payments" USING btree ("school_id","invoice_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_school_idx" ON "assignment_submissions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "assignments_school_course_idx" ON "assignments" USING btree ("school_id","course_id");--> statement-breakpoint
CREATE INDEX "course_materials_school_course_idx" ON "course_materials" USING btree ("school_id","course_id");--> statement-breakpoint
CREATE INDEX "courses_school_idx" ON "courses" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "complaint_attachments_school_idx" ON "complaint_attachments" USING btree ("school_id","complaint_id");--> statement-breakpoint
CREATE INDEX "complaints_school_status_idx" ON "complaints" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "document_requests_school_idx" ON "document_requests" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("school_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_school_created_idx" ON "audit_events" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE INDEX "invitations_school_idx" ON "invitations" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_memberships_active_uidx" ON "school_memberships" USING btree ("school_id","user_id","role_id") WHERE "school_memberships"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "school_memberships_user_idx" ON "school_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "school_memberships_school_idx" ON "school_memberships" USING btree ("school_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_code_active_uidx" ON "schools" USING btree ("code") WHERE "schools"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_active_uidx" ON "users" USING btree ("email") WHERE "users"."deleted_at" is null and "users"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_active_uidx" ON "users" USING btree ("phone") WHERE "users"."deleted_at" is null and "users"."phone" is not null;--> statement-breakpoint
CREATE INDEX "timetable_entries_school_idx" ON "timetable_entries" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "timetable_periods_school_idx" ON "timetable_periods" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "timetables_school_section_idx" ON "timetables" USING btree ("school_id","section_id");