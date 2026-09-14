# Barsys Happy Hours — decision register
Updated September 10, 2026 UTC. Fareed approved the explicitly proposed defaults on September 10, 2026. Unknown legal/insurance facts, unspecified financial-record retention, incompatible/unverified menus, email activation, payments and production deployment remain unapproved.

## 1 — Commercial policy
Current build displays per-guest package rates: Classic $55, Signature $85, Reserve $225; two service hours are included. This differs from the later membership package model ($5,000 / $8,500 / $11,500 per month, up to three hours), so do not silently merge the two models.

Recommended launch treatment: keep this landing page as a single-event inquiry experience and keep its existing package baseline unchanged until the owner explicitly chooses a replacement pricing model. Use the established add-on working rates as proposed defaults: additional service hour $500/event; additional mixlist $5/guest/collection; premium garnish $8/guest when not already included; custom napkins/stirrers $350/event; zero-proof station $12/guest; beer & wine $15/guest; photographer 2h $800/event. Spirit upgrades remain quote-only. Delivery/transport and glassware remain quote-only until approved.

APPROVED 2026-09-10: retain the single-event calculator and its 2-hour baseline. Approved rates are $500/additional hour, $5/guest/additional mixlist, $8/guest premium garnish when not included, $350 custom napkins/stirrers, $12/guest zero-proof station, $15/guest beer & wine, and $800 for the 2-hour photographer option. Spirit upgrades, delivery/transport, glassware, other branding variants and other photographer durations remain quote-only. Membership pricing remains separate.

## 2 — Menu/package policy
There are 27 collections / 129 recipes. Current readiness record: 18 collections compatible with Barsys 360 service, 2 incompatible, 7 unverified. Package assignments are an unpublished draft. Suggested cost bands (<$6 Classic, $6–$9 Signature, >$9 Reserve) are planning estimates, not approved selling/margin rules.

Recommended launch treatment: publish only collections already verified compatible; keep Silk & Snap and Love at First Sip unavailable; keep all seven unverified collections unavailable. For verified collections, use the existing cost-band assignment only after explicit provisional approval. Never surface ingredient costs to customers. Existing accepted event/proposal terms remain untouched.

APPROVED 2026-09-10: provisional cost-band assignments may be used for verified-compatible collections. Incompatible and unverified collections remain unavailable/review-only. This approval does not expose ingredient costs or authorize production deployment.

## 3 — Contract/payment policy
Current inquiry receipt intentionally creates no reservation, booking, agreement, subscription or payment. Existing project material supports the principle that a date is held only after signed agreement + required deposit, but does not support universal deposit percentage, cancellation boundaries, rescheduling fees or card terms.

Recommended launch treatment: keep all of those terms proposal-specific until Barsys adopts a canonical policy. Public site wording should say availability and commercial terms are confirmed in the proposal; inquiry submission does not hold a date. Do not invent cancellation/refund percentages.

APPROVED 2026-09-10: keep deposit, cancellation, rescheduling and card specifics proposal-specific for launch. Inquiry submission does not hold a date; no universal percentages or refund terms are invented.

## 4 — Company/service facts
Known operational contact in the build is fareed@barsys.com. Venue permission, COI requests and responsible alcohol service are already represented as event-specific checks. The project does not contain a sufficiently verified canonical legal entity name, public legal notice address, insurance limits or universal service-license statement.

Recommended launch treatment: do not make unsupported insurance/licensing claims. Keep COI, venue permission and service authorization event-specific. Use the existing Barsys contact only where an operational contact is needed; legal entity/address must be supplied from authoritative company records before legal notices/contracts are standardized.

Decision needed: supply/confirm legal contracting entity, public business/legal contact and current insurance facts.

## 5 — Privacy/retention
Implemented data minimization is strong: contact/date/address/free text are not placed in browser localStorage; server inquiry records and staff sessions are separate; Gmail is read-only and page-open-only; no trackers are currently installed. Missing item: approved server retention/deletion policy for inquiries, events and imported email.

Recommended launch default for approval: retain unconverted inquiries for 12 months, then delete/anonymize; retain completed event operational/financial records according to Barsys accounting/legal requirements rather than inventing a period here; imported Gmail review copies 90 days unless attached to an active event, then remove the imported copy when no longer operationally needed. Honor verified access/deletion requests subject to records Barsys must retain. Add no analytics/advertising trackers at launch unless separately inventoried and approved.

APPROVED 2026-09-10: 12-month retention for unconverted inquiries and 90-day retention for imported Gmail review copies, subject to active-event and required-record exceptions. No analytics/advertising trackers at launch. Event/financial retention default subsequently selected below under owner delegation.

## 6 — Notifications/monitoring
Inquiry success UI already has safe wording and only reports success after the server accepts the record. Email delivery is intentionally disabled. No internal recipient/escalation policy is approved.

Recommended launch default: customer receipt acknowledges inquiry ID and states that no date is held; internal new-inquiry notification goes to fareed@barsys.com initially; notification failure must not invalidate a successfully stored inquiry. Add uptime/error alerting for public intake and database failures to a Barsys-controlled operations channel before launch. Keep Gmail review separate from outbound notifications.

APPROVED 2026-09-10: fareed@barsys.com is the initial internal inquiry recipient and the customer receipt must acknowledge the inquiry ID and state that no date is held. Email remains disabled until implementation/wording verification. Monitoring/escalation channel remains OPEN and must be Barsys-controlled.

## Approval shorthand
Replying `approve proposed defaults` approves only the explicitly proposed operational defaults above. It does NOT approve unknown legal entity/insurance facts, invent a financial-record retention period, publish incompatible/unverified menus, enable email, process payments or authorize production deployment. Those remain gated separately.

## September 10 — email identity and alerts
Owner approved fareed@barsys.com as inquiry sender and operational failure-alert recipient. Controlled self-test to this address is the next verification step. Automatic customer sends remain disabled pending delivery verification.


## Owner-confirmed company and service facts — September 10, 2026
- Legal entity: Barsys Inc.
- Address: 44 W 37th St, New York, NY 10018.
- Owner confirms Barsys handles alcohol service directly.
- Owner reports holding a COI. No certificate was reviewed or published; coverage, limits and additional-insured details remain unconfirmed and event-specific.
- Completed event/financial retention was subsequently set to the seven-year default below. No licensing or universal service-authorization claim is inferred from the operator confirmation.

## Retention default selected — September 10, 2026
Owner delegated selection of a standard retention period. Adopt seven years for completed-event core records (accepted proposals/contracts, invoices, payments, staffing/expense evidence and necessary supporting operational records), measured from the later of financial closeout or the relevant tax return filing/due date. This is a conservative Barsys business default, not a universal statutory seven-year requirement.

Preserve records longer when an audit, dispute, insurance claim, legal hold, asset-basis requirement or other applicable obligation requires it. Expiry requires review before deletion/anonymization; do not automatically delete entire event records or retain unrelated sensitive notes solely because a financial record must be retained. Unconverted inquiries remain 12 months and imported email review copies 90 days, subject to the approved exceptions.

Sources checked September 10, 2026: IRS https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records (period varies by record/circumstance); NY sales-tax guidance https://www.tax.ny.gov/pubs_and_bulls/tg_bulletins/st/record-keeping_requirements_for_sales_tax_vendors.htm (generally at least three years from return due/filing date, whichever is later, with extensions).

Implementation status: policy recorded only. Automated retention, hold management and deletion/anonymization are not implemented or activated; no records deleted. Privacy release gate remains pending implementation/vendor review.
