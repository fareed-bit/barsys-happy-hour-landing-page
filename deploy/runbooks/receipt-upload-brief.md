# Build brief: Gopuff receipt upload (photo + amount) for expensing

**Requested 2026-09-14 by owner.** Status: BUILT 2026-09-14 (candidate `receipts-0914`, proxy GET approach, flip pending). Release notes, smoke and flip: `receipts-0914.md`. The spec below is the original brief; deviations: viewing uses the owner-only proxy route (no signed URLs), removal deletes the object (versioning keeps a noncurrent copy), phone photos are downscaled client-side before upload, and the receipts block also appears in Return & close via `flowSections[4]`.

## Goal
On the Purchase & pack card, the owner photographs a Gopuff (or any supplier) receipt on the phone, uploads it with the amount paid, and later exports receipts for expensing. Receipts are financial records (7-year retention per DECISION-REGISTER.md).

## Storage (GCP, project happy-hour-landing-version-2)
- Private bucket `happy-hour-landing-version-2-receipts` (us-east4, uniform access, public access prevention, versioning on) — mirror the existing privacy-ledger bucket setup.
- Grant runtime SA `barsys-production-runtime` `roles/storage.objectAdmin` on that bucket only.
- Env `BARSYS_RECEIPT_BUCKET` on the Cloud Run service. Local/test mode: write files under `../barsys-data/receipts/` instead (no GCS in tests).
- Serve images via signed URLs (V4, 15 min) generated with the runtime SA (needs `roles/iam.serviceAccountTokenCreator` on itself) — or proxy bytes through an owner-only GET route if signing is awkward. Prefer the proxy: simpler IAM, already authenticated.

## Backend (backend/api.mjs, backend/store.mjs, backend/purchasing.mjs)
- `POST /api/admin/inquiries/:id/receipts` — owner-only, throttled, same-origin. Body: multipart or JSON `{filename, contentType, dataBase64, amountCents, supplier, paidOn (YYYY-MM-DD), note, orderId?}`. Accept image/jpeg, image/png, image/heic→reject with message, application/pdf; max 8 MB. Store object at `events/<eventId>/receipts/<uuid>.<ext>`.
- Record on the event (operations state, action `receipt-file`): `{id, objectPath, filename, contentType, bytes, amountCents, supplier, paidOn, note, orderId, by, at}` — through `applyOperation` so version checks and audit apply.
- `GET /api/admin/inquiries/:id/receipts/:receiptId` — owner-only, streams bytes with the stored content type and `Cache-Control: no-store`.
- `GET /api/admin/receipts/export?from&to` — CSV of all receipts (event, date, supplier, amount, filename, link) for expensing.
- Retirement/removal (backend/event-retirement.mjs, retention.mjs): receipts count as core financial records; the seven-year path deletes objects and rows together; the removal ledger lists object paths.

## Dashboard (admin/operations.js, admin/operations.css)
- In the orders/supplier card (Purchase & pack, and Return & close): "Receipt photo" `<input type=file accept="image/*,application/pdf" capture="environment">` + Amount paid USD + Supplier (default "Gopuff" when the Gopuff list is non-empty) + Paid on (default today) + note. Uploads via fetch with progress text; on success advance the flashcard as other saves do.
- Below the form: receipt cards with thumbnail (proxy GET), amount, supplier, date, uploader; "Open" and "Remove" (remove only until financial closeout; append audit).
- Suggest planned costs / actual paid: when receipts exist, offer "Fill actual paid from receipts" per category (Gopuff → Ice & consumables or Spirits/mixers by owner choice).
- Records page: link to the CSV export.

## Tests
- Unit: applyOperation `receipt-file` validation (amount > 0, date valid, size/type), retirement deletes receipt rows.
- HTTP: upload rejects anonymous (401/403), oversize (413), wrong type (415); GET streams; export CSV shape.
- Browser: upload a tiny PNG through the form at 390px; thumbnail renders.

## Deploy
Build/deploy pattern as in release-hardening-0914.md; env var + bucket + IAM before flip. Rollback keeps working because receipts are additive.
