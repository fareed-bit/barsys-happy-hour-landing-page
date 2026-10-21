import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sitePaths} from '../backend/site-seo.mjs';
const controller='https://apex.barsys.com/hud-assets/js/apex_analytics_consent.js';
test('all public pages install the opt-in controller exactly once without a referrer',()=>{
 for(const path of sitePaths){
  const file=path==='/'?'index.html':path.replace(/^\//,'')+(path.endsWith('/')?'index.html':'');
  const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.equal(html.split(controller).length-1,1,file);
  assert.ok(html.includes(`src="${controller}" referrerpolicy="no-referrer"`),file);
  assert.ok(!html.includes('apexEnableAnalytics('),'Only the consent controller may enable tracking');
 }
});
test('runtime notice describes optional analytics independently of draft storage',()=>{
 const notice=readFileSync(new URL('../runtime-content.js',import.meta.url),'utf8');
 for(const text of ['off by default','form field values','_apex_analytics_allowed','_apex_sid','Global Privacy Control'])assert.ok(notice.includes(text),text);
 assert.ok(!notice.includes('no analytics or advertising tags are installed'));
});
