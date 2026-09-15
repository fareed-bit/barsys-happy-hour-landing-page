// The public planner sends in one step in connected modes; preview vocabulary stays confined to standalone builds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const v3=read('v3.js'),app=read('app.js'),readiness=read('readiness.js'),client=read('inquiry-client.js'),index=read('index.html'),runtime=read('runtime-content.js');

test('quick planner labels the final action by mode and sends directly when connected',()=>{
  assert.match(v3,/sendLabel=connected\?\(live\?'Send inquiry':'Save test inquiry'\):'Create proposal preview'/);
  assert.match(v3,/if\(quickStep===1&&connected\)\{[^\n]*window\.BarsysInquiry\.send\(\)/);
  assert.match(v3,/'Inquiry sent':'Test inquiry saved'/);
  assert.doesNotMatch(v3,/LOCAL PREVIEW/);
});

test('full wizard sends on the review step when connected and keeps the local plan only standalone',()=>{
  assert.match(app,/CONNECTED\?\(LIVE_MODE\?'Send inquiry':'Save test inquiry'\):'Create local event plan'/);
  assert.match(app,/if\(currentStep===4\)\{if\(CONNECTED\)sendInquiry\(\);else submitLocalPlan\(\);\}/);
  assert.doesNotMatch(app,/LOCAL PREVIEW/);
});

test('contact form asks for five things and one consent line',()=>{
  const contact=app.match(/function contactMarkup\(\)\{return `(.*?)`;\}/s)[1];
  assert.doesNotMatch(contact,/contractEntity|'venue'/);
  assert.equal((contact.match(/field\(|<textarea/g)||[]).length,5);
  assert.match(readiness,/function consentLine\(s\)/);
  assert.doesNotMatch(readiness,/photoPreference','Event publicity preference'/);
  assert.doesNotMatch(readiness,/request-clarity/);
  assert.match(app,/consentLine\(state,'detail'\)/);
  assert.match(v3,/consentLine\(s,'quick'\)/);
});

test('inquiry client exposes a single idempotent send and injects no panels',()=>{
  assert.match(client,/window\.BarsysInquiry=Object\.freeze\(\{connected,mode:runtime\?\.mode\|\|null,send,getReceipt/);
  assert.match(client,/'Idempotency-Key':key/);
  assert.doesNotMatch(client,/inquiry-submit-panel|success-actions/);
});

test('static copy no longer describes production as a local preview',()=>{
  for(const s of ['LOCAL PREVIEW','THIS LOCAL PREVIEW','for this copy'])assert.equal(index.includes(s),false,s);
  assert.match(index,/<label class="quick-privacy quick-remember"><input id="quick-remember" type="checkbox"\/>/);
  assert.equal(index.includes('id="privacy-notice"'),false,'first-visit privacy popup removed');
  assert.match(runtime,/'Send inquiry shares your plan and contact details with the Barsys team\./);
  assert.match(runtime,/Only \$\{action\} stores the inquiry in \$\{destination\}/);
});
