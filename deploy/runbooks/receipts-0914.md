# Release: receipts-0914 (Gopuff receipt upload — photo + amount, expense export)

**Status (2026-09-14 ~19:20 ET): DEPLOYED at 0%.** Source `ec725be`. Image `us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app@sha256:073bc9dea17c6fc809befb52b564ff5648a50ae42f8f834ce37678b9c9632d2b`, revision `barsys-happyhours-production-receipts-0914`, tag URL `https://receipts-0914---barsys-happyhours-production-23nb3wybra-uk.a.run.app`. `BARSYS_RECEIPT_BUCKET` set on the revision; startup log `Receipts: gcs`. Candidate smoke below passed on every line. **Flip pending owner.** Brief: `receipt-upload-brief.md`. Rollback stays `match-0914`; receipts are additive, so rolling back only hides the upload form (uploaded objects stay in the bucket and the rows stay on the event).

## What shipped
- **Storage** `backend/receipt-files.mjs`: private bucket `gs://happy-hour-landing-version-2-receipts` (us-east4, uniform access, public-access prevention, versioning on; 7-day soft delete default). Runtime SA `barsys-production-runtime` has `roles/storage.objectAdmin` on this bucket only. Objects are written with the GCS JSON API through the service account token (`ifGenerationMatch=0`, never overwritten). Object path `events/<eventId>/receipts/<uuid>.<jpg|png|pdf>`. Local/test mode writes under `../barsys-data/receipts/` (or `BARSYS_RECEIPT_DIR`). Production without the env var answers uploads with 503 and never writes to instance disk.
- **Viewing** is a proxy GET (owner session, `Cache-Control: no-store`, `nosniff`, inline or `?download=1`). No signed URLs, no public objects.
- **Backend** `backend/api.mjs`: `POST /api/admin/inquiries/:id/receipts` (owner-only, same-origin, throttled; JSON `{version, filename, contentType, dataBase64, amountCents, supplier, paidOn, note, orderId?}`; JPEG/PNG/PDF by declared type **and** magic bytes; HEIC → 415 with iPhone guidance; > 8 MB → 413). The row is recorded through `applyOperation('receipt-file')` before the bytes are stored; a lost version race deletes the object again. `GET …/receipts/:receiptId` streams bytes. `POST …/receipts/:receiptId/remove` (until financial closeout; audit row appended; object deleted). `GET /api/admin/receipts/export?from&to` → CSV (paid on, event, event date, supplier, amount, note, filename, type, uploader, uploaded at, ids, proxy link, TOTAL row; formula-injection guarded). `system-health` reports `receipts.mode`.
- **Retention** `backend/event-retirement.mjs`, `store.mjs`, `disposal-recovery.mjs`: receipts are core financial records. Seven-year retirement removes the rows with the event and deletes the objects after the transaction commits; the retirement ledger summary lists `receiptObjects` paths so a failed delete can be finished by hand (`gcloud storage rm --all-versions gs://…/<path>`).
- **Dashboard** `admin/operations.js` / `.css`: "Purchase receipts" block in the Supplier orders & receipts card (Purchase & pack, and now Return & close via `flowSections[4]`): file input (`accept="image/*,application/pdf" capture="environment"`), Amount paid, Supplier (defaults to "Gopuff" when the Gopuff list is non-empty), Paid on (today), related order, note. Phone photos are downscaled client-side to ≤2000 px JPEG q0.85 before upload; PDFs pass through. Receipt cards show thumbnail (proxy GET), amount, supplier, date, uploader, Open, Remove. Finance card gains "Fill actual paid from receipts" into a chosen expense category. Records page gains a paid-on range form that downloads the CSV.
- **Tests** `tests/receipt-files.test.mjs` (5 tests): action validation, retirement paths + ledger validation, HTTP end to end on a temp directory (401/413/415/409/422/404, GET headers and bytes, CSV shape and range filters, remove), unconfigured 503, GCS client against a fake fetch. Workflow browser suite uploads a tiny PNG through the form at 390 px and asserts the thumbnail renders (`qa/workflow-receipt-mobile.png`). `npm test` 200/200; `python3 tests/run-lifecycle-browser.py` both suites pass. Real-bucket round trip (put, get, 412 on duplicate, remove) verified from the Mac with owner credentials; the synthetic object was purged.

## Deploy (image-pinned, tag-first, no-traffic, env var on the candidate)
```bash
cd /Users/barsyssalesagent/Documents/Codex/Barsys-Happy-Hours-Handoff-2026-09-11/project
gcloud config get-value project            # happy-hour-landing-version-2
git status --short                         # empty
find . -type f -not -perm -o+r -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l   # 0
TAG=receipts-0914
gcloud builds submit --project happy-hour-landing-version-2 \
  --tag us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app:$TAG .
DIGEST=$(gcloud artifacts docker images describe \
  us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app:$TAG --format='value(image_summary.digest)')
gcloud run deploy barsys-happyhours-production --project happy-hour-landing-version-2 --region us-east4 \
  --image us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app@$DIGEST \
  --revision-suffix $TAG --tag $TAG --no-traffic \
  --update-env-vars BARSYS_RECEIPT_BUCKET=happy-hour-landing-version-2-receipts
```

## Candidate smoke (0% traffic)
```bash
C=https://receipts-0914---barsys-happyhours-production-23nb3wybra-uk.a.run.app
curl -sS -o /dev/null -w "root %{http_code}\n" $C/                                            # 200
curl -sS $C/api/status | grep -o '"release":"[^"]*"'                                          # ...-receipts-0914
curl -sS $C/api/ready                                                                         # {"ready":true}
curl -sS -o /dev/null -w "export anon %{http_code}\n" $C/api/admin/receipts/export            # 401
curl -sS -o /dev/null -w "upload anon %{http_code}\n" -X POST -H 'Content-Type: application/json' -d '{}' \
  $C/api/admin/inquiries/5bf6a32f-7cc9-454a-bf11-8e6752201b02/receipts                       # 403 (same-origin rule answers before auth)
curl -sS -o /dev/null -w "view anon %{http_code}\n" \
  $C/api/admin/inquiries/5bf6a32f-7cc9-454a-bf11-8e6752201b02/receipts/00000000-0000-4000-8000-000000000000   # 401
curl -sS -o /dev/null -w "admin %{http_code}\n" $C/admin/operations.html                      # 303
curl -sS $C/admin/operations.js | grep -c 'receipt-upload'                                    # ≥1
gcloud run revisions describe barsys-happyhours-production-receipts-0914 --project happy-hour-landing-version-2 --region us-east4 \
  --format='value(spec.containers[0].env)' | tr ';' '\n' | grep RECEIPT                       # BARSYS_RECEIPT_BUCKET set
```
An authenticated upload cannot be exercised on the tag URL (OAuth origins exclude tag hostnames by design); the first real upload happens after the flip in the owner's browser. After the flip, `GET /api/admin/system-health` (signed in) must show `"receipts":{"mode":"gcs","bucket":"happy-hour-landing-version-2-receipts"}`.

## Flip (owner runs)
```bash
gcloud run services update-traffic barsys-happyhours-production \
  --project happy-hour-landing-version-2 --region us-east4 \
  --to-revisions barsys-happyhours-production-receipts-0914=100
P=https://barsys-happyhours-production-62880701168.us-east4.run.app
curl -sS $P/api/status | grep -o '"release":"[^"]*"'
```
Then sign in, open DataDome → Purchase & pack → part 3.2 "Supplier orders & receipts" → Purchase receipts: photograph a receipt, enter the amount, Upload. Check the thumbnail opens, then Records and health → Download receipts CSV.

## Rollback
```bash
gcloud run services update-traffic barsys-happyhours-production \
  --project happy-hour-landing-version-2 --region us-east4 \
  --to-revisions barsys-happyhours-production-match-0914=100
```
`match-0914` has no `BARSYS_RECEIPT_BUCKET` and no receipt routes; uploaded rows on events are ignored by that code and remain in place for the next forward release.

## Manual cleanup reference
- List everything (versions included): `gcloud storage ls -r --all-versions gs://happy-hour-landing-version-2-receipts/`
- Finish a failed retirement delete: `gcloud storage rm --all-versions gs://happy-hour-landing-version-2-receipts/<path from ledger receiptObjects>`
- Bucket access review belongs with the privacy-ledger bucket review in `backend/PRIVACY-OPERATIONS.md`.
