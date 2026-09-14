# Event proposals

Open an inquiry or event workspace and choose Create proposal. The three-step flow reviews the brief, prices the event, and previews a client-facing proposal.

A new draft copies contact, company, date/time, venue, guest count, package, chosen mixlists, ingredient restrictions, requested add-ons and saved machine allocation. Known details start collapsed; missing details are shown first. Billable guests and complimentary allowance are separate from planning guests. Changing the proposal does not edit the original inquiry or preparation plan.

Package rates are suggestions from the existing quote engine. Unknown add-on prices, transport, glassware and tax remain null. Zero is an explicitly entered included/no-charge amount. New drafts suggest a 50% deposit, menu sign-off seven days before the event, guest/allergy deadline two days before, and balance seven days after; owner review is required. Rates and dates are editable per proposal.

Shared browser/server arithmetic uses cents and a tax rate accurate to 0.001 percentage points. Tax applies to checked taxable rows. Deposit is rounded once; the balance is the exact remainder. Missing line prices or tax keep the total unknown. Confirm details, menus, service scope, pricing and proposed terms; edits clear the relevant reviews.

GET/PATCH /api/admin/inquiries/:id/proposal is owner-only, version-checked and audited. Drafts persist in the existing inquiry document. Existing inquiry, booking state, operations revenue and client payments are unchanged. Reload requires explicit discard if edits are unsaved. Export requires a saved draft; incomplete/expired proposals carry a draft label. There is no localStorage persistence.

The HTML export is self-contained, uses the original embedded Barsys logo, and escapes customer input. Print / Save as PDF uses browser printing with proposal-only print styles. Internal notes, staff rates, ingredient costs and profit are excluded. There is no automatic email, public link, acceptance, electronic signature or payment processing. This proposal does not reproduce the complete 23-clause agreement automatically; additional event terms can be entered, and the signed agreement remains separate.

Verification: 98 Node 24 tests pass, including tax rounding, unknown versus zero, deposit remainder, validation, durable save, competing writes, owner/crew authorization and unchanged finances/booking. Browser checked prefill, reference totals, save, review invalidation, completed-review state, HTML downloads and 390px layout. Browser print styles are implemented; physical printer/PDF dialog output is not independently verified.

## Event edits and accepted proposals

Edit event details from the operations workspace. Review changes before saving. Contact-only corrections preserve preparation. Guest, menu, date, venue, package, duration or restriction changes reset the early workflow and packing/menu checks, retain matching recipes and cost overrides, and resize equipment without reducing intentional extra quantities. Existing expenses, orders and payments remain recorded. Scope changes at packing or later are blocked. Active stock reservations must be resolved before scope changes; staff must be unassigned before rescheduling.

Existing proposals keep their own copy when an event changes. All proposal review checks clear and a current-event comparison is required before saving. The comparison is visible in internal wizard notes; it is not exported. Original acceptance snapshots remain retained.

On a fully reviewed saved proposal, Preview proposal offers Record client acceptance. Enter an actual external acceptance reference, explicitly confirm the exact revision, review the handoff and then record it. Acceptance is blocked for incomplete, expired, stale or already accepted revisions and active packing-stage events. The event and operations state save in one transaction with both versions checked. This prevents half-applied revenue or scope changes.

Acceptance transfers client/event details, menus, machines, service brief, deadlines and agreed figures. Pre-tax subtotal becomes event revenue; sales tax is separate; gross total becomes the payment balance basis. Existing receipts/payments are untouched. Accepted revenue cannot be overwritten by the generic finance form; accept a revised proposal instead. No agreement signature, booking, date hold or payment is manufactured. Previously accepted figures remain recorded after scope edits, but profit/advancement requires a revised accepted proposal.

View the latest accepted snapshot within the proposal preview, including its recorded actor, timestamp, reference, menu content and prices. The operations workspace displays accepted revenue, tax, client total and service brief.

Validation: 107 automated tests passed, including atomic rollback on either stale version, full owner API handoff, anonymous/crew protection, incomplete/stale acceptance, no booking/payment effects, tax exclusion from profit, historical contact corrections and machine-only reservation conflicts. Browser verified edit-impact acknowledgment, durable contact edit, stale-proposal review, acceptance reference/preview, real handoff on an isolated synthetic event, and 390px mobile layout. DataDome remains unaccepted.
