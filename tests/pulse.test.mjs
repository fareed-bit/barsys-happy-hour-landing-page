// Public monthly count: aggregate only, synthetic records excluded, threshold enforced by the toast.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startFixture,syntheticInquiry} from './lifecycle-fixture.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('GET /api/pulse counts distinct real teams this month and ignores synthetic ones',async()=>{
  const f=await startFixture();
  try{
    const post=async company=>{const r=await fetch(f.origin+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:f.origin,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({...syntheticInquiry(),details:{...syntheticInquiry().details,company}})});assert.equal(r.status,201,await r.text());};
    await post('Acme Robotics');await post('Acme Robotics');await post('Beta Labs');await post('SYNTHETIC QA - DO NOT FULFILL');
    const r=await fetch(f.origin+'/api/pulse');assert.equal(r.status,200);const d=await r.json();
    assert.equal(d.teamsThisMonth,2);assert.match(d.month,/^\d{4}-\d{2}$/);
    assert.equal(Object.keys(d).sort().join(','),'month,teamsThisMonth','no record details leak');
  }finally{await f.close();}
});

test('toast is connected-only, needs at least three teams, stores nothing',()=>{
  const s=read('pulse.js');
  assert.match(s,/if\(!window\.BARSYS_RUNTIME/);
  assert.match(s,/const MIN=3/);
  assert.doesNotMatch(s,/localStorage|sessionStorage|document\.cookie/);
  assert.match(read('index.html'),/<script defer src="pulse\.js"><\/script>/);
});
