## September 9, 2026 — landing-page accessibility remediation

WCAG 2.2 AA targeted fixes: contrast, selected-state text, focus indicators, skip-link target, semantic carousel regions, form error associations and autocomplete, film descriptions, mobile privacy notice placement. 120 Node tests pass. Final axe scans report zero violations across 16 recorded UI states; incomplete findings and manual assistive-technology/device checks remain. See qa/accessibility-2026-09-09.md. No full conformance claim. Staging accessibility-0909 ready at 100% traffic. Build 55c6620a-7cff-4a09-afb4-10f7a009eeec; image sha256:d71424893c4dd581d875ceddbc1257eca81256b732553578da50fc2b0b2b67ee. Authenticated browser verified new CSS, skip target and eight descriptions; test harness absent.

## September 9, 2026 — Garden Spritz alias

120 Node tests passed; preview rebuilt. Staging garden-spritz-0909 ready at 100% traffic; authenticated browser verified mapping and partial-cost warning. Build 10ab6e26-b09b-4c94-ac59-cf3de09af076; image sha256:1542e2df42db0861119a4882e1b74892b48e5c1bebaf5026fc4ca8317d274f99.

Owner confirmed Après Spritz is Garden Spritz Club. Official mixlist page uses identical existing cover URL. Preserved spritz ID and artwork; updated display name and linked seven official public recipe drafts, retaining exact published liquid quantities converted from US fl oz. Source CMS/360 verification and unspecified garnish quantities remain flagged. Carbonated liquids are manual top-ups. Blackcurrant juice uses labeled $5.99/L budget allowance. Known consumption subtotal is $10.79/guest for three equally weighted drinks, excluding unspecified garnishes and ice. No event records or package assignments changed.

## September 9, 2026 — ingredient price coverage

Added or updated 95 ingredient price/yield entries. All explicit ingredients in 26 recipe catalogs now have positive pack quantities and costs; Après Spritz still lacks mapped recipes. Retailer references, selected product proxies and owner-authorized budget allowances are labeled separately. Fresh produce yields are estimates; no recipe measurements or 360 compatibility claims were changed. Estimated costs require provisional review before publishing menu assignments. Customer rates and saved event records remain unchanged.

119 Node tests passed using Node 24 with serial execution. Browser verified estimated menu totals and remaining recipe/compatibility flags. Cloud Build b5d29d7b-937b-4f84-9eb3-97c12f8c64a8 succeeded; image sha256:590abb22cf5dc31172cf3a4b20709f4185e05cfe90373f33786674e2540cd5e5. Staging ingredient-costs-0909 ready at 100% traffic; owner-authenticated browser verified updated totals and draft state. DB secret v2 retained.

## September 9, 2026 — package-specific mixlist availability

- Added owner assignment dashboard with known consumption costs, missing ingredient lists, 360 compatibility, lowest-package selection, draft/publish and explicit provisional-cost approval. Inheritance Classic → Signature → Reserve. No new price or supplement.
- All 27 menus have cost/recipe gaps; proposed assignments remain unpublished. No customer availability change until owner publishes. Unverified/incompatible 360 collections cannot be published. Known-cost bands are provisional; missing spirits can make a collection appear artificially cheap.
- Server embeds public-only policy in online planners; carousel, wizard, modal and taste chooser filter by package. Package changes retain incompatible favorites for visible removal/review. New inquiry API independently enforces published assignments; historical records and idempotent retries retained. Offline catalog unchanged.
- Build 11e414e4-cf48-42d5-af2a-f75a835f528b, image sha256:c8bb859bc39090bc49062a8284ae2f4d6fe1af96c2ee7d4b8ac31fd2190deced; staging revision package-menus-0909. DB secret v2 retained.
- 115 Node tests passed; isolated browser tested tier filtering, saved policy, retained selection removal and mobile width 390. See backend/PACKAGE-MIXLISTS.md.

## September 9, 2026 — editable Gmail inquiry keywords

- Email query now matches label OR any saved phrase, without requiring a Gmail label. Nine event-related defaults, editable owner-only keyword settings persisted in mail_settings with optimistic concurrency. Query syntax restricted to literal phrases; sent/drafts excluded and spam/trash not included. Full available history searched.
- Release build 161ab9df-8463-461e-982d-9a627b864c7a; image sha256:0a155c1c97354d0d91d6680be205bdaaaff62ef71f05ae55eae4e05cd58b357c; staging revision gmail-keywords-0909. Browser verified isolated settings save/reload and 390px fit.
- Existing review, thread deduplication and memory-only authorization retained. No real emails imported by this change; page-open polling only. Keyword changes do not remove previous drafts. 112 tests passed with Node 24 and serial execution.

## September 9, 2026 — Gmail inquiry review

- Owner-only labeled email import and review at /admin/email.html, linked from dashboard and operations. Conservative field suggestions; explicit review before creating events; source-thread deduplication; no automatic updates to existing events or inferred booking/consent.
- Memory-only GIS Gmail read-only authorization, validated audience/scope/mailbox; exact fareed account. Private imported drafts, no tokens persisted. Opt-in checks while page open/visible only; no unattended sync. Gmail API enabled. Owner Google consent and first live import pending.
- 110 tests passed under bundled Node 24 with serial execution. Browser local synthetic creation/retry and 390px fit verified. Staging gmail-0909 ready at 100%; image 14cc9c7ebe82e0363ed55857a67d80a816fbcb37aa780b1299a56927b781d6e6. See backend/GMAIL.md for limits.

## September 9, 2026 — event editing and accepted proposal handoff

- Edit event details from the operations workspace with an explicit impact review. Guest/menu/venue/schedule changes recalculate preparation, preserve matching recipes/cost overrides and adequate equipment counts, reset planning checks and return the early workflow to Confirm. Contact-only edits preserve packing. Existing money and supplier records are retained.
- Scope changes with active stock reservations, schedule changes with assigned staff, and scope changes at packing or later are blocked until commitments are resolved. Historical contact edits remain possible without allowing arbitrary new past event dates. Edited events invalidate proposal review without overwriting proposal values.
- Fully reviewed, current saved proposals offer acceptance-reference entry, explicit client-acceptance confirmation, handoff preview and final record action. The accepted plan/menu/prices snapshot is retained; latest accepted version is viewable in the builder. Event details, menus, machines and service brief transfer to operations.
- Revenue uses subtotal before tax; sales tax and gross invoice total are separate. Payment balances use gross totals for accepted proposals; profit uses pre-tax revenue. Existing payments are retained. Generic finance edits cannot overwrite accepted revenue; revised accepted proposals are required. Changed accepted scope blocks profit and advancement pending review.
- Atomic inquiry + operations transactions with both version checks in PostgreSQL and SQLite. Concurrent failure rolls back both. Booking/date hold, agreement signature and payment status are never inferred from proposal acceptance.
- 107 Node 24 tests passed; deadline comparisons use the New York calendar. Browser tested edit-impact acknowledgement, saved contact correction, stale-proposal review, actual handoff on isolated synthetic fixture, accepted snapshot view and 390px layout. Real event acceptance unchanged.
- Final build 615a47a9-8a1b-4573-b133-f1edd88cf024; image sha256:4ed14c0651018df512c3db487548cb80dcfe9239d4ed3d201c22152b54f1c2f9. Staging revision handoff-final-0909 uses existing secret v2. No new domain, production site, tracking, signature provider or external messages.

## September 9, 2026 — event proposal builder

- Create proposal links in the inquiry desk and event workspace open a three-step owner-only builder. It prefills wizard contact/event data, selected menus, proposed package rate, requested add-ons and saved machine allocation. Missing details are shown first; all prefilled fields remain editable.
- Per-proposal billed/planning guests, complimentary allowance, editable rate and add-on rows, taxable flags, tax, deposit split, deadlines and service terms. Integer-cent browser/server calculations; blanks stay unknown. Source pricing and event operations are not modified by draft saves.
- Five explicit review confirmations; related edits clear review. Durable version-checked proposal saves audit the actor and revision. No financial/booking/payment changes. Draft export labels incomplete or expired proposals; HTML is self-contained with original logo and escaped text. Browser print uses proposal-only styles; full signed agreement remains separate.
- 98 Node 24 tests passed. System Node 25 hit a native test-runner assertion; the bundled Node 24 matches deployment and passed the full suite. Browser verified prefill, pricing reference math, save/reload, review invalidation, completed-review export and mobile width 390px. Draft and reviewed downloaded HTML checked for exact totals, embedded logo, no scripts and no internal notes. Physical PDF/printer output unverified.
- Build b8264ca3-1948-4b0f-8c44-9f4dc33e2072 succeeded; image sha256:12c2a12fd0d624aa84c15fc13ebb51d77ef89e21b83121f6e37dda2e4957d89c. Staging revision barsys-happyhours-staging-proposals-0909 ready at 100%, using existing secret v2. No domain, public production deployment or external messages.
- See backend/PROPOSALS.md. Real proposal details stay in private event records, outside application source/release files.

## September 9, 2026 — purchasing, inventory valuation, payments, crew access and recovery

- Owner declared zero current stock. Staging empty-opening action saved by Fareed only after confirming zero inventory rows. No purchases, staff or payments seeded in staging. Untracked items start at zero; explicit unknown counts remain unknown.
- Purchase needs subtract counted ready stock and current-event allocations before shared-product whole-pack rounding. Receipts create/match stock, add quantity and invoice cost atomically, and reject duplicate invoice/item references. Supplier paid totals can be updated without duplicating cost. Unknown prior stock value stays unknown.
- Dispatch snapshots weighted inventory cost; return credits reusable value; consumed/lost supplies and lost equipment affect event cost. Cash outlay includes linked purchase payments; event consumption does not double-charge those purchases. Manual expense rows exclude received inventory invoices. Physical counts and invoice values still require staff input.
- Client deposit/payment/refund ledger, collected amount, balance/status; duplicate references and excessive refunds rejected. No card processing, invoices or external messages.
- Explicit staff email + crew-access toggle; only active assigned crew may use /api/crew endpoints. All /api/admin endpoints remain owner-only. Crew responses omit financials and audit payloads; allowlist rechecked on every session request. No new account enabled; user staff emails and OAuth test-user setup remain pending.
- 92 automated tests passed, including full lifecycle with inventory receipts/returns, valuation, asset loss, payment accounting, duplicate prevention, crew API redaction and revoked sessions. Isolated browser receipt and deposit saves passed; mobile 390px fit verified. Staging login and zero-opening persistence verified.
- Cloud SQL backup 1788988829141 restored to isolated instance; two inquiries and operations document exactly matched source hashes, and write/rollback passed. Temporary instance deleted at 21:31:40 UTC (610675ab-967c-4214-9258-4d8d0000002c); see outputs/RECOVERY-VERIFICATION.md. Seven daily backups and one-day PITR verified.
- Recovery helper printed a database credential in a parsing error. Database credential rotated, Secret Manager v2 deployed, v1 disabled. Never roll back directly to revisions pinned to disabled v1. Use compatible code and v2 credentials. No credentials in source/report artifacts.
- GCP alert policy 2281259438356494384 enabled for staging HTTP 5xx. Console incidents only; notification channels not configured. API failure logs omit customer bodies and credentials.
- Build e2bbc620-9fe5-46bc-ab99-67f1ec55753b; image sha256:1522d4cee97ca2dbe68cbd58a1f89f1e27cdf5c114a66b4eeb9f7a10bf9fd49f; revision barsys-happyhours-staging-purchasing-0909 ready at 100% traffic using secret v2. Previous credentials-0909 uses v2 but old accounting code; avoid old-code rollback after real ledger use.

## September 9, 2026 — five-step event flow with inline preparation

- Event UI groups the eight existing checkpoints into Confirm, Prepare, Purchase & pack, Run event, Return & close. Navigation reviews tools without advancing; one Continue action advances the actual saved checkpoint. Existing audit/history/gates unchanged. Missing-record guidance appears before continuing.
- Inline preparation uses the existing version-checked preparation PATCH endpoint. Drinks, buffer, machines, recipe measurements/shares/confirmation and equipment packing are editable inside the event. Machine changes resize required equipment and clear packing; measurement edits clear recipe confirmation. Saved cost overrides, source metadata and equipment notes are retained. Advanced price override/export page remains linked.
- Guest/date/venue and known/confirmed financial status are summarized at the top. Only the first relevant section opens; detailed financial rows are behind View cost breakdown. Mobile steps fit in two rows; refresh/discard remain available. Supplier drafts remain manually reviewed gross estimates; no auto-purchase or stock-deduction promise.
- 83 tests passed. Isolated connected-browser fixture verified 3→4 drinks/guest recalculates 100 drinks for 25 guests, 1→2 machines raises shakers to 4, and unsaved edits block step switching. All five steps fit a 390px viewport without page overflow. No staging event data changed during these tests.
- Staging release build 24a52dd0-bc74-4b1b-9d92-b8a6c2f547a7; image sha256:ac6f452d4ea3266886d4e5232a99afb119c89050d10a76bf40548f7facc14b1a; revision barsys-happyhours-staging-five-steps-0909 is ready at 100% traffic. Authenticated staging verified five steps, Fareed owner, inline saved preparation and mobile layout. Previous workflow-0909 remains rollback candidate. No framework migration, new domain or customer pricing change.

## September 9, 2026 — Today queue, guided stages and quick office receipt

- Operations home now prioritizes overdue returns/deadlines, events dated today, owner/staffing gaps, purchasing-stage work and financial closeout. One card per event with secondary reasons. Date comparisons use the displayed device timezone; undated events remain planning work. Search and open/completed filters apply to the All events list.
- Event pages open relevant tools for their current stage; Show all event details reveals all sections. Completed records remain read-only. Return stage puts pending receipts first and collapses ingredient/new-reservation tools.
- Equipment receipt buttons prefill returned/lost amounts and ready/cleaning/charging/repair condition. Missing requires notes through existing server validation. Explicit Receive at office saves and audits; no automatic receipt or supplier message. Existing reservations, optimistic concurrency, financial completeness and customer pricing preserved.
- 80 tests passed, including queue ordering/deduplication, date handling and equipment presets. Connected-browser isolated local fixture verified missing-without-note rejection and successful charging receipt credited to inventory. Mobile 390px checks covered event search, focused/expanded sections and corrected two-column navigation without page overflow. No staging inventory/staff fixtures created.
- Release build e90d69bd-e3b3-45fd-8ca1-5d48525efa1a; image sha256:3a64bb10fdd14478ecf30d4e5978591925f56739e60ff911e94c3347e295266e; staging revision barsys-happyhours-staging-workflow-0909 is ready and serves 100% traffic. Authenticated staging verified Today queue, preserved Fareed owner, focused/all-details navigation and 390px layout. Prior inventory-picker-0909 remains the rollback revision. No new domain or live-site replacement.

## September 9, 2026 — inventory picker and quick counts

- Inventory now starts with searchable ingredient/equipment cards using existing recipe names/units and known reference pack sizes. Standard equipment presets suggest the next unused asset label; quantities remain unknown until entered.
- Matching pack counts convert to recipe units; clear matching-product/size labels avoid assumed bottle conversions. None / one unit / count-later buttons reduce typing. Existing stock has +/- one unit or matching pack controls, saved explicitly; unknown counts cannot be incremented.
- Selecting an already-tracked ingredient opens its current count instead of creating another entry. Custom item fields remain available. No real inventory was seeded or purchased. Existing server reservation/count constraints and optimistic concurrency are unchanged.
- 77 tests passed. Browser verified equipment name/unit autofill with unknown quantity, two matching 64 fl oz apple-juice packs converting to 3785.412 ml, discard without stock creation, and 390px mobile without page overflow.
- Staging revision inventory-picker-0909; build 06a71e4b-514a-4262-baa9-b2c470383d02; image sha256:ca7090e22841d5ac56f8072aa9f1cd377e4003e69fa78398e4f4f9d2d5f285a8.

## September 9, 2026 — event operations foundation

- New /admin/operations.html provides the eight-stage event workflow, owner/deadline, financial overview, shared inventory/equipment, staff directory/assignments, supplier records, quote drafts and audit view. Links from dashboard and preparation. Original inquiries, recipes, customer pricing and 27 collections preserved.
- New operations_state table (SQLite locally, PostgreSQL staging), whole-workspace compare-and-swap version prevents concurrent double reservations. Authenticated /api/admin/operations GET/POST; same-origin and rate-limit rules retained. Full operation payloads and actor/time audited. No external emails sent.
- Exact name/unit stock matching; unknown counts block reservation. Consumables reserve conservatively across all outstanding bookings. Individual equipment tags are unique, overlapping reservations blocked, dispatch subtracts stock, one-time receipt adds actual return, equipment losses require notes, and cleaning/charging/repair blocks reuse. Staff overlaps blocked and saved rates retained. Defaults $50/hour and provisional 80% margin.
- Financials distinguish planned cost, cash paid, office-stock usage value, reusable returns, actual event profit and margin. Missing inputs keep full profit unknown. Stages gate confirmed revenue/budget, dispatched loads, office receipt and complete financial review. Income tax excluded. Supplier drafts to vpagan@astorwines.com list matched Astor products only, gross before inventory deductions, with review warnings and manual email/text export. Supplier receipt records do not auto-increment inventory.
- 77 tests including concurrent API writes, auth, persistence, double booking, return idempotency, staff rates, complete lifecycle and 16k/3.5k/0.5k benchmark. Browser confirmed initial workspace and saved synthetic event owner Fareed persists in PostgreSQL. Real inventory and staff intentionally not seeded.
- Existing exact Fareed access retained; staff directory does not grant logins. No domain, deployment to live site, payments, CRM, source CMS writes or price changes. See outputs/OPERATIONS-GUIDE.md for first-version limits and startup steps.
- Final build f4dd0a5d-4148-4c15-b95b-b5f7ed73193c; image sha256:f289e76e2e07cd42f442744b4f4e5b62f52aca7d91805daea8df13efef255314; revision ops-release-0909. Earlier ops-0909 and ops-final-0909 remain rollback candidates with the additive table retained.
- Browser checks: authenticated navigation, shared PostgreSQL save/reload of synthetic event owner Fareed, $50 staff default, empty inventory/staff setup, 390px event/staff layouts, and correct Astor draft recipient with no-match sending disabled. No inventory or staff seed records, emails, purchases or new inquiries created. Completed events retain read-only financial/operational records; reopen explicitly to edit.

## September 9, 2026 — six additional published mixlists

- Added Bean & Barrel, Zen & Juniper, Bean, Bolt & Bitter, Vermouth Valley, Boisson Non-Alcoholic Agave Lover’s, and The Ultra Records: 27 customer-facing choices, including three zero-proof choices. Original 21 and first-eight order preserved.
- Six exact official covers are local, optimized JPEGs. reference/additional-six-mixlists.json records page and artwork URLs. Customer pages show drink names, artwork and service-confirmation copy, with no ingredient costs.
- Public recipe pages provide 29 recipe drafts. Dashboard defaults remain unconfirmed; imported explicit liquid measurements use US fl oz → ml (29.5735295625). Unmeasured toppings/garnishes and full published ingredient notes are visible with recipe source links. Staff must complete and confirm before ingredient shopping totals become complete. Existing approved CMS snapshots remain unchanged.
- Source CMS mapping and 360 compatibility for these six are NOT verified. Catalog compatible=null triggers a clear dashboard warning; never infer compatibility from the public page. Some published instructions reference Coaster. No source CMS writes or invented measurements.
- 70 tests pass, including all six draft states, validation and incomplete cost totals. Assets validated and standalone preview rebuilt with 72 embedded assets. No domain or commercial changes.
- Staging revision barsys-happyhours-staging-six-more-0909 serves 100% traffic. Build 14006867-270d-4c60-a26e-57f080460740; image sha256:3c2ab50b562ba6eb87e334d0881ba1114d3ad665248b795d2c64e08e052bb44b.
- Browser verified 27 cards, no collection prices, published Bean & Barrel drink names, successful event selection, three zero-proof choices and 390px Boisson layout with local artwork and no horizontal page overflow. No new test inquiry submitted.

## September 9, 2026 — all collections on the landing page

- All 21 existing collections now appear in the main carousel and full planner, rather than only eight featured choices. Original eight retain the first carousel positions; filters, slot limits and prices are unchanged.
- Downloaded 13 exact official covers from collection-page metadata and resized to 1000px JPEG using macOS sips. Source URLs in reference/expanded-mixlist-artwork.json; all 21 covers are local and work without consent. No substitute images.
- Customer-facing collection details show CMS drink names for the 20 mapped collections. No ingredient prices or measured recipe quantities exposed. Unmapped Après Spritz Club retains existing details; 360 service confirmation notes added for Silk & Snap and Love at First Sip.
- 69 tests pass; standalone HTML rebuilt with 66 unique embedded assets. No source CMS writes, new domain or commercial changes.
- Staging revision barsys-happyhours-staging-mixlists-0909 is ready. Build 650cad10-abc4-4e41-90f2-5732aae392ce; image sha256:03aa00395542cc187a193671d5371de2f6af9769f14e905bc71c2b5d97c13b0d.
- Browser verified 21 carousel cards, original eight first, no cost text in collection section, CMS drink names and selection for Bold Frequency, zero-proof filter (Fluid Code and Summer Mocktails), and 390px mobile without horizontal page overflow.

## September 9, 2026 — broader retailer ingredient estimates

- Expanded catalog from 13 to 112 ingredient/unit references using public retailer listings (Astor, Walmart, WebstaurantStore and others). 61 have usable measured pack sizes; 51 require staff yield confirmation. 27 CMS ingredient/unit names still lack a selected price reference. These remain visibly incomplete, never zero-cost complete totals.
- Catalog records exact product, pack description, USD price, source URL, check date and budgeting/suitability notes. Fresh garnish yields are not guessed. Product selections do not edit CMS recipes. Out-of-stock, location-dependent and starting-at prices carry notes.
- Preparation now distinguishes missing prices from missing yields and offers reference-price autofill plus a usable-yield field. Per-event staff overrides remain audited and exported. Shared catalog products with matching URL/unit/size/price combine before procurement rounding; manual overrides remain separate. Raw produce used in multiple different preparations needs staff allocation; no assumed yield or inventory deduction.
- 69 automated tests pass, including shared SKU aliases and missing-yield completeness. Preview rebuilt. No source CMS writes, domain, tracking, payment, CRM or commercial-term changes.
- Fluid Code synthetic calculation: 215 drinks, $225.95 known consumed subtotal / $292.47 known whole-pack subtotal, zero absent price references and seven missing garnish yields. Subtotals exclude those garnishes until staff supplies yields.
- Staging build 959b6fc1-42a4-4afc-896f-3bd9595af962 succeeded; image sha256:47b994c88255aef9fc9f2cd3968223ba58fec9bd6625e04c3f588bdb57b90fc7, revision retail2-0909. Previous costs-0909 and retail-0909 revisions remain available.
- Connected browser verified authenticated event totals, retailer links, reference autofill, saved empty overrides, preserved shakers packing, and mobile 390px without horizontal overflow. Fixed pack input to accept precise fluid-ounce conversions (step=any).

## September 9, 2026 — mixlist ingredient costing

- Staging revision `barsys-happyhours-staging-costs-0909` serves 100% traffic. Build `1b906237-b623-4f67-b4ce-863acc8757e2`; image digest `sha256:778e6d4ea2336f5ac09b7c3d7df451714b9068d24a85970d5e6cd623d0d89daf`.
- Read-only BarsysEliteN/defteros replica snapshot maps 20 collections / 93 measured recipes. Source CMS was never modified. `backend/recipe-catalog.json` contains only selected collection/recipe fields. No credentials included; no runtime connection to source CMS.
- Après Spritz Club remains unmapped (do not substitute Garden Spritz Club). Silk & Snap and Love at First Sip carry the source CMS's false 360-compatibility flag; visible service warnings.
- New plans default to owner-approved 3 drinks/guest. Existing saved plans retain their choices. Empty recipes can be filled explicitly from the snapshot; nonempty staff recipes and packing checks are preserved. Units: ml, g, each (CMS piece), pinch, dash; no inferred conversions.
- `backend/costing.mjs` aggregates exact name/unit pairs, calculates per-mixlist consumed ingredient costs and whole-pack event procurement after shared-ingredient aggregation. Missing prices or incomplete recipes/menu produce null complete totals and explicitly labeled known subtotals. No inventory deduction; tax, delivery, ice, labor and equipment excluded. Client commercial pricing unchanged.
- 13 named ingredient prices cross-referenced against public Astor listings on 2026-09-09, including bottle sizes and source links. Regular single-bottle prices, not temporary sale prices. Direct automated HTTP fetch returned 403; this is a dated reference catalog, not a live feed or stock guarantee. Generic spirits without confirmed brands, fresh ingredients, and unmatched products require staff supplier/product, pack size and USD price entry.
- Authenticated event preparation saves price overrides with version checks and existing audit identity; exports include cost summary, reference prices and overrides. No blanket source CMS permission needed or requested.
- Validation: 67 automated tests pass, including shared bottle rounding, missing prices, units, catalog validation, override persistence, auth and stale updates. Connected Chrome staging checks cover CMS load, 3 drinks/guest, supplier price save/reload/clear, export, desktop and 390px mobile (no horizontal overflow). Standalone Playwright launch blocked by macOS sandbox; used connected browser instead.
- Synthetic event 3c22e7d7-c631-48df-9c1d-bbc6dff2221e now has measured Fluid Code recipes, 3 drinks/guest, 10% buffer, 215 planned drinks. Existing shakers packing check retained. Test ingredient and temporary test price removed; final override array empty. Fluid Code has 15 distinct unpriced ingredient/unit lines; no full cost claimed.
- No domain, DNS, source CMS writes, Git push, live site replacement, payments, CRM, tracking or customer messages.

Earlier entries below are historical; this section supersedes statements that recipes or drinks-per-guest are unavailable.

# Latest — event preparation dashboard (2026-09-09)

Added /admin/preparation.html?event=EVENT_ID, linked from each event as Plan ingredients & equipment. Staff-only GET/PATCH preparation API uses the existing event document, shared database, version conflicts and identity-attributed history; no migration or commercial changes. Staging revision barsys-happyhours-staging-preparation-0909 is ready and serves the new image sha256:ff4e493bd11aeceb6817d0af97e8e215f2fc03e13e721e9e4ee255800d9a698c (build 561a669e-985e-400c-b2eb-52260e3e2f07).

Owner ratios: ceil(guests/25) machines, one charging cord/block, iPad and stand per machine; two shakers and mixing glasses; one funnel minimum and up to two recommended per machine. Portable chargers, towels and wipes have unset quantities. Staff can increase machine count, set quantities/notes and save packing progress. Quantity changes clear the UI packing checkbox. Required minimums enforced on server.

Per-event ingredient planning uses staff-entered drinks per guest (no global default), explicit buffer, relative drink weights, per-serving measured ingredients in ml/g/each and recipe confirmation. Selected collections seed drink names when known and explicit recipe placeholders otherwise. No measured recipe source exists in config.js. Shopping list stays incomplete until measured recipes, demand and menu confirmation are present. Equal weights are labeled assumptions; zero weight excludes a drink. Refill range assumes even workload and 40–50 drinks per machine load, subtracting the initial fill; component depletion may happen earlier. No claim of guaranteed throughput. Recipe entries currently belong to the event, not a reusable master recipe catalog. Requested owner input on default drinks per guest and approved recipe source remains unanswered.

62 tests pass. New tests cover equipment thresholds, validation, weighted serving conservation, buffer arithmetic, missing recipes, shared ingredient totals, authorization, stale-save conflicts and persistence. Initial test run was blocked by local network sandbox; rerun after permission passed. Browser on staging: authentic Google access, event link, three machines/six shakers for 65 guests, saved packing note/checkmark after reload, 143 drinks for synthetic 2-per-guest plus 10% buffer, JSON download verified, mobile 390px layout. Synthetic measured ingredient UI test yielded 290ml for 29 servings and was removed afterward; no fabricated production recipe retained. Both existing synthetic events remain. No domain/DNS changes.

# Latest — private staging deployed and verified (2026-09-09)

Staging is live at https://barsys-happyhours-staging-23nb3wybra-uk.a.run.app/admin. Sign in as fareed@barsys.com. Revision barsys-happyhours-staging-verified-0909 serves 100% traffic. Both wizard saves, dashboard editing/export, real Google auth/logout and persistence across a new revision verified against Cloud SQL. 57 Node tests and live PostgreSQL adapter checks pass. Two synthetic browser-test inquiries remain. No domain/DNS or existing live-site changes.

See deploy/STAGING-ACCESS.md for resource inventory, test evidence, access and rollback. Database is RUNNABLE, encrypted-only, no authorized networks, deletion protection and backups enabled. Billing is enabled/open but console payment warning remains for owner attention. Staging resources incur charges. Public-launch gates remain pending. This supersedes all historical no-deployment/in-progress statements below.

# Latest update — private GCP staging in progress (2026-09-09)

Owner authorized deployment without a domain. Use only happy-hour-landing-version-2, us-east4, with fareed@barsys.com; no DNS or existing live-site changes. CLI authentication now works. Billing API reports enabled/open, although the console shows a past-due/payment-information warning requiring owner attention. No payment information was changed.

57 tests pass, including staging authorization and database-backed rate limits. STAGING_MODE=1 gates planner, dashboard and inquiry writes with the existing exact-email Google authorization. Staging receipts clearly identify synthetic test data. Source upload exclusions verified; no local database or environment file uploaded.

Cloud SQL instance barsys-happyhours-staging-db creation accepted (operation 164d0738-9b2e-4ab1-a22d-856d0000002c). PostgreSQL 16, db-g1-small, 10GB SSD, zonal, daily backups with seven retained, one day PITR, deletion protection, no authorized networks, storage auto-growth capped at 20GB. Ongoing SQL charges apply even when app is idle.

Created runtime/build service accounts with Cloud SQL Client / Cloud Run Builder respectively, and Artifact Registry barsys-staging. Build 706a46ac-c66f-4cce-9cc3-cfcf96678425 succeeded; image digest sha256:0756d03a8bb18a9df098509ede35b952855e1e8cc8c3925abf3c5e185ffed5d5. No Cloud Run service deployed yet. Next: complete SQL bootstrap and live adapter tests, Secret Manager credential, Cloud Run deployment, verified OAuth origin and browser checks. See deploy/staging-plan.json and deploy/README.md. This entry supersedes earlier local-only approval and authentication-blocker status.

# Latest update — Google staff login (2026-09-09)

Google Auth Platform is configured in happy-hour-landing-version-2, external Testing audience with fareed@barsys.com as sole test user. Web client and localhost/production origins registered; .env.local holds the public client ID and is excluded from source archives. Real Chrome login succeeded. Server checks verified exact email + Workspace domain and Google token claims. Opaque hashed sessions and one-use nonce challenges persist in the database; logout revokes sessions. Eight-hour sessions. Automatic local admin access and bearer-token fallback removed.

Landing-page desktop/mobile menus show Staff sign in while signed out and Dashboard after authorization. Admin edits now record the actual verified email. Actual browser checks: dashboard button, event access, email-attributed note, sign-out, hidden dashboard link and protected direct admin navigation. 55 tests pass. See backend/GOOGLE-LOGIN.md. Local server runs at http://localhost:3089; use npm run backend or the outputs launcher. Live website remains unchanged; paid infrastructure and deployment still require approval. This update supersedes earlier statements that Google login was pending or no cloud configuration was changed.

# Current update — local event backend (2026-09-09)

User authorized building a new backend from wizard/event details, using GCP and no Google Sheet. Implemented backend/server.mjs, validated inquiry API, SQLite local persistence, PostgreSQL adapter, inquiry save integration for both planners, and admin dashboard. Run `npm run backend`: http://localhost:3089 and /admin. Existing static preview remains on port 3000. Node 24+ and npm-installed pg driver; vanilla frontend retained.

53 tests pass. Actual browser verification: both planners save, duplicate retry returns same ID, dashboard owner/status/notes persist after reload, search works, mobile width fits. Only two synthetic demo inquiries were stored. Data is outside source in ../barsys-data; never include in release. See backend/README.md for the current architecture, security boundaries and test limits.

GCP project happy-hour-landing-version-2 was inspected read-only. No Cloud Run services were listed; Cloud SQL showed setup. Billing was not verified. PostgreSQL adapter/container not integration-tested because local PostgreSQL shared-memory startup and Docker access were blocked. Cloud deployment, Google/IAP staff sign-in, distributed rate limiting, billing/region sizing and retention/privacy decisions remain pending. Current production-mode API fails closed without a database URL, HTTPS origin and staff token. Local dashboard is loopback-only without login. Status changes do not create bookings or messages.

This update supersedes references below to “no backend” and 46 tests. Original frontend verification history follows.

# Barsys Happy Hours — local release candidate

Updated: 2026-09-09. **Local RC packaged for review. Production remains unapproved.**

## Baseline and approved decisions
- Active source: `/Users/barsyssalesagent/Documents/Codex/2026-09-09/files-mentioned-by-the-user-barsys/work/barsys-after-hours-v3-9`.
- Vanilla HTML/CSS/JS, Node >=18, no application dependencies. V3.9 plus Codex continuation fixes. Original logo, black/white styling, all carousels/banner, 21 collections, eight add-ons and both planners preserved.
- Shared model remains app.js + quote-engine.js. Rates $55/$85/$225, two-hour baseline; unknown tax/delivery and unapproved extras explicit. No backend connection.
- Company asset authorization: reference/asset-authorization.md. Exact configured assets only; all eight covers already local.
- No project-local Git repository; unrelated parent home Git repo not staged/changed. Recovery baseline: `../baselines/barsys-pre-rc-20260909.zip`, excluding generated standalone. Original full-size covers also retained in reference/original-covers.

## Implemented and verified
- Earlier batch: official cover downloads, obsolete consent-text removal, hero first-click pause fix; media and six-width visual checks.
- RC batch 1: duration fields synchronize with add-ons; recommendation choice restores with favorite menus; shared summary labels include recommendation. Actual localhost repros now pass.
- RC batch 2: invalid collapsed fields are revealed/focused; reset clears filters; JSON download anchor attached; export feedback reports requested rather than confirmed. Actual JSON and full/quick HTML downloads verified on disk in connected Chrome.
- RC batch 3: covers optimized 7,153,148 → 2,131,576 bytes (70.2% smaller); original hashes/source mapping retained; 46 Node tests pass.
- Browser: state restore/withdrawal, contact exclusion, separate marketing/publicity status, retained menus on downgrade, included benefits, zero-proof conflicts, validation, keyboard dialog focus and 24 responsive checks pass. See qa/rc-verification.md for exact scope.
- Drive authenticated and exact Cover images folder metadata readable. No additional remote files needed; no Drive writes.
- Added optional real-localhost regression suite, packaging command, content-hash build validation, source checksums, and proposed integration contract. Rebuilt standalone is 30.32 MB with 53 embedded assets; ZIP integrity and all release-file hashes verified. Historical QA reports are retained but superseded by qa/rc-verification.md for this batch.

## Remaining work, in priority order
1. Repeat automated localhost suite in a working Playwright environment. Python suites currently lack Python Playwright; standalone automated Chromium was blocked by macOS sandbox. Connected Chrome manual/connector flows did verify downloads and page behavior.
2. Representative physical Safari/iPhone and assistive-technology/contrast verification; OS reduced-motion test and measured page performance. Do not claim these were performed.
3. Review the local RC with stakeholders. Further design changes should preserve the approved baseline unless explicitly requested.
4. After explicit approvals, implement the production integration described in reference/production-integration-contract.md. Do not connect vendors or publish now.

No known reproduced local interaction defect remains open from this audit. The device/automation coverage above is incomplete and remains documented rather than represented as passed.

## Business decisions and technical access
check:launch still reports ten operational/policy decisions and fifteen brand-reference verifications. Canonical public terms/inclusions, add-on/delivery rates, cancellations/deposits, service authorization/insurance, data recipients/retention and actual inquiry handling require decisions. Recorded company-asset permission is sufficient for this local work. No additional asset access is currently blocking the page.

## Commands
From the active source directory:
- `npm start` — http://localhost:3000, bound to 127.0.0.1. Existing server is running; reuse it.
- `npm test` — 46 dependency-free Node checks.
- `npm run assets` — retrieve only missing configured covers.
- `npm run optimize:assets` — Python 3 + Pillow; deterministic working-image optimization from retained originals.
- `npm run preview` — rebuild embedded standalone HTML.
- `npm run package:local` — source + standalone ZIP in release/, with RELEASE-SHA256.json and ZIP integrity check.
- `npm run test:localhost` — Node Playwright + Chromium; optional PLAYWRIGHT_MODULE/BARSYS_TEST_URL overrides. See README.md.
- `npm run test:readiness`, `npm run test:browser` — legacy Python Playwright suites; missing dependency here.
- `npm run check:launch` — intentionally nonzero until production approvals are complete.

Next task: close the remaining device/automation verification coverage, then apply concrete RC review feedback. This file should be updated after every meaningful implementation batch.
