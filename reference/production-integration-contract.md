> Update 2026-09-09: local implementation is now authorized and built. See backend/README.md for actual API and remaining production gates. The proposal below is historical.

# Proposed inquiry integration — design only, not connected

This document defines the implementation work needed after approval. It does not approve a vendor, endpoint, legal terms or operational process. Current buttons continue creating local previews.

## Endpoint and payload
Proposed same-origin `POST /api/inquiries`, with an idempotency key generated once per intended submission. Confirm the actual endpoint and hosting owner before implementation. Request JSON should contain schema version, event type, guests, tier ID, menu IDs, recommendation preference, requested hours, beverage preference, add-on IDs/quantities/variant IDs, recurring preferences, organizer contact, venue/logistics fields, and separate marketing-interest/publicity preferences.

Use the shape returned by `BarsysPlanner.exportData()` as a field inventory, but do not accept its client-computed prices, eligibility, booking state or formatted labels as authoritative. Server validates enums, integer ranges, field lengths, email/date/time, retained-menu conflicts and supported locations. Recalculate from an approved server-owned pricing configuration. Preserve unknown tax/add-on/delivery values as null plus explicit status. Do not use localStorage for contact, dates, free text, addresses or preferences concerning marketing/publicity.

## Responses and UI behavior
- Accepted inquiry: `201` JSON with opaque inquiry ID, received timestamp and status `received`. This is not a booking, availability hold, signed agreement, subscription or payment.
- Validation error: `422` with field identifiers and safe messages; preserve entered values and focus the first invalid field.
- Duplicate idempotency key: return the prior receipt for the same request, without duplicate notifications; reject conflicting reuse.
- Rate limit / temporary failure: `429` / `503` with retry guidance. Do not show success on timeout or network failure. Provide manual contact fallback.
- Never echo sensitive fields into URLs, console messages or analytics events. Define retention, deletion, access controls and operational alerts before storing inquiries.

## Approvals required
Hosting/endpoint owner; service account and secret handling; canonical server pricing and event eligibility; recipients and notification method; retention and privacy text; spam/abuse controls; acceptable idempotency lifetime; approved receipt wording. Marketing enrollment and media-release handling require separate workflows and consent decisions. CRM, email, payments, tracking and public deployment remain disconnected.
