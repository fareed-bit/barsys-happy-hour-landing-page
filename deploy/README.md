# Private staging deployment

Authorized by the owner on 2026-09-09: deploy the staging setup, **do not create a domain**. This supersedes the earlier local-only boundary for staging infrastructure, not for DNS or the existing live website.

The concrete resource plan is staging-plan.json. Use only happy-hour-landing-version-2 and the fareed@barsys.com deployment identity. A small single-zone PostgreSQL instance is appropriate for this test environment; it is not the proposed production availability configuration. Cloud SQL incurs ongoing charges even with an idle Cloud Run service. Final current pricing is to be checked in Google Cloud before provisioning.

## Current deployment status (2026-09-09)

Deployment and verification complete. Read STAGING-ACCESS.md for the generated URL, resources, tests and rollback instructions. No domain or DNS changes. Billing payment warning remains for the owner, but resources are running and billing is enabled.

## Completed preparation

- STAGING_MODE=1 protects the planner and dashboard with server-side Google authorization; signed-out POST /api/inquiries is rejected.
- NODE_ENV=production enables Secure __Host- session cookies and requires PostgreSQL and an HTTPS PUBLIC_ORIGIN.
- Staging inquiry receipts and dashboard labels clearly identify test data. It sends no messages and creates no bookings.
- Rate limits now use the shared database instead of in-process memory, so two Cloud Run instances share counters. The proxy address is deliberately treated conservatively as a shared source; a production public intake should add a verified edge/client-identity abuse strategy.
- .gcloudignore and .dockerignore exclude environment files, local databases, test reports, dependencies and generated standalone HTML from source uploads.

## Execution sequence after account access and billing are ready

1. Re-read project, billing, Cloud SQL and Cloud Run metadata with explicit --project and --account flags. Reuse matching resources; do not duplicate or touch other projects.
2. Enable only Cloud Run, SQL Admin, Cloud Build, Artifact Registry and Secret Manager APIs.
3. Create separate runtime and build service accounts. Runtime gets Cloud SQL Client and access to its database secret only. Build gets Cloud Run Builder; operator needs permission to deploy as those identities.
4. Create the small PostgreSQL staging instance with no authorized public networks, daily backups, deletion protection and a bounded storage-growth policy. Create an application database and an application role with access limited to that database/schema; do not run the app as postgres or cloudsqlsuperuser.
5. Generate database credentials in memory and send them directly to Secret Manager. Do not put passwords in shell command arguments, logs, source or deployment output. Grant the runtime identity access only to that secret.
6. Connect through the authenticated Cloud SQL connector/proxy; run adapter integration checks on the real PostgreSQL database, including session/nonce/rate-limit queries, duplicate insert races and optimistic updates.
7. Build the Dockerfile with Cloud Build and deploy Cloud Run with the SQL connection, database secret, GOOGLE_CLIENT_ID, STAGING_MODE=1 and HTTPS PUBLIC_ORIGIN. Use its generated run.app URL; no domain mapping. Runtime authentication is handled by the verified Google application session, so permit the login page to be reached while protecting all event data in the app.
8. Add only the verified generated run.app origin to the existing Google OAuth client's JavaScript origins, preserving the current entries. Keep the single authorized test user. No production publishing or new OAuth scopes are needed for private staging.
9. Test HTTPS, real Google login/logout, signed-out denial, both wizard routes, duplicate retries, save/edit/export, rate limits and persistence. Store only synthetic test data. Save the exact service URL, revision, resource inventory and rollback instructions in PROJECT-STATE.md and the user-facing deployment report.
