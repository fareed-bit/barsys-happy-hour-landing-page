# Barsys Happy Hours - current application

Continue the existing project. Start with AGENTS.md and PROJECT-STATE.md.
The V3.9 folder name is the original export, not the current feature boundary.

## Run locally
Node 24+ is required. The latest local checks use Node 25.6.1 with serial tests; deployment uses Node 24.
- `npm test`: serial Node unit and isolated HTTP/SQLite integration tests.
- `npm start`: static preview on localhost:3000; no inquiry persistence.
- `npm run backend`: connected application on localhost:3089 using the existing local configuration.
- `npm run preview`: rebuild the standalone HTML; no backend is embedded in that file.
- `npm run check:launch`: intentionally reports pending business/production decisions.
Never start a second server on an occupied port or point tests at an actual event database.

## What exists
27 official mixlists, original company media, both planners, eight add-ons, glassware/delivery scope, optional browser draft storage and event summaries. The connected backend adds authenticated inquiries, proposal review/acceptance, preparation, purchasing, inventory, crew access and Gmail review.
Unknown prices and taxes remain unknown. An inquiry is not a booking, contract or payment.

## Current local stabilization
Runtime-specific notices describe standalone versus connected behavior. Preparation changes check both event and operations versions and save atomically. Reserved/dispatched stock and accepted machine allocation cannot be silently bypassed through preparation.
Read `backend/PREPARATION-CONSISTENCY.md` and `qa/consistency-2026-09-09.md` before changing these rules.

## Environments and review
A private GCP staging deployment is documented in deploy/STAGING-ACCESS.md. This local stabilization batch has NOT been deployed or used to change stored events. Public production remains a separate approval.
Do not publish credentials, private proposals, databases, internal costing or QA fixtures. The source server deliberately restricts public file serving.
Historical setup/QA instructions are preserved in reference/history/readme-before-consistency-20260909.md; they are not the current operating guide.

## Isolated lifecycle verification

Run `npm run test:lifecycle` for the full inquiry-to-closeout HTTP rehearsal and handoff guards. Run `npm run test:lifecycle:browser` on this Mac for fresh-profile Chrome checks against an isolated backend/database. These tests do not use .env, an existing database or your personal browser session. The browser command needs installed Chrome and Node 24+. Evidence and limits: `qa/lifecycle-2026-09-10.md`.

## Browser QA environment

Python browser tests use an isolated virtual environment outside the application folder:

```sh
python3 -m venv ../barsys-test-tools
../barsys-test-tools/bin/python -m pip install -r tests/browser-requirements.txt
../barsys-test-tools/bin/python -m playwright install chromium
npm run test:browser
npm run test:readiness
npm run test:media
npm run test:lifecycle:browser
```

Set BARSYS_QA_PYTHON to use another installed interpreter. This does not change application dependencies. On the Codex restricted shell, macOS may deny Chromium MachPortRendezvousServer registration before tests start. Run these same commands in your regular Terminal in that case; do not treat a browser-startup failure as a test pass. Connected Chrome checks remain available separately.
