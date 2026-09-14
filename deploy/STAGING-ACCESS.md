# Current access / recovery update — September 9

Latest source state is in PROJECT-STATE.md. Staging now uses database secret version 2; version 1 is disabled following credential rotation. Do not direct traffic to old revisions pinned to version 1. Restore drill succeeded on an isolated copy; see the recovery verification report. Fareed is owner; explicitly enabled active Barsys staff can use the restricted crew view for assigned events. No new crew account has been enabled. OAuth remains in Testing and may require approved test users.

Historical setup details follow and are superseded where noted above.

# Barsys Happy Hours — private GCP staging

Deployed and verified September 9, 2026.

Open https://barsys-happyhours-staging-23nb3wybra-uk.a.run.app/admin and sign in with **fareed@barsys.com**. After login, use **Open planner** to view the landing page; its **Dashboard** button brings you back. Bookmark this URL. It works independently of the local computer/server.

No custom domain or DNS was created or changed. The existing happyhours.barsys.com site was not replaced. Google Sheets was not connected or imported.

## What is running

| Resource | Configuration |
| --- | --- |
| GCP project | happy-hour-landing-version-2 (62880701168) |
| Region | us-east4 |
| Cloud Run service | barsys-happyhours-staging |
| Serving revision | barsys-happyhours-staging-verified-0909; 100% traffic |
| Runtime | Node 24, non-root container; 1 CPU, 512 MiB; scales from zero, service maximum two instances |
| Cloud SQL | barsys-happyhours-staging-db; PostgreSQL 16; db-g1-small; single zone |
| Database | barsys_events_staging; separate application role without superuser, database-creation or role-creation privileges |
| Storage | 10 GB SSD; automatic growth capped at 20 GB |
| Backups | Daily at 07:00 UTC, seven retained; point-in-time recovery with one day of transaction logs; deletion protection |
| SQL network | No authorized public networks; encrypted connections through Cloud SQL proxy/socket |
| Secret | barsys-staging-database-url, version 1; runtime identity can read this secret |
| Runtime identity | barsys-staging-runtime; Cloud SQL Client plus access to this secret |
| Build identity | barsys-staging-build; Cloud Run Builder |
| Container repository | us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app |
| Image digest | sha256:0756d03a8bb18a9df098509ede35b952855e1e8cc8c3925abf3c5e185ffed5d5 |
| Successful build | 706a46ac-c66f-4cce-9cc3-cfcf96678425 |

The sign-in page is publicly reachable. The planner, dashboard and inquiry API require the exact authorized Google identity, checked on the server. Google OAuth remains in Testing with Fareed as the sole test user. The generated staging origin was appended to the existing client; existing origins were preserved. No new OAuth scopes or production audience publishing.

Cloud SQL has ongoing charges even while Cloud Run is idle. This is a small staging configuration, not high-availability production infrastructure. Google reports billing enabled and the account open, but its console also shows a past-due/invalid-payment-information warning. **Review the billing account's Payment overview to avoid service interruption.** No payment method was changed. No fixed monthly price or spending cap is claimed.

## Verified

- All 57 Node tests pass.
- Initial automated backup 1788977114033 and post-verification backup 1788977412200 both completed successfully. Restore drill remains untested.
- Real PostgreSQL checks: restricted application role, duplicate insert race, optimistic edit conflicts, single-use nonces, sessions, shared rate limits and persistence after reconnect.
- Real Google sign-in on HTTPS as fareed@barsys.com; dashboard button; logout; direct dashboard navigation rejected after logout.
- Anonymous planner access redirects to sign-in; anonymous event API requests return 401; environment-file access returns 404.
- Both wizard routes save synthetic events in Cloud SQL. Custom event retains Fluid Code, 65 guests and one additional service hour. Unknown tax and final total stay unknown; no unapproved price added.
- Dashboard search, owner/status/note updates and email-attributed history; exported event JSON verified on disk.
- Planner JSON and HTML summary downloads verified on disk with the expected synthetic name, menu and duration.
- New Cloud Run revision retained both saved events and the authenticated session.
- All eight menu covers load without accepting privacy choices; hero and experience videos play muted and pause/resume.
- Desktop interactions and 390-pixel mobile planner/dashboard inspection; no physical-device or full accessibility audit claimed.

Two clearly synthetic examples remain for review:
- Quick: cea69fa5-b38a-4c34-af17-fad95623337d
- Custom: 3c22e7d7-c631-48df-9c1d-bbc6dff2221e

The custom example's “contacted” status is a test label only; nobody was contacted. Adapter-only test rows were removed. Local SQLite records and environment files were excluded from upload. No customer emails, bookings, payments, tracking, CRM or marketing enrollment were triggered.

## Updating and rollback

Source remains the existing vanilla project under work/barsys-after-hours-v3-9. Dockerfile and deploy/cloudbuild.yaml are included. Always specify the project and account explicitly: the machine's default gcloud project belongs to another application.

The previous working revision is barsys-happyhours-staging-00002-2qd. To roll back a later incompatible app release, first confirm its schema compatibility, then direct traffic to this revision:

```sh
gcloud run services update-traffic barsys-happyhours-staging --to-revisions=barsys-happyhours-staging-00002-2qd=100 --region=us-east4 --project=happy-hour-landing-version-2 --account=fareed@barsys.com
```

Do not roll back to 00001: it used the temporary origin before the generated URL was available. Traffic rollback does not restore database content. A backup restore drill has not been performed; do it on a separate instance before trusting a production recovery procedure. Do not delete the database or disable deletion protection during routine rollback.

To take staging off the external internet without deleting data, an authorized operator can set Cloud Run ingress to internal. This does not stop SQL charges. Stopping/deleting infrastructure requires a separate deliberate cost/data-retention decision.

## Before public launch

Keep STAGING_MODE=1 for this environment. The public-launch checker intentionally still fails: approved operational/commercial terms, data retention/privacy handling, banner claims and representative-device/accessibility review remain pending. Public intake also needs a production abuse-control strategy; the current database rate limiter conservatively shares the proxy-address bucket. Notifications, production inquiry handling and production availability/recovery decisions are not implemented by this staging deployment. No domain work is needed until the owner requests it.
