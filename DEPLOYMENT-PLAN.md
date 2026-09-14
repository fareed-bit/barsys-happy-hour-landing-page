Current acceptance evidence: [September 10 production verification](qa/production-acceptance-2026-09-10.md). Production is protected; remaining gates are still open.

Execution update: protected production is now provisioned, and staging hardening is deployed. Read [the execution report](qa/deployment-execution-2026-09-10.md) for completed work and remaining gates; the original planning baseline below is historical.

# Barsys production deployment plan

Reviewed September 10, 2026. This is the consolidated forward plan; older chronological notes describe earlier states. This review used local source, deployment records and QA evidence, not a fresh live-cloud audit. No deployment or customer-data changes were performed for this plan.

## Current position

The product is substantially built, but production has not been provisioned or activated. Last recorded staging web revision is `barsys-happyhours-staging-privacy-0910`. The latest removal changes are local only. The latest recorded local Node suite has 173 passing tests; this is not evidence that every production/browser scenario passed.

Already implemented: both inquiry planners, 27 mixlists and package eligibility, server pricing/validation, durable receipts, proposals, event operations through returns/closeout, inventory, preparation, costing, owner/crew authorization and Gmail review. Preserve existing design, approved prices and quote-only unknowns.

Staging email delivery, worker scheduling and deliberate alert delivery have passed synthetic rehearsals. A September 9 isolated staging database restore matched the then-current data and passed a write/rollback test. It predates later schema additions and does not prove production recovery. Earlier notes saying no restore or no email delivery occurred are obsolete.

`npm run check:launch` was rerun for this plan: four pending gates (service authorization, insurance, privacy, accessibility), zero pending configured media or banner references. That checker does not cover all infrastructure and security release checks below.

## Ordered work and acceptance criteria

| Order | Work | Completion evidence | Responsibility |
|---|---|---|---|
| 1 | Freeze a release candidate and reconcile release notes. Identify deployed code versus local-only changes. Inventory public assets/configuration and exclude databases, credentials, private proposals and QA data. | Reproducible build, exact image/revision manifest, dependency/security review and rollback instructions. | Engineering |
| 2 | Verify public access and abuse protection. Current limiter uses the socket peer address, which can be shared behind Cloud Run proxies. Establish a trusted client/edge strategy without blindly trusting forwarded headers. Review payload limits, auth/session expiry, owner/crew boundaries and private file serving. | Independent visitors do not share an accidental global rate bucket; spoofed headers cannot bypass limits; anonymous/non-owner users cannot access private APIs or costs. Test real Google owner and crew sessions. | Engineering |
| 3 | Close the privacy operating-process gap. Match notice to actual vendors, data, holds, review periods and rights handling. Assign Fareed the request/review process. Separate active database, imported email, original Gmail, exports and backups. | Documented request/identity-check/review procedure and realistic handling of each copy. No promise of automatic deletion where it is absent. Update privacy gate only with evidence. | Engineering + owner |
| 4 | Resolve the local removal feature before including it. Test transactions/concurrent holds, version conflicts, retries/tombstones and UI on isolated PostgreSQL. Verify restore/disposal reconciliation. | Synthetic-only PostgreSQL and browser results; removed records cannot return through stale saves, resubmission or restore. If unfinished, exclude the feature from the candidate and use a documented manual review process; do not ship an unverified destructive control. | Engineering |
| 5 | Finish accessibility and device acceptance on the candidate. Cover keyboard order, dialogs/errors, visible focus, zoom/text spacing, VoiceOver, Safari/iPhone and Android, reduced motion and video pause. Include new Records controls and dashboard workflows. | Recorded device/browser results and fixes for blocking defects. Prior automated passes remain useful but are not a full WCAG conformance claim. | Engineering + human device reviewer |
| 6 | Establish operational email recovery. Provide a usable failed/unknown queue view and written investigation procedure. Never automatically resend ambiguous messages; check Sent mail first. Add missed-run detection for the independent health monitor itself. | Queue failure, worker silence and monitor silence are detected; Fareed receives alerts; recovery avoids duplicate email. Establish tested volume and queue-delay expectations. | Engineering + Fareed |
| 7 | Provision isolated production, initially protected with email enqueue off. Validate current GCP tier support and recurring cost before resource creation. Use dedicated DB, credentials and runtime identity; configure backups/PITR, deletion protection, secrets and budget alerts. | Production plan values verified; generated HTTPS origin configured; Google login origins registered; least-privilege runtime access checked; no staging data copied wholesale. | Engineering |
| 8 | Seed approved business configuration only. Move reviewed menu/package rules and approved catalog/cost configuration. Keep unavailable prices explicitly unknown. Decide separately whether any genuine staging events need controlled migration. | Public menu choices and server quote rules agree; no test events, stale inventory or internal ingredient costs leak onto the landing page. | Engineering + owner for real-data selection |
| 9 | Recreate production worker, scheduler, monitoring and uptime checks. Validate sender configuration, access and alert destinations. Test current-schema backup recovery into an isolated target and record recovery duration. | Production synthetic inquiry produces one stored receipt and expected emails to controlled test recipients; alert and restore evidence; documented rollback uses valid secrets and compatible schema. | Engineering |
| 10 | Run final end-to-end acceptance and release. Test both planners, package changes, validation, receipt/error recovery, proposal totals, inventory reservations, staff hours, preparation, dispatch/returns and financial closeout. Inspect exported files. Check mobile layout/media and a logged-out navbar. | All critical tests pass on the exact candidate; public visitors can inquire, only authorized staff see/access the dashboard; no duplicate submissions/emails. Record known nonblocking limitations. | Engineering + Fareed walkthrough |
| 11 | Activate live inquiries and monitor. Switch operating mode and enqueue together; verify public wording and readiness. Inspect initial submissions, delivery, queue delay and errors. | Successful live-mode controlled smoke test; tested rollback trigger/procedure; clear owner for alerts and daily queue review. | Engineering + Fareed |

## Business documents and event-specific checks

Barsys Inc., its address, Fareed's contact, Barsys as the alcohol-service operator and the owner's statement that a COI exists are recorded. The certificate and applicable service documents have not been reviewed.

- Supply the private location of the COI and applicable alcohol-service documents. Record coverage dates, limits, responsible operator and venue-specific requirements with the relevant insurer/adviser. Do not publish the certificate or infer universal coverage/authorization.
- The repository currently treats these as launch gates. Resolve that classification explicitly: website inquiry intake and authorization to fulfill a specific event are different decisions. Do not silently mark either gate approved or describe every venue document as a universal website-launch requirement.
- Event confirmation/dispatch must preserve the applicable venue, insurance and service checks. Public inquiry copy must not promise an unreviewed approval or insurance limit.

The owner has already authorized production continuation. No repeat blanket deployment or company-asset approval is needed. Domain/DNS changes remain excluded. First activation can use the generated Cloud Run HTTPS address; moving to happyhours.barsys.com is a separate later step.

## Open items that need not become an endless launch expansion

- Full automated Gmail-copy removal with reimport/conversion protection, coordinated old-event anonymization and comprehensive retention-change history remain unimplemented. A credible manual process can support initial launch; automation must precede any automatic-enforcement claim. Backup reconciliation is required before restoring deleted data into service.
- Further inventory shortcuts, purchasing automation, CRM, payments and analytics are not necessary to launch inquiry intake. Do not add them to this release.
- Real operating data still needs entry: available stock, staff assignments, vendor prices, actual expenses and returned/unused inventory. The system cannot produce reliable profit from missing values. Distinguish revenue, purchased cash cost, consumed cost and remaining stock; show unknown costs instead of treating them as zero.
- Search indexing is separate: current server sends noindex. Decide deliberately when to permit indexing; do not accidentally index staging. Custom domain remains deferred.
- Capacity/load validation must match the intended initial traffic. Larger-volume scaling and regional failover can be planned from measured demand; neither is established by a passing small synthetic test.

## Tool blockers and how to clear them

Local isolated PostgreSQL initialization failed because the sandbox denied shared memory. Fresh automated Chrome also failed before page execution; native Chrome became unreliable for mobile inspection. These are missing test evidence, not confirmed product failures. Use the known-working regular-Terminal browser environment or an approved isolated test environment, and isolated PostgreSQL on a supported runner/GCP target. Do not test removal on real records or bypass permissions through browser-driven shell commands.

## Release definition

Deploy when the exact candidate passes public/authenticated workflow and accessibility acceptance, production recovery and notifications are verified, private data stays private, abuse controls behave correctly, privacy procedures match the notice, operational gates have evidence-backed disposition and rollback is usable. Do not equate a green Node suite or a four-item gate file with complete production readiness.

Evidence: PROJECT-STATE.md; reference/launch-gates.json; deploy/production-plan.json; qa/retention-disposal-2026-09-10.md; qa/production-preparation-2026-09-10.md; qa/retention-monitoring-2026-09-10.md; qa/email-rehearsal-2026-09-10.md; ../../outputs/RECOVERY-VERIFICATION.md.
