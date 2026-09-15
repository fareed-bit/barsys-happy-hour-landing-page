// Owner and staff pickers default to whoever is signed in; existing values are never overwritten.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const ops=read('admin/operations.js'),desk=read('admin/app.js');

test('operations dashboard learns the signed-in user and prefills owner and staff pickers',()=>{
  assert.match(ops,/me=\(await api\('\/api\/auth\/me'\)\.catch\(\(\)=>\(\{\}\)\)\)\.user\|\|null;/);
  assert.match(ops,/field\('Event owner','owner',e\.owner\|\|meName\(\),'text'/);
  assert.match(ops,/x\.id===meStaff\(\)\?\.id&&!e\.staffing\.some\(s=>s\.staffId===x\.id\)\?'selected':''/);
  assert.match(ops,/meStaff=\(\)=>me\?\.email&&data\?state\(\)\.staff\.find\(x=>x\.active&&x\.email===me\.email\)/);
});

test('event desk prefills Assigned to with the signed-in user when the record has no owner',()=>{
  assert.match(desk,/if\(!me\)me=\(await api\('\/api\/auth\/me'\)\.catch\(\(\)=>\(\{\}\)\)\)\.user\|\|null;/);
  assert.match(desk,/value="\$\{esc\(d\.owner\|\|meName\(\)\)\}" placeholder="Team member name"/);
});

test('display name derives from the Workspace email when no staff record matches',()=>{
  const meName=email=>email.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  assert.equal(meName('fareed@barsys.com'),'Fareed');
  assert.equal(meName('first.last@barsys.com'),'First Last');
});
