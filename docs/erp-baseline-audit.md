# School ERP baseline audit (Phase 1)

Audit date: 28 October 2026.  
Auditor scope: inspection and checks only. Application source was not edited.  
The production `build/` directory created by `npm run build` was deleted afterward because it is generated output and was not present before the audit.

## Where the code actually is

The Cursor workspace `/home/chota-tota/Desktop/kapil_bhaiy_erp_/product` is an empty directory. It has no files, no `package.json`, no Git metadata, and no application source. Checks cannot be run inside it.

The only School ERP codebase on this machine that matches the expected stack is:

`/home/chota-tota/.gemini/antigravity/scratch/school-erp`

That directory is **not** inside the opened workspace and it is **not** a Git repository. This report treats it as the existing baseline. Phase 2 should copy or move that project into the workspace (or open that folder as the workspace) before any feature work. Do not start from an empty tree and do not replace the stack.

Nearby folders such as `coching` and `apps/project` were not used as the baseline. They are separate products.

## Current architecture

This is a SvelteKit starter created with `sv` 1.1.1 (`minimal` template, TypeScript, Prettier, ESLint, Tailwind, Drizzle + postgres.js, Node adapter, Vitest). The README still describes that generator command. There is no domain application on top of it.

| Layer                                | What exists                                                                                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI                                   | Svelte 5 runes. One root layout and one welcome page. Tailwind v4 via `@import 'tailwindcss'` in `src/routes/layout.css`.                                                                                                                  |
| Routing                              | `src/routes/+layout.svelte`, `src/routes/+page.svelte`. No server load, form actions, API routes, route groups, or error page override.                                                                                                    |
| Config                               | Adapter and Vite live in `vite.config.ts`. There is no `svelte.config.js`. That matches this Kit 3 layout: `sveltekit({ adapter: adapter() })` from `@sveltejs/adapter-node`. The production build printed `Using @sveltejs/adapter-node`. |
| Language                             | `tsconfig.json` extends `$app/tsconfig` with `strict: true`.                                                                                                                                                                               |
| Env                                  | `src/env.ts` declares only `DATABASE_URL` through Kit 3 `defineEnvVars`. No schema validator. Private access is `$app/env/private`.                                                                                                        |
| Database                             | Drizzle ORM + `postgres` (postgres.js). Client in `src/lib/server/db/index.ts`. Schema is a demo `task` table.                                                                                                                             |
| Auth, files, payments, notifications | npm dependencies and `.env.example` keys only. No source imports them.                                                                                                                                                                     |
| Process                              | `npm run start` expects `node build` after a production build. No Docker, CI, process manager, log drain, or monitoring config.                                                                                                            |

Locked versions that are actually installed (`package-lock.json`):

| Package                      | Locked version                                          |
| ---------------------------- | ------------------------------------------------------- |
| svelte                       | 5.57.2                                                  |
| @sveltejs/kit                | 3.1.0                                                   |
| @sveltejs/adapter-node       | (range ^6.0.0 in package.json; build used this adapter) |
| @sveltejs/vite-plugin-svelte | range ^7.2.0                                            |
| vite                         | 8.3.5                                                   |
| typescript                   | 6.0.3                                                   |
| vitest                       | 4.1.12                                                  |
| tailwindcss                  | range ^4.3.0                                            |
| drizzle-orm                  | 0.45.4                                                  |
| drizzle-kit                  | range ^0.31.10                                          |
| postgres                     | 3.4.9                                                   |
| zod                          | 3.25.76                                                 |

Runtime used for checks: Node v22.22.2, npm 9.2.0. `.npmrc` sets `engine-strict=true`, but `package.json` has no `engines` field, so npm is not pinning a Node range.

Svelte 5 patterns that are present: `$props()` and `{@render children()}` in the root layout, and `runes: true` forced for project files in `vite.config.ts`. `src/app.d.ts` leaves `App.Locals`, `App.Error`, and `App.PageData` commented out.

## Existing features and locations

What runs today is the default welcome page.

| Piece                          | Path                                                                               | Status                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root layout, favicon, Tailwind | `src/routes/+layout.svelte`, `src/lib/assets/favicon.svg`, `src/routes/layout.css` | Works as a shell. No navigation, no role chrome, no responsive app layout.                                                                                                           |
| Home page                      | `src/routes/+page.svelte`                                                          | Static “Welcome to SvelteKit” markup.                                                                                                                                                |
| HTML shell                     | `src/app.html`                                                                     | Viewport meta is set. Also contains a nonstandard `<meta name="text-scale" content="scale" />`.                                                                                      |
| DB connection                  | `src/lib/server/db/index.ts`                                                       | Creates a global `postgres` client and Drizzle instance. Throws if `DATABASE_URL` is missing. No route imports this module, so the welcome page does not open a database connection. |
| Schema                         | `src/lib/server/db/schema.ts`                                                      | Table `task` (`id`, `title`, `priority`). Not a school model.                                                                                                                        |
| Drizzle config                 | `drizzle.config.ts`                                                                | Schema path, `postgresql` dialect, `verbose`, `strict`. No `out` migrations directory.                                                                                               |
| Env contract                   | `src/env.ts`, `.env.example`                                                       | Runtime contract is only `DATABASE_URL`. The example file lists many future keys.                                                                                                    |
| Sample unit test               | `src/lib/vitest-examples/greet.ts`, `greet.spec.ts`                                | Starter greeting test. Not ERP behavior.                                                                                                                                             |
| Crawling                       | `static/robots.txt`                                                                | Allows all user agents.                                                                                                                                                              |
| Editor hints                   | `.vscode/extensions.json`, `.vscode/settings.json`                                 | Recommends Svelte, Prettier, ESLint, Tailwind. Associates `*.css` with Tailwind.                                                                                                     |

`.env` exists, is listed in `.gitignore`, and is not a Git checkout. Its only variable is `DATABASE_URL`. The value is a short `postgres:` URL that matches a placeholder pattern. It is not localhost. The value is omitted from this report. `.env.example` is the intended credential checklist and is filled with empty or sample placeholders.

## Requirement map

Every product requirement below is **missing**. Nothing is partially implemented in application code. The right-hand column is only a planned dependency or env key, not working behavior.

| Requirement                                        | In source                              | Declared but unused                                                                                                                                         |
| -------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Super Admin and school onboarding                  | No                                     | —                                                                                                                                                           |
| School-wise data isolation / multi-tenancy         | No tenant key, no school table, no RLS | —                                                                                                                                                           |
| School Admin and Manager Admin                     | No roles                               | —                                                                                                                                                           |
| Teacher portal                                     | No                                     | —                                                                                                                                                           |
| Parent / guardian portal                           | No                                     | —                                                                                                                                                           |
| Classes, sections, subjects, students              | No                                     | —                                                                                                                                                           |
| Class timetables                                   | No                                     | —                                                                                                                                                           |
| Examination timetables                             | No                                     | —                                                                                                                                                           |
| Exams, marks, report cards                         | No                                     | `exceljs` installed, not imported                                                                                                                           |
| Attendance and leave                               | No                                     | Geofence lat/long/radius keys in `.env.example` only                                                                                                        |
| Fees, payments, late fees                          | No                                     | `@cashfreepayments/cashfree-js` installed, not imported. Cashfree env keys empty in the example.                                                            |
| Courses, notes, PDFs, assignments                  | No                                     | —                                                                                                                                                           |
| Complaints, voice/photo uploads, document requests | No                                     | `multer` and `FILE_STORAGE_PATH` / `FILE_MAX_SIZE_MB` in the example only. Storage is specified as a local directory outside `static/`, not object storage. |
| Notifications                                      | No                                     | `web-push` and VAPID keys in the example only                                                                                                               |
| SMS / OTP login                                    | No                                     | `SMS_PROVIDER` example defaults to `mock`. Fast2SMS and Twilio keys are empty.                                                                              |
| Sessions and authorization                         | No `hooks.server.ts`, no `App.Locals`  | `SESSION_SECRET`, `@node-rs/bcrypt` installed and unused                                                                                                    |
| Audit logs and reports                             | No                                     | `chart.js` installed, not imported                                                                                                                          |
| Dashboards                                         | No                                     | —                                                                                                                                                           |

`zod`, `uuid`, `date-fns`, `lucide-svelte`, and `@lucide/svelte` are also dependencies and are not imported anywhere under `src/`.

## Bugs and technical debt

1. **`npm run lint` fails** because Prettier disagrees with two files. ESLint itself is clean (see baseline). The diffs are formatting only:
   - `eslint.config.js`: `"no-undef"` should be `'no-undef'` under the project Prettier config (single quotes).
   - `tsconfig.json`: `types` and `include` arrays should be collapsed to one line each (`printWidth: 100`).
2. **`drizzle.config.ts` has no `out`.** `npx drizzle-kit check` exits 1. The CLI text says “AWS Data API driver” and prints `secretArn: 'postgresql'`. That message is a mislabeled check inside Drizzle Kit 0.31 (`database` is printed for `config.out`, `secretArn` is printed for `config.dialect`). The real miss is the missing migrations output path. There is no `drizzle/` directory and no SQL migration files. `.prettierignore` already ignores `/drizzle/`, which shows the generator expected that folder later.
3. **Schema is the `sv` demo.** `task` cannot evolve into a multi-tenant ERP without a replacement model. No migration history exists to preserve.
4. **Env example and env module diverge.** `.env.example` documents session, SMS, files, Cashfree, web push, geofence, OTP limits, and backups. `src/env.ts` publishes only `DATABASE_URL`, and it does not validate the URL.
5. **Database client connects at import time** and throws if `DATABASE_URL` is unset. That is fine for a server singleton later, and it is unused by current routes.
6. **Two icon packages** (`lucide-svelte` 0.469.0 and `@lucide/svelte` 1.61.0). Neither is used. Pick one when UI work starts. `@lucide/svelte` matches Svelte 5; `lucide-svelte` 0.469 is the older package.
7. **`multer` is an Express middleware.** This app has no Express server. SvelteKit form actions or platform upload APIs are the fit. Leaving `multer` unused adds supply-chain weight.
8. **`test.txt`** at the repo root contains the three characters `ok`. It is not referenced.
9. **README is the Svelte CLI boilerplate**, not an ERP operations guide.
10. **No Git history**, so there is no review trail, no remote, and no branch policy.
11. **`app.html` `text-scale` meta** is not a known platform feature. It does not affect the current page.

`npm run check` inside the sandbox failed before diagnostics with `ENOENT` opening `node_modules/$app/tsconfig.json` (the tool could not create that path). The same command was rerun with filesystem writes allowed and passed. That first failure is an environment restriction, not an application type error.

## Security risks

Current exposure is low because the only route is a static welcome page. The risks below matter as soon as features are added, and a few exist already.

- **No authentication or authorization.** No hooks, no session cookie, no password hashing call sites, no role checks, no CSRF strategy beyond whatever SvelteKit supplies by default for form actions (there are no form actions).
- **No tenant boundary.** A future query that forgets `school_id` would leak across schools. The schema has nowhere to put that constraint yet. PostgreSQL row-level security is not configured.
- **Secrets file is local only.** `.env` is gitignored. The directory is not a Git repo, so it cannot be committed until someone runs `git init` and then force-adds it. Still treat `.env` as secret and keep it out of Git. This report does not copy its value.
- **`DATABASE_URL` is not validated.** A wrong or file-based URL would be accepted by `defineEnvVars` as-is.
- **Planned uploads are local disk** (`FILE_STORAGE_PATH` outside `static/`). That part of the example is the right idea (do not serve uploads as public static files). Nothing implements type checks, size enforcement, malware scanning, or auth on download.
- **Payment and webhook verification do not exist.** The example names `CASHFREE_WEBHOOK_URL` as `https://yourdomain.com/api/payments/webhook`. There is no route and no signature check. The installed package is the browser SDK (`@cashfreepayments/cashfree-js`), not a server SDK.
- **OTP and rate-limit numbers exist only as env comments.** No attempt counter, cooldown, or expiry code.
- **`static/robots.txt` allows all crawlers.** Acceptable for a welcome page. Wrong once portals hold student data.
- **No security headers, audit log, or structured logger.** No deployment health check.
- **Unused native and payment packages** (`@node-rs/bcrypt`, `multer`, `web-push`, Cashfree, `exceljs`) expand the dependency tree before they are needed. They are not a vulnerability by themselves. Do not delete them in a drive-by cleanup during later phases without confirming Phase 2’s module plan; several are the intended libraries.
- **PostgreSQL on this machine is not accepting connections.** `pg_isready` reported `/var/run/postgresql:5432 - no response`. No migration was applied, so no database was mutated.

## Database and migration status

| Check                             | Result                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| ORM                               | Drizzle ORM 0.45.4 with postgres.js 3.4.9                                                |
| Schema                            | `task` only                                                                              |
| Migration files                   | None                                                                                     |
| `out` in `drizzle.config.ts`      | Missing                                                                                  |
| `npx drizzle-kit check`           | Exit 1. Missing `out`. Misleading AWS Data API wording. Not executed against a database. |
| `drizzle-kit migrate` / `db:push` | Not run. Would require a live database and would change it.                              |
| Local Postgres                    | Client `psql` is installed. Server at the default socket did not respond.                |

## Build and test baseline

Commands were run in `/home/chota-tota/.gemini/antigravity/scratch/school-erp` on 28 October 2026.

| Command                                                         | Exit    | Result                                                                                                                                |
| --------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check` (sandbox, writes outside the workspace blocked) | 1       | `svelte-kit sync` could not open `node_modules/$app/tsconfig.json` (`ENOENT`). Diagnostics did not run.                               |
| `npm run check` (filesystem writes allowed)                     | 0       | `svelte-check found 0 errors and 0 warnings`.                                                                                         |
| `npm run lint` (`prettier --check . && eslint .`)               | 1       | Prettier failed on `eslint.config.js` and `tsconfig.json`. ESLint did not run because of `&&`.                                        |
| `npx eslint .`                                                  | 0       | No ESLint problems.                                                                                                                   |
| `npx prettier --check .`                                        | 1       | Same two files.                                                                                                                       |
| `npm test` (`vitest --run`)                                     | 0       | 1 file, 1 test passed (`greet`). About 286 ms.                                                                                        |
| `npm run build` (`vite build`, Vite 8.3.5)                      | 0       | Client and server bundles completed. Adapter Node finished. Warning: `NO_COLOR` ignored because `FORCE_COLOR` is set (tooling noise). |
| `npx drizzle-kit check`                                         | 1       | See database section.                                                                                                                 |
| Svelte MCP autofixer                                            | Not run | No Svelte source was written in this phase. `svelte-check` is the project diagnostic.                                                 |
| Browser pass                                                    | Not run | There is no ERP screen to exercise. The page is the starter welcome message.                                                          |

The sandbox-blocked `npm test` and `npm run build` also failed earlier with `EACCES` writing `node_modules/.vite-temp/...`. Those failures are the sandbox, not the app. The unrestricted rerun is the result to trust.

## Recommended implementation order

Do this before feature screens. Each step should land in the workspace copy of the scaffold, with Git initialized and `.env` kept untracked.

1. **Make the scaffold the workspace repo.** Copy the scratch project into `/home/chota-tota/Desktop/kapil_bhaiy_erp_/product` (or reopen that folder). Keep the current toolchain. Initialize Git. Add `out: './drizzle'` and generate the first migration only after the real schema exists. Do not migrate the demo `task` table into production as a domain table.
2. **Platform skeleton.** Env schema for every variable the example already names, `hooks.server.ts`, `App.Locals`, session cookie, password hashing with the existing `@node-rs/bcrypt`, and a single role guard. Fix Prettier on the two config files in the same change if desired.
3. **Tenancy and onboarding.** `schools`, users, memberships, roles (`super_admin`, `school_admin`, `manager_admin`, `teacher`, `parent`). Every school-owned row gets `school_id`. Super Admin creates a school and its School Admin. Queries go through a helper that always applies the active school.
4. **Academic structure.** Academic years, classes, sections, subjects, teacher assignment, student enrollment, parent links.
5. **Timetables.** Class timetable, then examination timetable. They share period/room data and must not be one table with a flag unless the rules truly match.
6. **Attendance and leave.** Daily attendance before geofence. Geofence stays a later constraint, using the example’s lat/long/radius keys.
7. **Exams, marks, report cards.** Assessment model, mark entry, computed report card, Excel export with the existing `exceljs` only when the report exists.
8. **Fees.** Fee heads, invoices, late-fee rules, Cashfree order plus webhook with signature verification. Sandbox keys first (`CASHFREE_ENV=sandbox` in the example).
9. **Content and parent services.** Courses, notes/PDFs, assignments, complaints with voice/photo, document requests. Store files outside `static/` as the example already says. Authorize every download.
10. **Notifications, audit, reports.** Web Push (VAPID), in-app notices, append-only audit log, role dashboards. SMS stays behind `SMS_PROVIDER=mock` until a provider key exists.

## Files safe to reuse

Reuse these as the application base. Extend them; do not throw the toolchain away.

- `package.json`, `package-lock.json`, `.npmrc`
- `vite.config.ts` (adapter-node, Tailwind, runes, Vitest project)
- `tsconfig.json` (after the Prettier formatting fix)
- `eslint.config.js` (after the quote fix)
- `prettier.config.js`, `.prettierignore`, `.gitignore`
- `src/app.html` (drop or justify the `text-scale` meta when touching it)
- `src/app.d.ts` (fill `Locals` when auth exists)
- `src/env.ts` (add the rest of the variables with schemas)
- `src/lib/server/db/index.ts` (keep Drizzle + postgres.js)
- `src/routes/+layout.svelte` and `src/routes/layout.css` as the shell
- `src/lib/assets/favicon.svg` until a product icon exists
- `.env.example` as the credential checklist
- `.vscode/extensions.json` and `.vscode/settings.json`
- Vitest setup in `vite.config.ts`. The `greet` example can be deleted when the first real test arrives.

## Files that need to change

| File                          | Why                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/lib/server/db/schema.ts` | Replace the demo `task` table with the school model.               |
| `drizzle.config.ts`           | Set `out` and point migrations at the new schema.                  |
| `src/routes/+page.svelte`     | Replace the welcome stub with the real entry (login or role home). |
| `src/routes/+layout.svelte`   | Add authenticated chrome when roles exist.                         |
| `src/env.ts`                  | Declare and validate the variables `.env.example` already lists.   |
| `README.md`                   | Replace the `sv` tutorial with how to run this ERP.                |
| `static/robots.txt`           | Restrict crawling once private pages exist.                        |
| `test.txt`                    | Remove when cleanup is in scope. It is not product behavior.       |

These paths do not exist yet and have to be created: `src/hooks.server.ts`, route groups per role, server modules for auth and tenancy, and `drizzle/*.sql`.

## Dependencies and credentials that are actually required

**Required to keep the current scaffold building**

- Node 22 (verified with v22.22.2) and npm
- The existing lockfile. Do not upgrade the stack in Phase 2 without a failing check.
- `DATABASE_URL` only when code imports `src/lib/server/db/index.ts`. The welcome page build does not need a running database. A local Postgres is required before the first real migration. This machine’s default Postgres socket was down.

**Required before the matching feature, not before Phase 2**

| Capability   | What must be supplied                                                              | Already in repo                                              |
| ------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Sessions     | `SESSION_SECRET` (example says `openssl rand -hex 64`)                             | Example only                                                 |
| Passwords    | None beyond the app secret                                                         | `@node-rs/bcrypt` dependency                                 |
| SMS OTP      | Fast2SMS **or** Twilio keys, or keep `SMS_PROVIDER=mock`                           | Example only                                                 |
| Uploads      | Writable `FILE_STORAGE_PATH` outside `static/`, max size                           | Example only. No S3/R2/Cloudflare R2 client is installed.    |
| Fees         | Cashfree app id, secret, env (`sandbox` or `production`), public HTTPS webhook URL | Browser SDK dependency only                                  |
| Web Push     | VAPID public/private key and `mailto:` subject                                     | `web-push` dependency                                        |
| Public links | `PUBLIC_APP_URL`, institute display name                                           | Example only                                                 |
| Backups      | `BACKUP_DIR` and a cron/job outside this repo                                      | Example only. No backup script.                              |
| Geofence     | Latitude, longitude, radius meters                                                 | Example defaults to a Delhi coordinate and 200 m. Not wired. |

No payment, SMS, or push credential is present in `.env`. Do not invent keys. Sandbox Cashfree and `SMS_PROVIDER=mock` are enough until a school is ready to go live.

## Phase 2 entry condition

Phase 2 can start from verified facts:

- The workspace folder is empty.
- The reusable app is the scratch SvelteKit project above.
- Typecheck, ESLint, the sample unit test, and the production build passed when the process was allowed to write its cache.
- Lint-as-script and Drizzle check failed for the reasons recorded here.
- No ERP feature is implemented. The next phase should establish the repo in the workspace, then tenancy, identity, and roles, before any portal screens.
