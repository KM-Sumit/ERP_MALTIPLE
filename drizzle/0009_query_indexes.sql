CREATE INDEX IF NOT EXISTS invoices_school_student_idx ON invoices (school_id, student_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_school_student_idx ON payments (school_id, student_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS complaints_school_raised_idx ON complaints (school_id, raised_by);
