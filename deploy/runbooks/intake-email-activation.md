# Public intake and customer email activation — runbook (draft, unapproved)

**Status: DRAFT. Nothing here is scheduled or authorized. Do not run any step until owner explicitly says "activate intake" and separately "activate customer email".**

**Preconditions asserted, not assumed**: production revision `barsys-happyhours-production-site-0911` is serving 100% traffic on `https://barsys-happyhours-production-62880701168.us-east4.run.app/`, build `1c0732f5-34be-4306-8801-3d78b7f510e0`; rollback target `barsys-happyhours-production-privacy-a11y-0910`. Public intake OFF, customer email OFF, indexing OFF. `qa/site-expansion-0911/README.md`, `qa/mobile-a11y-0911/README.md`, `qa/mobile-a11y-0911/voiceover-result.md`, and `qa/dns-search-console-dryrun-0911/README.md` on record. VoiceOver owner-run pass complete 2026-09-11 (owner-attested).

**Observed state as of 2026-09-11 read-only probe**: `/` and `/site/packages.html` return HTTP 303 to `/admin/login.html` (staff sign-in guard is on). `/api/status.mode` is `STAGING_TEST`. `robots.txt` is `Disallow: /`. `sitemap.xml` is empty. These are the pre-activation defaults; this runbook is what flips them.

Activation is a two-lever change: (A) allow anonymous customers to create inquiries; (B) allow the notification worker to deliver customer-facing mail. Each lever is independent and each has its own halt condition. **Do not enable both in one deploy.**

---

## Change set summary (what actually flips)

- **Public intake ON**: unset the staff-only guard used through September 10. In the current code path, anonymous save is allowed by default at the API layer once `STAGING_MODE` is off (`backend/api.mjs` `anonymous` handler runs in live mode; anonymous rate-limiting applies through the proxy). No public UI is currently gated behind staff sign-in on the landing/planner path, but the site expansion pages are protected via `noindex` and by intake being effectively rejected in staging mode. Confirm on the candidate revision that:
  - `/api/status` returns `release=<candidate>` and does not carry `STAGING_TEST`.
  - An anonymous synthetic POST to the inquiry API succeeds and returns a receipt id.
- **Customer email ON**: the notification worker (`background-gmail.mjs`, dispatch via GCP Scheduler) currently accepts jobs but the September 10 email rehearsal used a synthetic rehearsal marker (`TEST ONLY - Email delivery rehearsal` + `fareed@barsys.com`) to prevent unintended sends. Removing the marker and allowing normal customer recipients constitutes customer email activation. Reference: `qa/email-rehearsal-2026-09-10.md`.

Environment variables in play, **verified against `backend/server.mjs` and `backend/api.mjs` on 2026-09-11**:

| Variable | Production today | Post-intake activation | Post-email activation | Effect |
|---|---|---|---|---|
| `STAGING_MODE` | `1` | **unset** (or `0`) | unset | Controls anonymous view (server.mjs:33), anonymous POST guard (api.mjs:45), and the customer-email safety belt (api.mjs:53). |
| `BARSYS_BACKGROUND_EMAIL_ENABLED` | `0` | `0` | `1` | Enables the notification queue (server.mjs:19). Only dispatches to real customers when combined with `STAGING_MODE` unset. |
| `PUBLIC_ORIGIN` | Cloud Run URL | unchanged | unchanged | Used for canonical URLs and OAuth origin binding. |
| `BARSYS_INDEXING_ENABLED` | unset | unset (separate decision) | unset (separate decision) | Only relevant to the DNS/Search Console runbook. |

**The two-lever separation collapses to one primary lever plus one secondary lever**:
- Intake activation = unset `STAGING_MODE`. That single flip opens both anonymous view and anonymous POST.
- Customer email activation = set `BARSYS_BACKGROUND_EMAIL_ENABLED=1` while `STAGING_MODE` remains unset from the prior deploy. Between the two deploys, customer email is safely off because `api.mjs:53` requires `!staging && !local` and `queueNotifications=true`.

Do NOT change either flag except through the ordered deploys below.

---

## Order of operations

0. **Confirm gcloud context.** Before any `gcloud run deploy`, run `gcloud config get-value project` and require the output to equal the production project ID. As of 2026-09-11, the Mac's active project is `barsys-coaster`, which is NOT the production project. Do not proceed until you've explicitly `gcloud config set project <production-project-id>` and re-confirmed. This precondition failing has already misfired one command in this session.
1. Confirm the two prior evidence records are still on record and unchanged: `qa/public-intake-2026-09-10.md`, `qa/email-rehearsal-2026-09-10.md`.
2. Confirm `qa/mobile-a11y-0911/voiceover-checklist.md` has an owner-signed completion note. If not, halt.
3. Run `npm test` locally; require 185/185. If regression appears, halt.
4. Run the live-mode contract test: `node --test tests/public-live-mode.test.mjs`. Require pass. This test uses a synthetic HTTPS origin and isolated SQLite store to exercise `LIVE` mode without touching production.
5. Deploy a **candidate** revision with intake enabled but customer email disabled. This deploy is also what flips `STAGING_MODE` from `1` to `0`. Do NOT route customer traffic to the candidate yet.

   Exact command (fill `<IMAGE_DIGEST>` from the current Cloud Run revision `barsys-happyhours-production-site-0911`; do NOT rebuild for this activation — same code, env flip only):

   ```bash
   # STEP 5a. Confirm gcloud context (from step 0). Fail loudly if wrong.
   test "$(gcloud config get-value project 2>/dev/null)" = "happy-hour-landing-version-2" || { echo "WRONG PROJECT; halt"; exit 1; }

   # STEP 5b. Read the current image so we deploy the SAME code with only env flipped.
   IMAGE=$(gcloud run revisions describe barsys-happyhours-production-site-0911 \
     --region us-east4 \
     --format='value(spec.containers[0].image)')
   echo "Deploying image: $IMAGE"

   # STEP 5c. Deploy candidate with STAGING_MODE removed. --no-traffic keeps it off customer path.
   gcloud run deploy barsys-happyhours-production \
     --image "$IMAGE" \
     --region us-east4 \
     --revision-suffix intake-0912 \
     --no-traffic \
     --tag candidate-intake \
     --remove-env-vars STAGING_MODE \
     --update-env-vars BARSYS_BACKGROUND_EMAIL_ENABLED=0
   ```

   Verify on the candidate revision URL (printed by the deploy as `https://candidate-intake---barsys-happyhours-production-...run.app`), not on the production URL:

   ```bash
   CAND=<candidate-intake URL from deploy output>
   curl -sI "$CAND/"                    # expect HTTP/2 200, NOT 303
   curl -s  "$CAND/api/status" | jq .   # expect mode!=STAGING_TEST
   curl -s  "$CAND/api/ready"  | jq .   # expect ready:true
   ```

   If any assertion fails, halt and delete the candidate: `gcloud run revisions delete barsys-happyhours-production-intake-0912 --region us-east4 --quiet`.

6. On the candidate revision URL, run the anonymous synthetic path documented in `qa/public-intake-2026-09-10.md` (25 guests / Signature, synthetic contact, no menu selection stored). Require receipt id and explicit `booked=false`.
7. If step 6 passes, switch 100% production traffic to the candidate. Keep rollback target `barsys-happyhours-production-privacy-a11y-0910` for at least 24 hours after step 7.
8. Observe for 24 hours: `/api/ready`, `/api/status`, worker execution logs, PostgreSQL row counts for `inquiries`. Any missing-run alert requires halt.
9. Only after 24 clean hours, deploy a **second candidate** with customer email enabled. This is the destructive step. Repeat steps 3–7 for this deploy.
10. First customer email should be a **synthetic** inquiry from the owner mailbox with a rehearsal-style label, verified end-to-end (Gmail Inbox subject `Barsys inquiry received` + `New Barsys inquiry`, both carrying the same id) before real customer submissions are accepted.

---

## Halt conditions

- Any test regression, any dropped notification job, any duplicate email, any 5xx spike, any missing scheduler run, any Cloud Run revision failing readiness for more than three consecutive checks, any PostgreSQL replication lag alert.
- Any owner-visible loss of the staff sign-in path or the authenticated dashboard.
- Any indication that anonymous requests can reach admin routes. Reference the anonymous denial assertions in `tests/public-live-mode.test.mjs`.

## Rollback

- Immediate rollback: `gcloud run services update-traffic barsys-happyhours-production --to-revisions barsys-happyhours-production-privacy-a11y-0910=100 --region us-east4`.
- If the destructive step was email activation, rolling back the revision restores the customer-email-off state. If a real customer email was delivered before rollback, log it in `DECISION-REGISTER.md` and follow `backend/EMAIL-RECOVERY-RUNBOOK.md`.
- Rollback does not automatically clear the notification queue. After rollback, execute a read-only Cloud Run job to inspect job counts and status (same pattern used on September 10, execution `barsys-notifications-x78sm`).

## Evidence to capture

Every step above must produce one of:
- A `gcloud run services describe` output showing the intended revision and env vars.
- A `curl` or authenticated Chrome record of `/api/status` and `/api/ready`.
- A PostgreSQL read-only Cloud Run execution log showing new rows and job status.
- A Gmail Inbox screenshot (or IMAP verification) of the two synthetic messages.

Save all evidence under `qa/intake-email-activation-<YYYY-MM-DD>/` and append a new dated section to the top of `PROJECT-STATE.md`.

## Explicit non-goals for this runbook

- No DNS change.
- No custom domain change.
- No `BARSYS_INDEXING_ENABLED=1` (separate runbook).
- No historical backfill.
- No marketing announcement.
- No CRM sync.
- No payment step. A plan remains an inquiry, not a booking.

## References

- `qa/public-intake-2026-09-10.md`
- `qa/email-rehearsal-2026-09-10.md`
- `deploy/PRODUCTION-RELEASE.md`
- `backend/EMAIL-RECOVERY-RUNBOOK.md`
- `backend/BACKGROUND-EMAIL.md`
- `tests/public-live-mode.test.mjs`
- `AGENTS.md` (hard rules)
