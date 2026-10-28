# Backup and recovery

Use `pg_dump` from the same PostgreSQL major version as the server. The application does not run backups itself. `BACKUP_DIR` in `.env.example` is documentation only.

## Backup

```sh
pg_dump --format=custom --no-owner --file=school_erp.dump \
  "postgres://backup_user@127.0.0.1:5432/school_erp"
```

Use a role that can read every table. `erp_app` cannot, because row-level security hides rows when no school user is set. Store the dump and a copy of `FILE_STORAGE_PATH` together. The database rows point at files by key `schools/{schoolId}/files/{fileId}`.

## Restore

Restore into an empty database, not over a live one.

```sh
createdb school_erp_restore
pg_restore --no-owner --dbname=school_erp_restore school_erp.dump
```

Point a staging `DATABASE_URL` at `erp_app` on that database and open `/health`, then a school login. Copy the matching upload directory before expecting complaint attachments to download.

A restore drill against a throwaway local database is part of the phase 10 check when PostgreSQL is available. It does not replace a drill on the host that will take production traffic.

## After a bad migration

Stop the app. Restore the dump taken before `npm run db:migrate`. Start the previous build. Migrations `0000` through `0009` commit as a whole file. There is no automatic down script.

## Retention

Keep at least one dump from before the latest migration and the daily dumps your host retains. Deleting a school in the product is a status change to archived, not a wipe of its rows. Account recovery is a password reset by an administrator who can deliver the invitation or reset link manually, because email is not sent.
