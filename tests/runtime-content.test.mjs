import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function policies(mode,secure=false) {
  const context=vm.createContext({window:{BARSYS_RUNTIME:mode?{mode,secure}:undefined}});
  vm.runInContext(source('policy-content.js'),context);
  vm.runInContext(source('runtime-content.js'),context);
  return context.window.BARSYS_POLICIES;
}
test('standalone preserves memory-only notices and never claims a backend',()=>{
  const p=policies();assert.match(p.privacy.body,/stay in this open page/);
  assert.match(p.cookies.body,/does not set cookies/);
});
for(const mode of ['LOCAL_TEST','STAGING_TEST','LIVE']) test(`${mode} notices describe actual save and authentication behavior`,()=>{
  const p=policies(mode,mode!=='LOCAL_TEST');
  assert.doesNotMatch(p.privacy.body,/Your event details stay in this open page/);
  assert.match(p.privacy.body,/record persists/);assert.match(p.privacy.body,/Gmail/);
  assert.match(p.privacy.body,/No automatic retention or deletion schedule/);
  assert.doesNotMatch(p.cookies.body,/does not set cookies/);
  assert.match(p.cookies.body,/barsys_session/);assert.match(p.cookies.body,/8 hours/);
  assert.match(p.cookies.body,/5 minutes/);
  if(mode==='LIVE') {assert.match(p.privacy.body,/Send inquiry/);assert.doesNotMatch(p.privacy.body,/Use synthetic details/);}
  else assert.match(p.privacy.body,/Use synthetic details/);
  if(mode!=='LOCAL_TEST')assert.match(p.cookies.body,/__Host-barsys_session/);
});
test('connected privacy identifies operator, actual vendors, delivery separation and retention limits',()=>{
 const body=policies('LIVE',true).privacy.body;
 for(const phrase of ['Barsys Inc.','44 W 37th St','12 months','90 days','seven years','Cloud SQL','Cloud Run','Secret Manager','separate owner-authorized Gmail sender','deletion is not automatic'])assert.ok(body.includes(phrase),phrase);
 assert.doesNotMatch(body,/The app does not send/);
});
