# Event operations workspace

Open `/admin/operations.html` for guided event stages, shared inventory/equipment reservations, staff planning, supplier drafts and event financial reconciliation. Existing inquiries and ingredient preparation remain linked. Sign in as fareed@barsys.com. Inventory and staff need real initial entries; unknown stock is not available stock. The latest PROJECT-STATE.md records deployment and validation.

# Private staging access

The deployed test dashboard is https://barsys-happyhours-staging-23nb3wybra-uk.a.run.app/admin. Sign in as fareed@barsys.com. See deploy/STAGING-ACCESS.md. No custom domain or live-site change. Local workflow below remains available.

# Barsys Happy Hours — local release candidate

Start with [PROJECT-STATE.md](PROJECT-STATE.md) for current status and [AGENTS.md](AGENTS.md) for working rules. This is the existing vanilla V3.9 project plus local RC fixes, not the production repository.

## Run
Node 24+ for the backend and full test suite. Run `npm ci --ignore-scripts` to install the PostgreSQL driver. The static frontend itself remains vanilla and dependency-free.

```sh
npm test
npm start
```

Open http://localhost:3000. The server binds only to 127.0.0.1. If already running, reuse it. To run another instance: `PORT=3001 npm start`.

All 27 official covers, event films, photographs and logos are bundled. `npm run assets` retrieves only missing configured covers. `npm run optimize:assets` (Python 3 + Pillow) produces smaller working covers from retained originals in reference/original-covers. Source URLs and SHA-256 hashes are in reference/cover-optimization.json. No Drive access is needed to run this copy.

## Google staff login

Sign in as fareed@barsys.com using the Staff sign in link on http://localhost:3089. The Dashboard button appears after authorization. Direct /admin access requires the same login. Read backend/GOOGLE-LOGIN.md for local startup, Google configuration and permanent access plans.

## Event backend

`npm run backend` starts the backend-enabled planner at http://localhost:3089 and event dashboard at http://localhost:3089/admin. Both routes can explicitly save test inquiries. Local data persists outside the source folder. See backend/README.md for API, data handling and GCP preparation. `npm start` remains the isolated static preview on port 3000.

## Build and package

```sh
npm run preview
npm run package:local
```

The standalone `Barsys-After-Hours-V3-9-Codex-Ready.html` embeds all required local media and can be opened offline. The source package is written to `release/Barsys-Happy-Hours-local-RC.zip`; release/ is excluded from itself. Edit source modules, then rebuild.

## Verification
- `npm test`: 57 Node checks, including pricing, media/source integrity, consent, draft expiry/withdrawal and sensitive-field exclusion.
- `npm run test:localhost`: optional Node Playwright + Chromium; tests actual localhost, downloads, storage, media and responsive layout. `BARSYS_TEST_URL` overrides localhost:3000. `PLAYWRIGHT_MODULE` can point to an existing Playwright module. Defaults to visible Chromium; set `BARSYS_HEADLESS=1` for unattended runs.
- `npm run test:readiness` and `npm run test:browser`: legacy Python Playwright suites using standalone set_content and mocked storage. Python Playwright + Chromium required; these do not replace localhost testing.
- `npm run check:launch`: expected nonzero while real production decisions remain pending.

Current evidence: qa/rc-verification.md. Legacy qa/ reports are historical. The automated browser processes were unavailable here, so actual browser checks used the in-app browser and the connected Chrome browser. JSON and HTML downloads were verified on disk in Chrome. Physical iOS/Safari, OS reduced-motion emulation and a full accessibility audit remain unverified.

## Source map and boundaries
app.js owns shared planner state; quote-engine.js owns arithmetic; v3.js provides the quick route and summary; privacy.js handles optional storage. config.js/media.config.js map approved content. Component files own existing media and carousels.

A local inquiry API and event dashboard are implemented; no live cloud endpoint, payments, CRM or tracking. Final commercial terms and production publication remain unapproved. The proposed integration contract is reference/production-integration-contract.md; it is documentation, not a connection.
