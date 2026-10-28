# Deployment

The app is a Node server built with `@sveltejs/adapter-node`. `render.yaml` is a Render Blueprint. Nothing in this repository has been deployed yet.

## Render

Push the project to GitHub, then in Render choose **New → Blueprint** and select that repo. The blueprint creates a Singapore web service and a Postgres database named `school_erp`.

Render fills `DATABASE_URL` with the database owner. `scripts/render-db.mjs` creates `erp_app` before migrations. The running app uses that login when `ERP_APP_PASSWORD` is set, so row-level security stays on. Render generates that password. Do not paste it into the repo.

The service plan is Starter and the database plan is Basic, because a free web service has no disk and would drop uploaded photos on the next deploy. `FILE_STORAGE_PATH` is `/var/data/uploads`. `BODY_SIZE_LIMIT` is `6M`. Render terminates HTTPS. `PROTOCOL_HEADER` is `x-forwarded-proto`.

After the first deploy, open `https://<service>.onrender.com/health`. It should return `{"ok":true}`. Then open `/setup` once and create the Super Admin. There is no Super Admin until that form is saved. Cashfree, email, and SMS stay off until those providers are connected.

## Runtime

- Node.js 22
- PostgreSQL 18
- `npm run build` then `node build` (or `npm start`)
- Set `DATABASE_URL` to the `erp_app` role
- Set `MIGRATION_DATABASE_URL` only on the machine that runs migrations
- Put `FILE_STORAGE_PATH` outside the web root and keep it on the same host as the Node process
- Leave `CASHFREE_SECRET_KEY` empty until the webhook URL is the public `/api/payments/webhook` endpoint
- Set `BODY_SIZE_LIMIT=6M`. The adapter default is `512K`, which is below the 5 MB upload check in application code

The pool allows 10 connections. Do not point `DATABASE_URL` at a superuser.

## Release order

1. Take a backup. See [backup-and-recovery.md](./backup-and-recovery.md).
2. Run `MIGRATION_DATABASE_URL=... npm run db:migrate` against the target database.
3. Build on the release commit: `npm ci` is not reliable with the current lockfile; use the existing `node_modules` from a machine that already installed it, or install without rewriting the lockfile.
4. Start the new build. `GET /health` returns `{"ok":true}` when the app can run `select 1`.
5. Sign in as each role on a staging school before sending real traffic.

## HTTPS

The repository has no certificate, reverse-proxy config, or TLS listener. Terminate TLS in front of the Node process. The installed adapter reads `HOST`, `PORT`, `PROTOCOL_HEADER`, and `HOST_HEADER`. It does not read `ORIGIN`. With `PROTOCOL_HEADER` unset, `get_origin` in `@sveltejs/adapter-node` uses `https`. Set `PROTOCOL_HEADER=x-forwarded-proto` when the proxy sends that header. The session cookie is `Secure` when `dev` from `$app/env` is false. SvelteKit checks the form `Origin` header against that derived origin. This was read from the installed adapter; it was not exercised through a live proxy.

## Rollback

Keep the previous build directory. If the new process fails health, stop it and start the previous build. If a migration has already committed, roll back by restoring the backup into a replacement database and pointing `DATABASE_URL` at it. Do not run destructive SQL against the live database to invent a down migration.

## Logs

The process writes Vite or Node output to its own stdout. Session lookup failures are not printed with the cookie. Do not add request-body logging on `/api/payments/webhook` or `/login`. No error tracker is configured.

## Scheduled work

There is no separate worker. Fee reminders and notification delivery are rows in `notifications`, written when a user takes an action. Nothing sends them on a clock.
