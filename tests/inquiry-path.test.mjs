// The unified planner sends in one step when connected; preview vocabulary stays confined to standalone builds.
// V4.0: the old two-route (Quick proposal / Customize everything) wizard was replaced by a single
// flashcard planner in app.js. v3.js no longer owns any step/route state, so the "quick planner" checks
// below now target app.js's card flow instead. Step indices are derived from cardTitles rather than
// hardcoded, so inserting a card into the deck does not silently rot these assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const v3=read('v3.js'),app=read('app.js'),readiness=read('readiness.js'),client=read('inquiry-client.js'),index=read('index.html'),runtime=read('runtime-content.js');

const cardTitles=app.match(/const cardTitles=\[(.*?)\];/)[1].split(',').map(s=>s.trim().slice(1,-1));
const submitStep=cardTitles.length-1, successStep=cardTitles.length;

test('the deck runs guests, package, add-ons, location and details',()=>{
  assert.deepEqual(cardTitles,['Guests','Package','Add-ons','Location & date','Your details']);
  const card=app.match(/function addonsCard\(\)\{([^]*?)\n\}/)[1];
  assert.match(app,/const ESSENTIAL_ADDONS=\['collins','beer-wine'\];/);
  assert.match(card,/RECOMMENDED ADD-ONS/);
  assert.match(card,/glasswareMarkup\(state,'detail'\)\}\$\{addonGrid\(essentials\)/);
  assert.match(card,/<details class="addon-more"[^]*?Other add-ons/);
  assert.match(card,/addonGrid\(others\)/);
  assert.match(app,/\[guestCard,packageCard,addonsCard,whenCard,contactCard,successCard\]\[step\]/);
});

test('the unified planner labels the final action by mode and sends directly when connected',()=>{
  assert.match(app,/CONNECTED\?\(LIVE_MODE\?'Send inquiry':'Save test inquiry'\):'Create local event plan'/);
  assert.match(app,new RegExp(`if\\(step===${submitStep}\\)\\{if\\(CONNECTED\\)sendInquiry\\(\\);else submitLocalPlan\\(\\);return;\\}`));
  assert.match(app,/'Inquiry sent':'Test inquiry saved'/);
  assert.doesNotMatch(app,/LOCAL PREVIEW/);
  assert.doesNotMatch(v3,/LOCAL PREVIEW/);
});

test('sendInquiry sends through window.BarsysInquiry and lands on the success card',()=>{
  assert.match(app,/async function sendInquiry\(\)\{[^]*?window\.BarsysInquiry\.send\(\)/);
  assert.match(app,new RegExp(`receiptId=receipt\\.id;step=${successStep};furthest=${successStep};renderCard\\('forward'\\)`));
});

test('contact form asks for five things and one consent line',()=>{
  const contact=app.match(/function contactMarkup\(\)\{return `(.*?)`;\}/s)[1];
  assert.doesNotMatch(contact,/contractEntity|'venue'/);
  assert.equal((contact.match(/field\(|<textarea/g)||[]).length,5);
  assert.match(readiness,/function consentLine\(s\)/);
  assert.doesNotMatch(readiness,/photoPreference','Event publicity preference'/);
  assert.doesNotMatch(readiness,/request-clarity/);
  assert.match(app,/consentLine\(state,'detail'\)/);
  assert.doesNotMatch(v3,/consentLine/,'v3.js no longer renders any planner card; consentLine is only called from app.js now');
});

test('inquiry client exposes a single idempotent send and injects no panels',()=>{
  assert.match(client,/window\.BarsysInquiry=Object\.freeze\(\{connected,mode:runtime\?\.mode\|\|null,send,getReceipt/);
  assert.match(client,/'Idempotency-Key':key/);
  assert.doesNotMatch(client,/inquiry-submit-panel|success-actions/);
});

test('static copy no longer describes production as a local preview',()=>{
  for(const s of ['LOCAL PREVIEW','THIS LOCAL PREVIEW','for this copy'])assert.equal(index.includes(s),false,s);
  // The remember-selections checkbox now renders on the contact card (app.js) rather than as static
  // markup in index.html, since the two-route wizard's static #quick-planner shell was removed.
  assert.match(app,/<label class="quick-privacy quick-remember"><input id="quick-remember" type="checkbox"\/>/);
  assert.equal(index.includes('id="privacy-notice"'),false,'first-visit privacy popup removed');
  assert.match(runtime,/'Send inquiry shares your plan and contact details with the Barsys team\./);
  assert.match(runtime,/Only \$\{action\} stores the inquiry in \$\{destination\}/);
});
