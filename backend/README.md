# Barsys event backend - current guide

Read ../PROJECT-STATE.md for current status. Historical no-deployment/bearer-token instructions have been archived; do not treat them as current.

## Runtime
`npm run backend` starts the existing connected app on localhost:3089. Node 24+ is required. The SQLite file is outside the public source directory. Production uses PostgreSQL and requires a database URL, HTTPS origin and Google client configuration. Never copy environment files or databases into release assets.
Google identity and server sessions enforce owner access. Active, explicitly enabled crew see assigned-event tools only. See GOOGLE-LOGIN.md and crew.mjs. The standalone HTML and static preview are not the backend.

## Main areas
- api.mjs / model.mjs: validated, idempotent inquiry receipts and owner routes.
- auth.mjs / crew.mjs: staff login, session revocation and restricted crew payloads.
- preparation.mjs / preparation-changes.mjs: ingredient/equipment plans and lifecycle-safe writes.
- operations.mjs / purchasing.mjs: inventory reservations, receipts, dispatch, returns, staffing and financial records.
- proposals.mjs / event-changes.mjs: reviewed proposals, versioned acceptance snapshots and atomic handoff.
- costing.mjs / recipe-catalog.json / ingredient-prices.json: measured recipes and labeled estimates; not automatic purchasing.
- gmail.mjs: owner-authorized, page-open email review; not unattended synchronization.
- menu-policy.mjs: unpublished/reviewed package assignments, independently enforced for new inquiries.

## Preparation API contract
GET /api/admin/inquiries/:id/preparation returns version, operationsVersion, plan, summary and recipeDefaults.
PATCH requires {version, operationsVersion, plan}. A stale or omitted version returns 409; lifecycle conflicts return 422. Both documents save in one transaction. The response includes refreshed versions and an impact summary.
Clients must refresh shared state after saves, preserve unsaved edits on errors and re-review any reset confirmations. See PREPARATION-CONSISTENCY.md for exact guard behavior.

## Data handling and deployment
The server injects a non-secret runtime mode into the page; runtime-content.js selects matching notices. Server inquiry records and staff cookies are distinct from optional browser draft storage. Imported-mail/inquiry retention still needs an approved implementation; clearing a browser draft does not delete database records.
Private GCP staging is documented in ../deploy/STAGING-ACCESS.md. This consistency patch is local only. Public launch, new deployments, actual purchases, payments and customer messages require separate authorization.
Tests create isolated temporary SQLite databases. Run npm test; do not run fixtures against staging or actual event data. Physical-device, deployed PostgreSQL regression and connected-browser checks remain separate verification tasks.
Historical backend guide: ../reference/history/backend-readme-before-consistency-20260909.md.
