# Preparation consistency - local patch, September 9, 2026

## Contract
GET returns both the inquiry `version` and shared `operationsVersion`. PATCH requires both. A changed or omitted version returns 409 without saving. Event and operations documents use the existing `saveEventAndOperations` transaction; a competing stock reservation cannot commit alongside an out-of-date preparation plan.
Both admin/preparation.js and the inline operations form send these versions. Inline saves reload shared operations. Separate operations commands update the cached operations version when successful; an event-version conflict still requires refresh.

## Rules
- Drinks-per-guest, buffer, recipe content/weights, machine count or equipment-quantity changes are material planning edits.
- Material edits are rejected with active reserved/dispatched stock, or at packing and later checkpoints. Resolve commitments/workflow first; the API never releases or returns stock automatically.
- An accepted proposal's machine allocation cannot be changed through preparation. Use the existing reviewed, revised-proposal acceptance path.
- Before commitments, material edits clear menu confirmation and all packed flags, reset planning/purchasing/packing tasks, and return an advanced early event to Plan & budget.
- Changed recipe names or measurements lose their recipe confirmation. Review the saved values and confirm again; the first material save cannot retain a stale confirmation.
- Withdrawing menu/recipe approval also resets readiness. `preparationNeedsReview` blocks advancement until an explicitly reconfirmed, complete preparation is saved.
- Packing/check notes may be updated at the packing stage without changing committed quantities. After dispatch, only cost-reference corrections are allowed here. Closed events reject all changes until reopened through operations.
- Accepted prices, payment records, supplier receipts, stock reservations, client scope and historical acceptance snapshots are not rewritten by this route.
- Preparation quantities are internal estimates. This patch does not amend signed recipes/service terms, approve 360 compatibility or publish package assignments.

## Verification
See tests/preparation-consistency.test.mjs for pure-function guards, both UI contracts, owner-only HTTP access, stale versions and a simulated stock race with transaction rollback. Existing tests/preparation-api.test.mjs now expects packing to reset when demand changes, rather than preserving a stale packed flag.
The browser smoke attempt is isolated; its timeout is recorded in qa/runtime-consistency-browser.json. Verify both visible forms in the Codex connected browser before deploying. No production/staging event was used for these tests.

## Recovery
Original changed source files were copied to ../baselines/before-consistency-20260909-2350 relative to the project. Restore only reviewed files, accounting for later edits. Do not overwrite newer Codex changes wholesale. No live database rollback is needed for this local-only patch.
