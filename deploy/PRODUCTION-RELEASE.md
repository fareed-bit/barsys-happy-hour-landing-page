# Production candidate preparation

Owner authorization to proceed is recorded; do not request the same general approval again. No custom domain or DNS changes. Current production resource names and configuration are in production-plan.json. These resources have not been created.

1. Verify current GCP regional tier support/pricing and account billing. Create the dedicated production instance/database and restricted application role; do not copy staging records, sessions or personal data.
2. Bind a separate database secret to a dedicated production runtime identity. Permit Cloud SQL connector access and access only to required secrets. Do not put secret values in command arguments, source, output or logs.
3. Deploy reviewed image in protected review mode first. Obtain its generated HTTPS URL, set exact PUBLIC_ORIGIN, then preserve existing Google OAuth origins while adding this one. Verify owner login/logout and crew boundaries on that actual origin.
4. Copy only approved, reviewed menu policy/configuration after checking that package availability matches the website. Do not copy event/inventory/staff/session databases from staging.
5. Configure production worker, independent monitor, readiness uptime checks and failure recipients. Verify backups and an isolated restore. Verify missing-run alerting for the monitor itself, not only for the email worker.
6. Finish accessibility/representative-device review and remaining recorded service/privacy gates. Review expired-record deletion/anonymization procedure: current retention controls only flag review dates and holds.
7. Exercise synthetic public inquiry persistence, retries, menu validation, private-route denial and both notification receipts on the candidate before enabling ordinary customer delivery. Use an explicit synthetic recipient restriction for any protected rehearsal. Verify rate limiting under the actual proxy/client-IP setup.
8. Enable public intake/email only after that evidence is complete. Keep generated URL and noindex until the separate indexing decision; public intake does not imply DNS changes. Post-release checks and a known same-database rollback revision are required.

Current limitation: repeated isolated browser launches fail before page execution in the Codex sandbox; connected Chrome and owner-run browser evidence are distinct. Neither represents a completed screen-reader audit. Do not record certification or a successful production rehearsal based on staging results.

## September 11 site expansion
`npm run preview` now rebuilds the 36 content pages as well as standalone HTML. Canonical URLs use PUBLIC_ORIGIN. Indexing defaults off and additionally requires BARSYS_INDEXING_ENABLED=1 with STAGING_MODE disabled and HTTPS. Keep it off on the generated Cloud Run origin during protected review. Change PUBLIC_ORIGIN only with the separately authorized domain setup. robots.txt and sitemap.xml are runtime-generated; source/QA/private documents are excluded from sitemap. Actual assistive acceptance and new-page mobile review remain required before recording accessibility as complete.
