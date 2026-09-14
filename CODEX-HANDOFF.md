> Historical V3.9 export handoff. Current behavior, commands and next steps are in PROJECT-STATE.md and README.md. The connected backend, 27-menu catalog and private staging were added later. Review qa/consistency-2026-09-09.md before resuming edits; the latest consistency patch is local and not deployed.

# Latest: event preparation deployed

Read the newest PROJECT-STATE.md entry. Staff can now plan equipment, packing and ingredients per event. Approved measured recipe data is still needed for automatic real shopping lists. Staging revision preparation-0909; 62 tests pass.

# Latest: private GCP staging verified

Read deploy/STAGING-ACCESS.md and the latest PROJECT-STATE.md entry. Owner authorized staging deployment without a domain. Staging is running with PostgreSQL and exact-email Google access. Public production launch remains separate; no DNS changes. Historical local-only status below is superseded.

# Latest: Google login verified

Read backend/GOOGLE-LOGIN.md. Google client/test audience configured; actual fareed@barsys.com login and logout verified. No public deployment. 55 tests pass. Legacy access notes below are superseded.

# Latest: event backend

Read backend/README.md and the top of PROJECT-STATE.md. A local backend and dashboard now work on port 3089; no Google Sheet, cloud deployment or paid resource was created. PostgreSQL adapter awaits live verification. Earlier frontend handoff follows.

# Codex handoff — Barsys Happy Hours local RC

Read [PROJECT-STATE.md](PROJECT-STATE.md) before continuing. The original V3.9 export has been extended in Codex; do not undo those changes or stop at the original setup checklist.

## Current continuation
- All eight exact official covers downloaded, visually checked and optimized. Original bytes, source URLs and checksums retained.
- Artwork loads independently of storage. Obsolete artwork-consent text removed.
- Hero first-click pause corrected without changing design or media.
- Shared duration controls synchronize with add-on changes. Draft recommendation choice survives reload alongside favorite menus; review, copied details and HTML summaries include that choice.
- Reset clears menu filters. Invalid fields inside collapsed optional sections are revealed and focused.
- Export feedback says requested, not unverified downloaded. Actual JSON and HTML files verified in connected Chrome.
- Expanded Node tests, localhost regression script, recovery snapshot, project state, production contract and RC package workflow added.

## Approved scope
Continue the current vanilla design. Preserve the four-scene hero, four distinct experience films, six-photo rail, on-demand occasion film, original logo and 15-name banner. Preserve 21 collections, eight add-ons, five-stage custom wizard, two-step quick route and shared pricing/state. Keep rates, unknown charges, service guidance and privacy safeguards unchanged.

Owner authorization is in reference/asset-authorization.md. Google Drive is authenticated and the specific Cover images folder is readable. No new files were needed. Do not download the entire vault or request public sharing.

## Continue locally
`npm test`, `npm run preview`, `npm start`. `npm run assets` only if configured covers are missing. README.md lists optimization, packaging and optional browser dependencies. Use current QA evidence in qa/rc-verification.md; older reports describe the exported starting point.

The source folder has no project-local Git repository; do not stage into the unrelated parent home repository. Recovery snapshot is recorded in PROJECT-STATE.md. No remote or production site has been changed.

## Remaining boundaries
The frontend produces local previews only. Business/production decisions remain pending and check:launch is intentionally nonzero. No real receipts, availability, CRM, payment, tracking, contracts or public deployment should be inferred. The integration contract is a proposal for later approval.

Next: targeted review of the local RC, then representative device/accessibility verification and approved production integration. Do not claim the unavailable Python/standalone Chromium suites ran; connected Chrome and in-app verification are separately documented.
