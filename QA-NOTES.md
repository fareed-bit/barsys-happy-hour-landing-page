> Current Codex continuation: see [PROJECT-STATE.md](PROJECT-STATE.md) and [qa/rc-verification.md](qa/rc-verification.md). The original notes below describe the exported V3.9 baseline.

# V3.9 verification notes - Codex local handoff

Date: 9 September 2026. Baseline: V3.8 Planning Safeguards.

## Executed checks
- `qa/node-tests-v39.txt`: 39 Node tests passed, zero failed. Includes the existing 33 catalogue, pricing, media and planning safeguards checks, plus six artwork/owner-authorization/handoff regression tests.
- `qa/readiness-browser.json`: both planning flows; venue/COI/glassware scope; independent marketing/publicity preferences; export and validation; no draft writes before opt-in; whitelist/withdrawal using a simulated store; normal image sources before opt-in; storage withdrawal does not hide artwork; policy and preferences keyboard controls.
- `qa/readiness-media.json`: muted automatic hero playback, four visible experience previews, overlay/off-screen pause, keyboard stopping carousel rotation, section controls and reduced motion.
- `qa/wizard-report.json`: all eight add-ons, preserved selections on package changes, both routes, custom-quote exceptions, summary export and a temporary in-memory synthetic-rate calculation. No real pricing configuration was changed.
- Responsive checks at 320, 390, 600, 768, 1024, 1440 and 1920 pixels: no page-level horizontal overflow across tested wizard stages and privacy/policy surfaces.
- `qa/preservation-v39.json`: original asset and configuration preservation checks against the V3.8 ZIP.
- `qa/launch-check-v39.txt`: remaining production decisions and unverified banner relationships are intentionally reported; company media ownership/use is owner-authorized rather than held for repeated blanket approval.

## Limits
Browser tests use the complete generated standalone HTML via Chromium/Playwright `set_content`. Browser-origin navigation is restricted in this authoring runtime, so actual localhost/file navigation, native storage across browser restarts and Safari/iOS hardware need local verification. Storage persistence checks used an explicit memory mock. No full screen-reader/assistive-technology or comprehensive WCAG audit was performed.

The eight configured official mixlist covers are not bundled yet. Their normal sources were checked without consent; network requests were intercepted in Chromium. This is not a claim that the live image host was reachable. Run `npm run assets` in the user's connected local environment, inspect each download and rebuild with `npm run preview` for fully offline imagery. The browser test supports both remote-cover and successfully bundled-cover states.

No inquiry, signature, booking, charge, subscription, legal approval, real client publicity permission or deployment was performed. These files are an editable local preview, not a production repository or legal compliance certification.
