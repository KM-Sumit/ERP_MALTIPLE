ALTER TABLE school_settings
	ADD COLUMN subscription_status text NOT NULL DEFAULT 'unpaid';
--> statement-breakpoint
ALTER TABLE school_settings
	ADD CONSTRAINT school_settings_subscription_chk CHECK (subscription_status IN ('paid', 'unpaid'));
