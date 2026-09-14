> Current Codex continuation: see [PROJECT-STATE.md](PROJECT-STATE.md) and [qa/rc-verification.md](qa/rc-verification.md). The original notes below describe the exported V3.9 baseline.

# Barsys V3.9 - launch-readiness checklist

**Local review build complete. Production publication is not approved.**

## Implemented and exercised in the local build

| Area | Implemented behavior |
|---|---|
| Policies | Working footer notices/guides and a brand/media-reference disclosure, with keyboard navigation and focus restoration. |
| Privacy choices | Non-contact draft storage remains opt-in, with withdrawal, expiry and storage-unavailable fallback. Ordinary menu artwork loads normally and is independent of that choice. No fake analytics toggles. |
| Wizard | Venue approval status, COI request, optional contracting entity, explicit glassware scope, and required delivery/access line items. |
| Service notices | Responsible alcohol service, shared-environment allergens, no automatic venue or insurance approval, and no reservation from a preview. |
| Permissions | Optional marketing-interest and publicity-preference fields, separate from service acceptance; not subscriptions or releases. |
| Price scope | Preserved package baseline, tax unknown, unpriced extras outside subtotal, no negotiated example rate or refund schedule generalized. |
| Summary | Booking-stage distinctions, all new selections, pending scope, and event-specific deadlines left unset. |
| Media | Preserved local event assets; muted autoplay, pause controls, reduced-motion behavior and off-screen/modal pausing. |
| Accessibility | New dialog keyboard cycling, Escape/return focus, form-error descriptions, selected readability improvements, 320px header fix and wrapping controls. Not a complete audit. |
| Content records | Owner-authorized company asset register; separate pending brand-relationship checks and a read-only readiness check. No private proposal included. |

## Requires an approved business decision or production verification

1. Confirm the canonical package rates/hours and standard versus event-specific inclusions; approve rates and units for add-ons, glassware, transport and event-day extensions.
2. Approve deposit rules, notice delivery, exact non-overlapping cancellation boundaries, rescheduling, exceptional disruptions and card-payment disclosures. Do not derive company-wide terms from an unsigned client example.
3. Confirm the legal contracting entity, current public business contact details, current insurance coverage/limits and the relevant service authorization route for each event. A COI or building consent does not answer every authorization question.
4. Approve production privacy text based on actual hosting, recipients, CRM/email vendors, retention, security and applicable rights. Define any marketing signup process separately.
5. Inventory and control real production trackers/embeds before adding them. The current page has none; these settings are not a drop-in consent-management platform for future tags.
6. Server-side inquiry validation, authoritative recalculation, duplicate handling, receipt IDs and error recovery are implemented. Before production, approve notification recipients and wording, enable delivery deliberately, and verify monitoring/failure escalation. Payments remain separate and disabled.
7. Company asset ownership and use in this project are confirmed by the user; see reference/asset-authorization.md. Record any specific restrictions actually encountered, rather than re-requesting blanket ownership confirmation. Record the actual relationship and authorized name/logo use for every banner entry. Preserve customer proposal confidentiality.
8. Test the deployed site with screen readers and representative browsers/devices, including iOS autoplay behavior, keyboard, focus, contrast, reflow and data/storage behavior. The local checks are not WCAG certification.
9. Reconcile the final written proposal, website scope and operating process. Populate menu/guest-count/COI/access deadlines from an approved event agreement, not generic date offsets.

## Source handling

The supplied event agreement informs the planning principles in sections 1 (signature/deposit), 4 (responsible service and venue consent), 7-10 (event duration, access, configuration and insurance paperwork), 13-15 (cancellation/disruptions and allergens), and 16-17 (content permissions and confidentiality). Its negotiated numbers, personal details and dated deadlines are excluded from public defaults.

The reference video supplied the review categories; it is not legal authority. The website implementation decisions, storage defaults/expiry and accessibility controls are design/engineering choices, not terms taken from the proposal.

External implementation references, consulted 9 September 2026:
- W3C WAI carousel pattern: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
- W3C WAI carousel animation controls: https://www.w3.org/WAI/tutorials/carousels/animations/
- FTC data-minimization guidance: https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business

No statement in this checklist certifies compliance with a particular jurisdiction.
