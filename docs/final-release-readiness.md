# Final release readiness

Verified on 29 October 2026 against this working tree. Items marked "this pass" were executed or read during that check. Earlier browser sessions are not treated as evidence here.

**Decision: ready for staging. Blocked for production and for a controlled production rollout.**

A staging deploy can exercise school data on a private host. Production is blocked because payment checkout, outbound notifications, object storage, TLS, and a production-sized upload through `node build` are not in place.

## Phase 9

### Tests executed this pass

`npm test` — 11 files, 42 tests, all passed, including after the document-audit assertion was added. `npm run check`, ESLint, and Prettier passed before that assertion edit. `npm run build` completed after it.

| Area                                                                                                                       | Where it is tested                                                                                                                             | Result |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Cross-tenant isolation                                                                                                     | `tenant-isolation.spec.ts` (16 tests), including another school, a forged school id, parent/teacher/admin denial, and `erp_app` without a user | Passed |
| Login, lockout, session revocation, manager grants, suspended school                                                       | `access.spec.ts`                                                                                                                               | Passed |
| Class timetable conflicts, exam timetable, marks approval, parent hiding of unpublished results, submitted attendance lock | `academics.spec.ts`, `rules.spec.ts`                                                                                                           | Passed |
| Late fees and one raced partial payment, repeated cash reference, policy snapshot, duplicate webhook                       | `late-fee.spec.ts`, `finance.spec.ts`                                                                                                          | Passed |
| Complaint photo, status path to resolved, bonafide PDF, `documents.review` audit row, unsigned and stale webhooks          | `workflows.spec.ts`                                                                                                                            | Passed |
| Path escape and disallowed file bytes                                                                                      | `files.spec.ts`                                                                                                                                | Passed |

There is no browser runner in the repository. This pass did not click through onboarding, the teacher portal, or a phone layout.

### Security findings

Fixed in the tree and covered by tests where noted:

- Webhook HMAC plus a 10-minute timestamp window. Missing secret returns 503. A stale signed body returns 401 (`workflows.spec.ts`).
- Download path must equal `schools/{schoolId}/files/{fileId}`. Responses set `x-content-type-options: nosniff`.
- Document review writes `documents.review`. The workflow test now requires that audit row.
- Roster export checks `reports.export` in `exportSchoolReport`. The route returns 403 on `TenantAccessError`. This pass did not call the HTTP route.

Still open:

- Zod `GHSA-mrhx-c7xc-m3w5` (high, fixed only in Zod 4). `bindSchoolRequest` validates UUID strings only. Not upgraded. `npm audit` was not re-run this pass.
- Account lockout is per account after five failures (`access.spec.ts`). No network-wide limit.
- `erp_app` can execute `app.settle_gateway_payment`. The HTTP handler checks the signature before calling it.
- Attendance correction inserts `attendance.correction`, but no test queries that audit row.
- No `{@html}` usage was found under `src`. That is a source search, not a penetration test.
- CSRF for form posts is SvelteKit's origin check. It was not replayed against a second origin this pass.

### Release blockers from Phase 9

- Cashfree's browser checkout is not called. A parent can create a pending payment. Only a verified webhook, or an authorized cash entry, marks it paid.
- Email, SMS, push, and WhatsApp are not sent.
- No malware scan and no expiring download URL.
- Office lists are capped, not paged. No load test. Pool `max` is 10 in `getDb()`.

## Phase 10

### Production build

`npm run build` completed this pass with `@sveltejs/adapter-node`. Output is `build/`. The build was not started with `node build`, and `/health` was not requested against that process.

### Environment

Application code reads `DATABASE_URL` (SvelteKit private env), `CASHFREE_SECRET_KEY`, `FILE_STORAGE_PATH`, and `NODE_ENV` (bcrypt cost). `.env.example` uses placeholders only.

These names are in `.env.example` and are not read by `src`: `SESSION_SECRET`, `SESSION_MAX_AGE_DAYS`, `SMS_PROVIDER`, Fast2SMS, Twilio, `FILE_MAX_SIZE_MB`, VAPID keys, `PUBLIC_APP_URL`, `PUBLIC_INSTITUTE_NAME`, geofence coordinates, OTP settings, `BACKUP_DIR`, `BACKUP_RETAIN_DAYS`. The upload limit in code is 5 MB.

The installed adapter reads `HOST`, `PORT`, `BODY_SIZE_LIMIT` (default `512K`), `PROTOCOL_HEADER`, `HOST_HEADER`, and related timeout variables. It does not read `ORIGIN`. That was corrected in `.env.example` and `docs/deployment.md` after reading `node_modules/@sveltejs/adapter-node/src/handler.js`.

### Database

`drizzle.__drizzle_migrations` on the local database `school_erp` at `127.0.0.1:54329` has 10 rows, ids 1 through 10, matching journals `0000` through `0009`.

This pass ran `pg_dump --format=custom` as `postgres`, restored it into `school_erp_restore_check`, saw 10 migration rows and index `invoices_school_student_idx`, then dropped that database. The live database was not overwritten. Upload files were not copied. There is no down migration.

`erp_app` is the runtime role. `withSchoolUser` refuses a superuser connection; the isolation suite asserts that.

### HTTPS, webhooks, monitoring, rollback

- HTTPS: no certificate or proxy config is in the repo. Not tested through a proxy.
- Webhooks: signature and timestamp checks are in `receiveCashfreeWebhook` and are tested. A live Cashfree callback was not sent.
- Monitoring: `GET /health` runs `select 1` and returns 503 without the error text. No error tracker, metrics agent, or alert rule is in the repo. `/health` was not called over HTTP this pass.
- Rollback: documented as "start the previous build, or restore a dump." Neither was executed as a failed-release drill.
- `npm ci` was not run this pass.

## Recommendation

Use staging only after setting `DATABASE_URL` to `erp_app`, `BODY_SIZE_LIMIT=6M`, `FILE_STORAGE_PATH` outside the web root, and `PROTOCOL_HEADER` to match the proxy. Do not turn on public payments until `CASHFREE_SECRET_KEY` is set and a signed sandbox webhook has been observed against that host. Do not describe the app as in production.
