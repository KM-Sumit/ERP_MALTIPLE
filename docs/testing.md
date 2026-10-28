# Testing

```sh
npm run db:up
npm test
npm run check
npm run build
```

`npm test` is Vitest against the local database on `127.0.0.1:54329`. Server tests share one database and do not run in parallel. The isolation suite truncates schools and users, so it removes accounts created for a manual browser session.

| Area                                                         | File                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Tenant isolation and status graph                            | `src/lib/server/db/tenant-isolation.spec.ts`                 |
| Login, lockout, and school administration                    | `src/lib/server/auth/access.spec.ts`                         |
| Timetables, exams, marks, attendance                         | `src/lib/server/academics/academics.spec.ts`                 |
| Late fees, concurrent payments, webhook idempotency          | `src/lib/server/finance/late-fee.spec.ts`, `finance.spec.ts` |
| Complaints, documents, upload type checks, webhook rejection | `src/lib/server/workflows/workflows.spec.ts`                 |
| Path and file-type rejection                                 | `src/lib/server/storage/files.spec.ts`                       |

Lint is `npm run lint` (Prettier and ESLint). There is no browser test runner in the repository. Critical pages are checked with the development server when a change affects them.

`npm audit` reports dependency advisories. It is not run as part of `npm test`.
