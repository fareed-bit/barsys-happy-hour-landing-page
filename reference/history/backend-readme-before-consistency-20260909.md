> Latest: Google login is implemented and verified. Read GOOGLE-LOGIN.md first. It supersedes the temporary bearer-token and automatic local access notes below.

# Barsys event backend — local working version

Built 2026-09-09 from the existing five-stage and quick planners. No Google Sheet is required. No cloud resources were changed.

## Start

Node 24+ (tested on 25.6.1):

```sh
npm ci --ignore-scripts
npm run backend
```

Planner: http://localhost:3089/ · Dashboard: http://localhost:3089/admin

Create a local plan with either route, then explicitly click **Save test inquiry**. The separate save stores contact/event details on disk. Existing preview/export actions still send nothing. Two synthetic browser-demo records are present in the running development database, not in the release package.

The local server binds to IPv4 loopback. The dashboard requires Google sign-in as fareed@barsys.com in local and production modes. SQLite is stored outside the public source directory at `../barsys-data/inquiries.sqlite`, with owner-only file permissions. `BARSYS_DB` overrides the file; `PORT` changes the port. Test databases use temporary directories and are removed. Personal information is never placed in browser localStorage. The optional frontend draft remains separately consented.

## Implemented

- Complete wizard model: organizer/company/contact, guests, date/time/timezone, venue/city/state/setting, package, collections, recommendation, beverage preference, duration, add-ons/variants/quantities, recurring preferences, budget, notes, restrictions, contracting entity, COI, venue approval, glassware, marketing interest and publicity preference.
- Server validates IDs/enums, length/ranges, dates, email and duration consistency. It recalculates from the server's trusted config.js + quote-engine.js, ignoring client prices. Unknown totals remain null; unsupported locations/group sizes and retained menu conflicts remain quote-review cases.
- Durable opaque IDs, unique idempotency keys, atomic inserts and optimistic version checks. Repeating the same key/payload returns the original receipt, including after restart. Conflicting reuse returns 409.
- Dashboard list, search/filter over loaded records, pagination (100/page), full detail, owner, status, append-only activity entries and JSON export. New staff audit entries identify the Google-verified email; older synthetic demo entries retain Local operator.
- A status of confirmed is only an internal workflow label. It does not modify booking, agreement, payment or date-hold flags.
- Restricted public file serving, origin checks, no cross-origin API access, payload size limits, per-process rate limiting and safe generic storage-failure responses. Sensitive files and source modules are not served.

## API

- `GET /api/status`
- `POST /api/inquiries`: JSON `{schemaVersion:1, ...wizardState}`, same-origin Origin header, `Idempotency-Key` header (16–100 ASCII letters/digits/underscores/hyphens).
- `GET /api/admin/inquiries?offset=0`: items plus nextOffset.
- `GET /api/admin/inquiries/:id`
- `PATCH /api/admin/inquiries/:id`: `{version,status,owner,note}`; no lost updates.

Errors: 400 malformed request/key, 403 origin, 413 oversized, 415 wrong content type, 422 invalid fields, 409 conflicting version/key, 429 rate, 503 unavailable storage. Successful inquiry receipt deliberately omits contact details.

## GCP preparation — not deployed

Target project: `happy-hour-landing-version-2`.

`Dockerfile` runs Node 24 as a non-root user. The PostgreSQL adapter uses parameterized `pg` queries and a unique idempotency index. Configure `NODE_ENV=production`, `DATABASE_URL`, HTTPS `PUBLIC_ORIGIN`, and an `GOOGLE_CLIENT_ID`. Cloud Run should attach a Cloud SQL connection; the database URL can point to its Unix socket with appropriately encoded connection parameters. Supply credentials via Secret Manager, never frontend files or a checked-in .env. Production refuses SQLite and missing access settings.

The admin API requires a valid Google-authenticated server session in both local and production modes. Only fareed@barsys.com is authorized. Google login has been verified locally; see GOOGLE-LOGIN.md for the client configuration, sessions and actual browser evidence. Before launch, choose region/database sizing and backup/retention/deletion policy, confirm billing, finalize production OAuth branding and inquiry/privacy copy, and configure distributed abuse protection. The current per-process IP limiter is not sufficient for scaled Cloud Run and does not trust forwarded client-IP headers. Separate production/staging projects or databases are recommended. No email, CRM, payments or tracking are connected.

Database startup creates a single inquiries table whose document contains the validated plan, estimate snapshot and history. Further changes should use explicit versioned migrations; do not apply destructive schema changes at startup.

## Verification and limits

55 Node tests pass, including HTTP integration, duplicate concurrency, persistence after reopen, conflicting edits, validation, production access checks, safe storage failures, static-file restrictions and byte ranges. Both real browser planner routes saved records. Quick retry returned the existing record. Dashboard search, ownership, status, history, reload and mobile width were checked. An actual Chrome JSON export was downloaded and verified on disk, including event details, estimate, owner, status and history.

PostgreSQL tools are installed, but starting a test cluster was blocked by the macOS sandbox's shared-memory permissions. Docker access was also unavailable. Therefore the pg adapter and container have not been exercised against a live PostgreSQL/Cloud SQL instance. SQLite and actual local HTTP/browser behavior were exercised. GCP billing was not verified; Cloud Run had no services and Cloud SQL showed initial setup. No deployment or paid resource creation occurred.
