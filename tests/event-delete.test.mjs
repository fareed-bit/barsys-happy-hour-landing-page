import test from 'node:test';
import assert from 'node:assert/strict';
import {startFixture,syntheticInquiry} from './lifecycle-fixture.mjs';
test('owner delete hides an inquiry everywhere except Records, refuses progressed events, and restore brings it back',async()=>{
 const f=await startFixture();
 try{
  const made=await f.request('/api/inquiries',{method:'POST',body:syntheticInquiry(),key:'delete-fixture-0001',anonymous:true});assert.equal(made.status,201);const id=made.body.id;
  const doc=()=>f.request('/api/admin/inquiries/'+id).then(r=>r.body);
  assert.equal((await f.request(`/api/admin/inquiries/${id}/delete`,{method:'POST',body:{version:1,confirm:true},anonymous:true})).status,401);
  assert.equal((await f.request(`/api/admin/inquiries/${id}/delete`,{method:'POST',body:{version:1}})).status,422);
  assert.equal((await f.request(`/api/admin/inquiries/${id}/delete`,{method:'POST',body:{version:7,confirm:true}})).status,409);
  // Progressed events are refused: a staff assignment on the operations record is enough.
  const ops=await f.store.getOperations();ops.events[id]={...(await import('../backend/operations.mjs')).defaultEvent(),staffing:[{id:'x'}]};ops.version++;await f.store.saveOperations(ops,ops.version-1);
  const refused=await f.request(`/api/admin/inquiries/${id}/delete`,{method:'POST',body:{version:1,confirm:true}});assert.equal(refused.status,409);assert.match(refused.body.error,/Records and health/);
  ops.events[id].staffing=[];ops.version++;await f.store.saveOperations(ops,ops.version-1);
  const deleted=await f.request(`/api/admin/inquiries/${id}/delete`,{method:'POST',body:{version:1,confirm:true}});assert.equal(deleted.status,200);assert.equal(deleted.body.deleted,true);
  assert.equal((await f.request('/api/admin/inquiries')).body.items.some(x=>x.id===id),false,'hidden from the desk list');
  assert.equal((await f.request('/api/crew/events')).body.events.some(x=>x.id===id),false,'hidden from crew');
  const d=await doc();assert.ok(d.deleted?.by);assert.match(d.history.at(-1).action,/deleted/);
  const records=await f.request('/api/admin/retention?kind=event');const row=records.body.items.find(x=>x.id===id);assert.ok(row,'still listed on Records');assert.equal(row.hidden,true);
  assert.equal((await f.request(`/api/admin/inquiries/${id}/delete`,{method:'POST',body:{version:d.version,confirm:true}})).status,409,'double delete refused');
  const restored=await f.request(`/api/admin/inquiries/${id}/restore`,{method:'POST',body:{version:d.version}});assert.equal(restored.status,200);assert.equal(restored.body.restored,true);
  assert.equal((await f.request('/api/admin/inquiries')).body.items.some(x=>x.id===id),true,'back on the desk');
  assert.equal((await doc()).deleted,undefined);
  assert.equal((await f.request(`/api/admin/inquiries/${id}/restore`,{method:'POST',body:{version:(await doc()).version}})).status,409,'restore of a live record refused');
 }finally{await f.close();}
});
