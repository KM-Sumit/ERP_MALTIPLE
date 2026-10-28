# Known issues

These are current limits, not a claim that the rest of the product was exhaustively attacked. The verification record is [final-release-readiness.md](./final-release-readiness.md).

## Blocked external services

- Cashfree checkout is not started in the browser. Parents can create a pending payment. It becomes paid only after `POST /api/payments/webhook` verifies the HMAC and a timestamp within ten minutes. An empty `CASHFREE_SECRET_KEY` returns 503 and changes nothing.
- Email, SMS, push, and WhatsApp are not delivered. Notifications are inbox rows.
- Uploads stay on local disk. There is no malware scanner and no expiring signed URL. Downloads require a session. The application rejects files over 5 MB and does not read `FILE_MAX_SIZE_MB`.
- `@sveltejs/adapter-node` defaults `BODY_SIZE_LIMIT` to 512K. A production process that does not raise it will reject the uploads the application otherwise allows. This was confirmed by reading the installed adapter, not by posting a 5 MB file to `node build`.
- `npm ci` was not re-run during the latest verification, because it deletes `node_modules`. Do not regenerate the lockfile as part of a routine install.

## Security limits that remain

- Login locks one account after five failures. It does not rate-limit many accounts from one network.
- `app.settle_gateway_payment` is executable by `erp_app`. The HTTP route checks the signature first. A flaw that lets an attacker run SQL as `erp_app` could call the function directly.
- Office lists for fees, complaints, and documents are capped (100 or 300 rows) rather than paged. A school larger than that cap will not see every row on those screens.
- No load test has been run. The pool maximum of 10 is not a capacity number.
- `npm audit` reports one high advisory in Zod (`GHSA-mrhx-c7xc-m3w5`, fixed only by Zod 4). The application uses Zod to check UUID strings in `bindSchoolRequest`, not large collections. The major upgrade was not applied.

## Product gaps

- The fee office screen does not edit an existing plan in place. Saving creates another plan.
- Course materials on the school page ask for a course id instead of listing courses.
- A resolved complaint is reopened by moving it back to `in_review`. There is no separate reopened status.
- Report-card and certificate PDFs are one text page, not a branded multi-page layout.
- Invitation and reset links must be delivered by the administrator. The forgot-password form does not reveal the link.
- Attendance correction writes an audit row in `requestAttendanceCorrection`. No automated test asserts that row. Document approval does: `workflows.spec.ts` checks `documents.review`.
