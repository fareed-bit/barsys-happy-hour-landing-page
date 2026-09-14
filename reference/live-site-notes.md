# Public-site reference notes

Reviewed: 2026-09-08
Public page: https://happyhours.barsys.com/

## Provenance

The public page was read through web retrieval. Referenced images were opened and
visually inspected. Direct source and asset downloads from the build environment
failed, so this folder does not contain a purported original source snapshot.
The HTML/CSS/JavaScript in this project is a new, independent front-end rebuild.

Use `npm run snapshot` on your connected computer to capture the then-current
public HTML as inert text. That capture will reflect the date it is run, not
necessarily the version reviewed for this prototype.

## Data retained from the live page

- Classic: $55 per person.
- Signature: $85 per person.
- Reserve: $225 per person.
- Two hours of open-bar service.
- 20-person minimum in the planner; typical range capped at 250 in this preview.
- The source planner uses an 8.875% NYC tax assumption.
- All 20 named mixlist collections and their displayed recipe counts.
- Fareed's published contact email, fareed@barsys.com.
- Five company names from the current trust strip: Netflix, Wilhelmina, Flyhouse,
  DataDome and MongoDB. These are typographic treatments, not extracted vector logos.

## Intentional changes and assumptions

The content is reordered and rewritten for the visual prototype; it is not an
exact textual or functional mirror of the production page.

1. Experience and process content is consolidated; packages and menus precede the planner.
2. AI/product details support the service story rather than lead the hero.
3. Mixed press/client names were not recreated as a single indiscriminate media strip.
   The five retained names still require relationship and usage-permission confirmation.
   No new testimonial, client count, review score or scarcity claim was invented.
4. The source has a 20-person minimum and also describes typical events starting
   at 50. This preview makes its 20-250 calculator range explicit.
5. The source has different menu-count language in package features and the wizard.
   This prototype uses draft preference limits of Classic 2, Signature 3 and
   Reserve 5. Confirm against real fulfillment/pricing rules before launch.
6. Published recurring terms are not fully consistent across the page. This preview
   collects monthly/quarterly/undecided interest and applies no recurring discount.
7. Optional request categories are draft intake fields, not guaranteed inclusions
   or priced upgrades. They do not increase the displayed estimate.
8. Tax is labeled an assumption in an illustrative estimate; no automatic tax
   jurisdiction determination is made for New Jersey, Connecticut or other states.
9. Production submissions, tracking, payments, calendar booking and CRM updates are
   absent. The interface is purposely unable to report a real inquiry as received.
10. Cancellation, liability and contractual language is omitted pending review.

## Referenced imagery

All original URLs and proposed local paths are in `config.js`.

- `event`: existing Barsys event photograph, used in the hero.
  https://happyhours.barsys.com/photos/experience-event.jpg
- `machine`: existing rooftop Barsys 360 photograph, used in the machine section.
  https://happyhours.barsys.com/photos/machine-rooftop.jpg
- `signature`, `agave`, `spritz`, `fluid`: current mixlist artwork, used in the four
  featured menu cards. Product/menu artwork is not represented as event evidence.
- `vibrant`: current Vibrant Classics artwork, retained as an available menu asset.

The Fluid Code image is treated as menu illustration, not as proof of a real event.
No additional event crowds, customer logos or testimonials were generated.

## Still to validate with the actual codebase

Exact source framework and component structure; original image/video inventory;
backend schemas and endpoints; calculator/add-on/recurring rules; analytics and
consent requirements; accessibility and image delivery in target browsers; approved
copy, brand assets and real event case studies.
