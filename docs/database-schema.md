# Database schema

PostgreSQL 18. Application code uses Drizzle models in `src/lib/server/db/schema`. Migrations are `drizzle/0000` through `drizzle/0009`. Drizzle applies each migration in one transaction, so `CREATE ROLE` is not part of those files. `scripts/dev-db.sh` creates `erp_app` before migrate.

`erp_app` is `NOSUPERUSER` and `NOBYPASSRLS`. Policies are `ENABLE` and `FORCE`. School access uses `app.current_user_id()` inside the transaction started by `withSchoolUser`. A client-supplied school id is not a tenant switch.

Amounts are integer paise. Invoice status changes and other workflow statuses go through `app.enforce_status_transition`. Child rows that belong to another school-owned row use a foreign key on `(id, school_id)`.

Useful lookup indexes include `invoices (school_id, status)`, `invoices (school_id, student_id)`, `payments (school_id, invoice_id)`, `payments (school_id, student_id)`, `attendance_records (school_id, attendance_date)`, and `complaints (school_id, raised_by)`.

There are no down migrations. Recovery is a restore from backup, described in [backup-and-recovery.md](./backup-and-recovery.md). The table groups are listed in [architecture.md](./architecture.md).
