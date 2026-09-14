# Release: hardening-0914 (security gate, live copy, delivery, SEO, dashboard usability)

**Status: BUILT LOCALLY, NOT DEPLOYED.** Source commit `beeef4d` on the local repository in this folder. All gcloud steps run in Fareed's terminal.

## Why this release is urgent
`admin/event-prep-datadome.html` embeds the DataDome contact's name, email and phone and was served to anonymous requests on the production URL (verified 2026-09-14 ~16:05 ET with an unauthenticated curl: HTTP 200, PII present). The admin HTML gate only applied under `STAGING_MODE`. This release gates every `/admin/*.html` (except login) in every mode.

## What changed (5 commits after the r3 baseline)
1. `88a5173` PROJECT-STATE r2/r3 record, domain correction, accessibility gate approved.
2. `4f760cf` Admin HTML auth gate with `?next=` return path; live landing copy no longer says "local preview / nothing is sent / V3.9 PRIVATE LOCAL PREVIEW"; inquiry button reads "Send inquiry".
3. `81177fb` gzip, Cache-Control for css/js/assets, Last-Modified/304; og:*/twitter:* on all 37 pages; richer Organization schema; favicon + longer descriptions on site pages; SEO audit fixed (0 issues).
4. `beeef4d` Dashboard: word-boundary categorization (strawberry/ginger fix), All-items tab, cross-category search, in-flight save guard, preparation-review notice, consistent 401→login, save confirmations, navigation links.

Verified locally: `npm test` 194/194; `python3 tests/run-lifecycle-browser.py` passed (lifecycle + workflow suites in fresh-profile Chrome); isolated server smoke on :3199 confirmed gzip, 600s/86400s caching, 304, Range 206, og tags, admin 303→login.

## Deploy (image-pinned, tag-first, no-traffic)
```bash
cd /Users/barsyssalesagent/Documents/Codex/Barsys-Happy-Hours-Handoff-2026-09-11/project
gcloud config get-value project            # must print happy-hour-landing-version-2
git status --short                         # must be empty
find . -type f -not -perm -o+r -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l   # must be 0

TAG=hardening-0914
gcloud builds submit --project happy-hour-landing-version-2 \
  --tag us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app:$TAG .

DIGEST=$(gcloud artifacts docker images describe \
  us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app:$TAG \
  --format='value(image_summary.digest)')

gcloud run deploy barsys-happyhours-production \
  --project happy-hour-landing-version-2 --region us-east4 \
  --image us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app@$DIGEST \
  --revision-suffix $TAG --tag $TAG --no-traffic
```

## Candidate smoke (0% traffic) — every line must match
```bash
C=https://hardening-0914---barsys-happyhours-production-23nb3wybra-uk.a.run.app
curl -sS -o /dev/null -w "root %{http_code}\n" $C/                                    # 200
curl -sS $C/api/status | grep -o '"release":"[^"]*"'                                  # ...-hardening-0914
curl -sS $C/api/ready                                                                 # {"ready":true}
curl -sS -o /dev/null -w "datadome %{http_code}\n" $C/admin/event-prep-datadome.html  # 303 (file deleted; gate answers before lookup; was 200)
curl -sS -o /dev/null -w "admin %{http_code} -> %{redirect_url}\n" $C/admin           # 303 -> .../admin/login.html?next=%2Fadmin
curl -sS -o /dev/null -w "login %{http_code}\n" $C/admin/login.html                   # 200
curl -sSI -H 'Accept-Encoding: gzip' $C/styles.css | grep -iE 'content-encoding|cache-control'   # gzip, public, max-age=600
curl -sS $C/ | grep -c 'PRIVATE LOCAL PREVIEW'                                        # 0
curl -sS $C/ | grep -o '<meta property="og:image" content="[^"]*"'                    # .../assets/lineup.jpg
```
Note: the tag URL is a different origin from `PUBLIC_ORIGIN`, so an inquiry POST from the tag URL is expected to 403 (same-origin rule). Sign-in on the tag URL also needs the tag origin in the OAuth allowlist; do not add it, just verify the redirects above.

## Flip
```bash
gcloud run services update-traffic barsys-happyhours-production \
  --project happy-hour-landing-version-2 --region us-east4 \
  --to-revisions barsys-happyhours-production-hardening-0914=100
P=https://barsys-happyhours-production-62880701168.us-east4.run.app
curl -sS $P/api/status | grep -o '"release":"[^"]*"'
curl -sS -o /dev/null -w "datadome %{http_code}\n" $P/admin/event-prep-datadome.html  # 303
```
Then sign in at `$P/admin/login.html`, open the DataDome event, check the Inventory tab (four tabs incl. "All items", type "straw" → strawberry items listed as Ingredient), and the landing page footer (no V3.9 badge).

## Rollback
```bash
gcloud run services update-traffic barsys-happyhours-production \
  --project happy-hour-landing-version-2 --region us-east4 \
  --to-revisions barsys-happyhours-production-admin-supplies-0914-r3=100
```
Rolling back re-exposes the DataDome page anonymously. If rollback is needed, delete `admin/event-prep-datadome.html` from the image first or keep the gate commit.

## After the flip
- Consider deleting `admin/event-prep-datadome.html` outright; the event lives in the database and the page is a hard-coded one-off.
- Remove stale OAuth origin `https://opjs-0914-r2---...run.app`; re-add both `run.app` production origins.
- Record the release in PROJECT-STATE.md and `deploy/production-plan.json` (`releaseRevision`, `rollbackRevision`).
