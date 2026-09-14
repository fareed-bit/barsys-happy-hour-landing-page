# DNS cutover and Search Console enablement — runbook (draft, unapproved)

**Status: DRAFT. Nothing here is scheduled or authorized. Do not run any step until owner explicitly says "point DNS" and separately "enable indexing".**

DNS and Search Console are two independent gates and must NOT be run as a single change. The current production revision `barsys-happyhours-production-site-0911` serves at `https://barsys-happyhours-production-62880701168.us-east4.run.app/`. `BARSYS_INDEXING_ENABLED` is off; `X-Robots-Tag: noindex, nofollow` is unconditional in `backend/server.mjs` line 24 and only relaxed for `sitePaths` when `seo.enabled` is true. `seoSettings` in `backend/site-seo.mjs` requires **all four** of `indexing==='1'`, `!staging`, `!local`, and `url.protocol==='https:'` — no code change is required to gate indexing safely.

---

## Preconditions

- **gcloud context matches production.** Run `gcloud config get-value project` on the operator's machine and require the output to equal the production GCP project ID (not `barsys-coaster`, which was the active project on 2026-09-11). If mismatch, `gcloud config set project <production-project-id>` and re-confirm before running any A2/A4/A5 step. This runbook triggers Cloud Run domain mappings and cert issuance — silently running them against the wrong project produces confusing failures at best and cross-project artifacts at worst.
- **Anonymous view is unlocked on the Cloud Run generated origin.** Confirmed by `curl -sI https://<generated-origin>/` returning **HTTP 200**, not 303 to `/admin/login.html`. As of 2026-09-11 the production revision `barsys-happyhours-production-site-0911` still returns 303; this precondition is not yet met and is unlocked as part of the intake activation runbook.
- **`STAGING_MODE=0` on the production revision.** Confirmed by `/api/status` reporting `mode` other than `STAGING_TEST`. As of 2026-09-11 production reports `STAGING_TEST`; this is a hard safety belt (`seoSettings()` in `backend/site-seo.mjs` refuses indexing while staging). Also unlocked as part of the intake activation runbook.
- Public intake and customer email activation runbook complete and stable for at least 7 days on the Cloud Run generated origin.
- Owner-run VoiceOver checklist complete.
- A registrar-side change window scheduled with the owner. This runbook does **not** attempt to identify the registrar.
- A rollback DNS record set is captured and stored before any change.

---

## Part A: Custom domain and DNS cutover

Cloud Run's domain mapping model requires a managed TLS certificate that is issued only after the DNS records point at Google. Expect a 15–60 minute propagation window depending on TTL.

### A1. Choose the exact hostname

Owner decision. Common patterns are `happyhours.barsys.com` (subdomain of an existing zone) or `barsyshappyhours.com` (new apex). Do not proceed without this being written into `DECISION-REGISTER.md`.

### A2. Reserve the domain mapping in Cloud Run

```
gcloud run domain-mappings create \
  --service barsys-happyhours-production \
  --domain <chosen-host> \
  --region us-east4
```

Capture the returned record set (`A` / `AAAA` records for apex or `CNAME ghs.googlehosted.com` for subdomain). Save output to `qa/dns-cutover-<YYYY-MM-DD>/domain-mapping.txt`.

### A3. Lower TTL 24 hours ahead of cutover

Reduce the existing TTL on the target hostname to 300 seconds at the registrar. This step is done in advance so a rollback resolves quickly.

### A4. Cutover

Set the DNS records exactly as returned in step A2. Do not add other records. Do not remove `MX` or other existing zone records.

### A5. Verify

Assumes both preconditions above are met, so `curl` reaches a rendered page rather than a login redirect. If either precondition is not met, do NOT continue — return to the intake activation runbook.

- `dig <chosen-host> A +short` (or `CNAME +short` for a subdomain) returns Google's servers.
- `curl -sI https://<chosen-host>/` returns **200** and includes `x-robots-tag: noindex, nofollow` (still off).
- `curl -sI https://<chosen-host>/site/packages.html` returns **200** and includes `x-robots-tag: noindex, nofollow`.
- `openssl s_client -connect <chosen-host>:443 -servername <chosen-host> </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates` shows a Google-issued cert with a start date at or after cutover.

### A6. Update `PUBLIC_ORIGIN`

The environment variable `PUBLIC_ORIGIN` is read by `backend/server.mjs` and used for canonical URLs, sitemap URLs, and the schema.org record. It must match the customer-facing hostname exactly. Update it in a new revision, deploy as candidate first, verify canonical URLs, then switch traffic. Reference: `deploy/PRODUCTION-RELEASE.md` step 3.

Verification:
- `curl -s https://<chosen-host>/site/packages.html | grep -oE '<link rel="canonical"[^>]*>'` shows `https://<chosen-host>/site/packages.html`.
- OAuth consent screen still lists the correct authorized origins. Add the new origin **without removing** the Cloud Run generated origin, and confirm owner login/logout on both. Reference: `backend/GOOGLE-LOGIN.md`.

### A7. Halt conditions for Part A

- Cert issuance fails after 90 minutes: revert DNS and open a support case.
- Any 5xx from Cloud Run on the new hostname.
- Any customer-visible mixed-content warning.
- Any drop in the authenticated dashboard reachability.

### A8. Rollback for Part A

Revert the DNS record set to the pre-change values captured in A3. If `PUBLIC_ORIGIN` was updated, roll traffic back to the `site-0911` revision and reset `PUBLIC_ORIGIN` to the Cloud Run generated origin.

---

## Part B: Enable search indexing

Indexing is gated by `seoSettings()` in `backend/site-seo.mjs`. It requires **all four**:

1. `BARSYS_INDEXING_ENABLED=1`
2. `STAGING_MODE` != `1` — as of 2026-09-11 production still has `STAGING_MODE=1` (see qa/dns-search-console-dryrun-0911/README.md finding 5). This must be flipped by the intake activation runbook before Part B can proceed.
3. Local mode off
4. `PUBLIC_ORIGIN` uses `https:`

Once `seo.enabled=true`, `sitePaths` receive `X-Robots-Tag: index, follow`, `decorate()` rewrites the `<meta name="robots">` to `index,follow`, and `/sitemap.xml` starts listing site pages.

**Do NOT enable indexing before Part A is stable for at least 7 days on the custom domain.**

### B1. Prepare Search Console properties

- Register both the custom hostname and the Cloud Run generated origin as separate properties, or register the domain-property variant on the registrar. This lets you observe the transition.
- Verify ownership by DNS `TXT` record. Do not remove Google verification records after verification succeeds.
- Do **not** submit a sitemap until B4.

### B2. Deploy candidate with indexing on

```
gcloud run deploy barsys-happyhours-production \
  --revision-suffix indexing-<YYYYMMDD> \
  --set-env-vars BARSYS_INDEXING_ENABLED=1 \
  --no-traffic \
  --region us-east4
```

Verify against the candidate revision URL directly (via `--to-revisions ... =100` in a temporary slot, or via revision-URL alias):
- `curl -sI https://<candidate-url>/site/packages.html` shows `x-robots-tag: index, follow`.
- `curl -s https://<candidate-url>/site/packages.html | grep -oE '<meta name="robots"[^>]*>'` shows `content="index,follow"`.
- `curl -s https://<candidate-url>/robots.txt` allows crawling of `/site/`.
- `curl -s https://<candidate-url>/sitemap.xml` lists exactly the 36 site pages plus `/`, and lists **no** admin, planner, or QA URLs.

### B3. Switch traffic

`gcloud run services update-traffic ... --to-revisions <indexing-candidate>=100`.

### B4. Submit the sitemap to Search Console

- Submit `https://<chosen-host>/sitemap.xml` to the custom-hostname property.
- Do not request indexing on individual URLs; let the crawler pick them up. Manual indexing requests count against a small daily quota.
- Watch the `Coverage` report for at least 7 days. Expect early rows in `Discovered - currently not indexed` and `Crawled - currently not indexed`; these are normal for a new domain.

### B5. Halt conditions for Part B

- `sitemap.xml` includes any admin, planner, api, or `/qa/` URL. Halt and inspect `backend/site-seo.mjs` and `site/pages.json`.
- Any `noindex` remains on the site pages after B2 (typical cause: `STAGING_MODE=1` still set).
- Search Console reports a large jump in errors within 24 hours.
- Any content shows up in search results that is not on `sitePaths`.

### B6. Rollback for Part B

Unset `BARSYS_INDEXING_ENABLED` and redeploy. `noindex, nofollow` reverts unconditionally within seconds. Existing search results will take days to age out; do not attempt bulk URL removal in Search Console unless owner authorizes it.

---

## Evidence to capture

- Registrar screenshots or exports of the before/after record set.
- `gcloud run domain-mappings describe` output showing certificate `Active` state.
- `curl` transcripts for each verify step (`X-Robots-Tag`, canonical, robots meta).
- Search Console screenshots showing property verification, sitemap submission, and initial coverage.

Save under `qa/dns-search-console-<YYYY-MM-DD>/` and append a new dated section to the top of `PROJECT-STATE.md`. Reference the new revision in `deploy/PRODUCTION-RELEASE.md`.

## Explicit non-goals for this runbook

- No customer email flag changes (separate runbook).
- No public intake flag changes (separate runbook).
- No marketing announcement.
- No changes to schema.org record fields beyond origin substitution.
- No structured-data expansion beyond the current `Organization` schema.
- No third-party analytics injection.

## References

- `backend/site-seo.mjs`
- `backend/server.mjs`
- `deploy/PRODUCTION-RELEASE.md`
- `backend/GOOGLE-LOGIN.md`
- `AGENTS.md` (hard rules)
