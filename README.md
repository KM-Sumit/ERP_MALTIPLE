# School ERP

Multi-tenant school platform on SvelteKit, Svelte 5, TypeScript, and PostgreSQL.

Sign in at `/login`. The first Super Admin is created at `/setup`. School setup continues at `/school/setup`. Teachers use `/teach` and parents use `/family`.

Read [docs/architecture.md](docs/architecture.md), [docs/permissions-matrix.md](docs/permissions-matrix.md), [docs/database-schema.md](docs/database-schema.md), [docs/deployment.md](docs/deployment.md), [docs/backup-and-recovery.md](docs/backup-and-recovery.md), [docs/testing.md](docs/testing.md), and [docs/known-issues.md](docs/known-issues.md). Feature notes are in [docs/finance-and-workflows.md](docs/finance-and-workflows.md), [docs/academics.md](docs/academics.md), [docs/auth-and-admin.md](docs/auth-and-admin.md), and [docs/tenant-isolation.md](docs/tenant-isolation.md). The Phase 1 inventory is [docs/erp-baseline-audit.md](docs/erp-baseline-audit.md).

## Local database

PostgreSQL 18 is required for `scripts/dev-db.sh`.

```sh
npm run db:up
MIGRATION_DATABASE_URL=postgres://postgres@127.0.0.1:54329/school_erp npm run db:migrate
```

Use `postgres://erp_app@127.0.0.1:54329/school_erp` as `DATABASE_URL` for the app. Do not point the app at the migration superuser. See `.env.example`.

## Scripts

```sh
npm run dev
npm run check
npm test
npm run build
```

`npm test` includes cross-school isolation tests and expects the local database from `npm run db:up`.
