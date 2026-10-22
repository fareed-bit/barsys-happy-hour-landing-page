# Collins on the landing page — handoff

Last updated 2026-09-21. Written for whoever picks up the landing-page work next.

> **This repo is public.** Cost-to-deliver, margin figures and the pricing
> rationale are deliberately NOT in this file. They live in
> `~/barsys-collins-pricing-PRIVATE.md` on Fareed's machine. Keep it that way.

---

## What Collins is

**A package, not an add-on.** It is for a room that already has a bar — a client
with their own bar, their own bartenders and their own drinks list, who wants the
interactive layer on top of it.

It is deliberately **not** an add-on to Classic, Signature or Reserve, and
deliberately **not** included with Reserve. Every Barsys package already puts two
things in front of the guest that do Collins' job: a human bartender, and the
machine's own tablet, where "guests choose from the event menu, or let Barbot, the
Barsys AI, compose one". Selling Collins on top of that is a third way to choose a
drink standing next to two that are already there. In a room with no Barsys
machine there is no tablet and no Barbot, and Collins is the only Barsys thing
present. That is the whole product.

### How it works

Upload a photo of the bar. Collins reads the ingredients actually present, builds
a menu around them and the client's preferences, gives the recipes with precise
measurements, and walks the client or their bartender through executing each one.
The menu is then locked to what that bar can genuinely make — no off-menu
suggestions.

---

## Pricing

| | |
|---|---|
| Rate | **$45 per guest** |
| Event minimum | **$1,500** — binds below 34 guests, invisible above |
| Additional service time | **$250 per hour** (`collins-hours` add-on) |
| Deployment | **one iPad and stand per 25 guests**, with our team to run them |
| Baseline | two hours, same as every package |

| Guests | Charged | Stations |
|---|---|---|
| 20 | $1,500 (minimum) | 1 |
| 33 | $1,500 (minimum) | 2 |
| 34 | $1,530 | 2 |
| 50 | $2,250 | 2 |
| 100 | $4,500 | 4 |
| 250 | $11,250 | 10 |

$45 sits below Classic's $55, which is the intended relationship: Collins does not
pour, supply a bar, or bring machines.

`extra-hours` is **$500/hr and is not offered on Collins** — it is priced for a
full bar with machines and bartenders. Collins has its own `collins-hours` at
$250, because an extra Collins hour is our team running stations.

**Every figure on the site is read from `config.js`.** Nothing is typed into a
page. Change `packages.collins.rate`, `minimumFee` or `guestsPerStation` and the
planner, the marketing grid, the packages card and the Collins detail page all
follow. Do not restate a price in markup.

---

## Where it lives

| Thing | File |
|---|---|
| Collins package | `config.js` → `packages.collins` |
| Collins hourly | `config.js` → `addons` → `collins-hours` |
| Price, minimum, stations | `quote-engine.js` → `packagePrice`, `minimumApplies`, `stations` |
| Which add-ons a package offers | `quote-engine.js` → `packageAddons` |
| Planner package card | `app.js` → `packageCard` |
| Add-ons card (deck card 3) | `app.js` → `addonsCard` |
| Packages page + Collins page | `scripts/build-site.mjs` |
| Four-across card grid | `site/site.css` → `.cards-4` |

`site/collins.html` and `site/packages.html` are **generated**. Edit
`scripts/build-site.mjs` and run `node scripts/build-site.mjs`.

### Two config flags carry the behaviour

Collins' differences are driven by flags, not by checking for the name `collins`,
so a second bring-your-own-bar package would inherit all of it:

- **`bringsOwnBar: true`** → no glassware scope row in the quote, no glassware
  panel on the add-ons card. The client's own bar has its own glassware.
- **`menuLimit: 0`** → no Barsys menus. Switching to Collins clears retained menu
  preferences and says why.
- **`addonIds`** → only `collins-hours`, `branding` and `photographer` are
  offered. The rest assume Barsys is pouring, and the engine drops a stale
  selection from the quote rather than pricing it.
- **`packageIds`** on an add-on → the reverse direction, so `collins-hours` never
  appears on the bar packages.

---

## The planner

The deck is five cards: **Guests → Package → Add-ons → Location & date → Your
details**, then a success card.

Add-ons are card 3, not a sidebar. The card leads with a "Recommended add-ons"
group — glassware scope, beer & wine, additional service time — and folds the rest
into an "Other add-ons" disclosure. Each add-on card lists what it includes as
bullets, from `includes[]` in config. When a package offers too few add-ons to
group (Collins offers three), the card drops the grouping and shows them flat.

The Customize sheet is **Drinks and Details only**; its Add-ons tab was removed.

---

## Bugs

1. **Pricing contradiction across surfaces.** *(open)*
   `happyhours.barsys.com/blog/best-office-bar-service-nyc.html` states
   **$50 / $70 / $200**. The packages page states **$55 / $85 / $225**. All three
   tiers disagree. Fix before publishing a new price card.

2. **17px horizontal overflow at 390px.** *(fixed, `7c6f6e2`)* A 1px overflow at
   320px remains on every generated sub-page — pre-existing, not Collins-related.

---

## Blocker: the in-page Collins widget cannot be built yet

`events.barsys.com` resolves to `ghs.googlehosted.com` — a Cloud Run domain
mapping in project `happy-hour-landing-version-2` — which **bypasses the load
balancer entirely**. Consequently `/demo`, `/kiosk/*` and `/api/collins/*` all
return 404 publicly, and a widget on this site cannot reach Collins.

Unblocking it needs, in order:

1. An `INTERNET_FQDN_PORT` NEG in `barsyseliten` pointing at
   `barsys-happyhours-production-23nb3wybra-uk.a.run.app`. A serverless NEG cannot
   be used — it cannot reference a Cloud Run service in another project. The
   backend service **must** carry
   `--custom-request-header=Host:barsys-happyhours-production-23nb3wybra-uk.a.run.app`;
   without it the Cloud Run frontend 404s the original Host and the landing page
   goes down.
2. DNS: `CNAME ghs.googlehosted.com` → `A 136.68.142.9`, TTL 300.
3. `BARSYS_TRUSTED_PROXY_HOPS` 1 → 2 on `barsys-happyhours-production`.

Already done: the URL map path rule was narrowed from `/api/*` to `/api/collins/*`
plus `/api/age*`. Before that, routing this site through the load balancer would
have sent `/api/inquiries` and `/api/status` to Collins, silently destroying lead
capture. That is disarmed.

---

## Embargo — read before pushing

The name "Collins" is under embargo until **2026-10-07** (Asana P-BRAND-11).

Collins is now on the homepage planner, the packages page and its own detail page.
Pushing to this repo publishes the name and every price immediately, regardless of
whether anything is deployed, because the repo is public.

Note `ai.barsys.com` already serves the name publicly with `robots.txt: Allow: /`,
so the embargo is arguably already soft. Treat shipping before 2026-10-07 as a
decision to be made, not a date to trip over.

---

## Repo hygiene

This repo is **public and in a personal namespace** (`fareed-bit`) while serving a
production site backed by a customer database (`barsys-production-database-url`).
Moving it to `barsysindia` is cheap now and awkward later.

Two stale landing repos exist and are NOT the source of this site:
`barsysindia/barsys-happyhour`, `fareed-bit/Barsys-Updated-Happyhour`.

**There are two local checkouts.** `~/repos/barsys-happy-hour-landing-page` is
stale — it sits at `7fe0f4b` with pre-band Collins files quoting $1,200 / $2,750.
This checkout (`~/Documents/Codex/Barsys-Happy-Hours-Handoff-2026-09-11/project`)
is the current one. Do not commit from the other.

---

## History

Nine commits, `9f6b731`..`49bff85`, all **local and unpushed**. Collins moved
add-on → fourth card → its own package → flat-fee bands → per-guest, so the later
commits reverse the earlier ones. The messages carry the reasoning if you need to
know why a shape was abandoned; squash before pushing if you would rather the
public history not show the argument.
