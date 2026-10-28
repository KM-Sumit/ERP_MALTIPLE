CREATE OR REPLACE FUNCTION app.set_school_subscription(p_school uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
	IF NOT app.is_platform_admin() THEN
		RAISE EXCEPTION 'platform access denied' USING ERRCODE = '42501';
	END IF;
	IF p_status NOT IN ('paid', 'unpaid') THEN
		RAISE EXCEPTION 'bill status is invalid' USING ERRCODE = '23514';
	END IF;
	UPDATE public.school_settings
	SET subscription_status = p_status
	WHERE school_id = p_school;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'school is not available' USING ERRCODE = '42501';
	END IF;
END
$fn$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.set_school_subscription(uuid, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.set_school_subscription(uuid, text) TO erp_app;
