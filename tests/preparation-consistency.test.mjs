import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyPreparationChange} from '../backend/preparation-changes.mjs';
import {defaultPreparation} from '../backend/preparation.mjs';
import {defaultEvent, emptyOperations, applyOperation} from '../backend/operations.mjs';
import {createStore} from '../backend/store.mjs';
import {createAPI} from '../backend/api.mjs';
const id='00000000-0000-4000-8000-000000000088', actor='fareed@barsys.com';
function fixture() {
  const payload={guests:50,menus:['signature'],menuMode:'choose',tier:'signature'};
  const doc={id,version:1,createdAt:'2026-09-09',payload,history:[],booking:{confirmed:false}};
  doc.preparation=defaultPreparation(payload);
  const state=emptyOperations(); state.events[id]=defaultEvent();
  return {doc,state,plan:structuredClone(doc.preparation)};
}
test('quantity edits invalidate readiness without altering accepted figures, ledgers or originals',()=>{
  const {doc,state,plan}=fixture(), e=state.events[id];
  e.stage=2;e.revenueCents=425000;e.payments=[{reference:'synthetic',amountCents:10000}];
  doc.preparation.equipment.shakers.packed=plan.equipment.shakers.packed=true;
  const original=structuredClone({doc,state});plan.drinksPerGuest=4;
  const result=applyPreparationChange(doc,plan,state,actor);
  assert.equal(result.doc.preparation.equipment.shakers.packed,false);
  assert.equal(result.doc.preparation.menuConfirmed,false);
  assert.equal(result.state.events[id].stage,1);assert.equal(result.state.events[id].preparationNeedsReview,true);
  assert.equal(result.state.events[id].revenueCents,425000);
  assert.deepEqual(result.state.events[id].payments,e.payments);
  assert.deepEqual(result.doc.booking,doc.booking);assert.deepEqual({doc,state},original);
});
for (const status of ['reserved','dispatched']) test(`preparation rejects quantity changes with ${status} stock`,()=>{
  const {doc,state,plan}=fixture();state.reservations=[{eventId:id,status}];
  for (const mutate of [p=>p.drinksPerGuest=4,p=>p.recipes[0].ingredients[0].amount++,p=>p.equipment.shakers.quantity++]) {
    const next=structuredClone(plan);mutate(next);
    assert.throws(()=>applyPreparationChange(doc,next,state,actor),/reserved stock|dispatched stock/);
  }
});
test('accepted machine allocation can only change through a revised accepted proposal',()=>{
  const {doc,state,plan}=fixture();doc.acceptances=[{revision:1,plan:{machines:2}}];
  plan.machines=3;
  for(const [key,factor] of Object.entries({machines:1,cords:1,blocks:1,ipads:1,stands:1,shakers:2,funnels:1,glasses:2}))plan.equipment[key].quantity=3*factor;
  assert.throws(()=>applyPreparationChange(doc,plan,state,actor),/revised proposal/);
});
test('packing is permitted with reservations but changes to quantities are not',()=>{
  const {doc,state,plan}=fixture();state.events[id].stage=3;
  state.reservations=[{eventId:id,status:'reserved'}];plan.equipment.shakers.packed=true;
  assert.equal(applyPreparationChange(doc,plan,state,actor).doc.preparation.equipment.shakers.packed,true);
  plan.drinksPerGuest=4;assert.throws(()=>applyPreparationChange(doc,plan,state,actor),/packing or later/);
});
test('dispatched preparation and closed events cannot be silently changed',()=>{
  const {doc,state,plan}=fixture();state.events[id].stage=4;plan.equipment.shakers.notes='Changed';
  assert.throws(()=>applyPreparationChange(doc,plan,state,actor),/read-only after dispatch/);
  state.events[id].stage=8;assert.throws(()=>applyPreparationChange(doc,plan,state,actor),/closed/);
});
test('revised recipe measurements require a second explicit confirmation',()=>{
  const {doc,state,plan}=fixture();plan.recipes[0].ingredients[0].amount++;
  const first=applyPreparationChange(doc,plan,state,actor);
  assert.equal(first.doc.preparation.recipes[0].confirmed,false);
  const e=first.state.events[id];e.owner='Test owner';e.tasks[e.stage].forEach(t=>t.done=true);
  assert.throws(()=>applyOperation(first.state,{action:'advance',payload:{eventId:id}},actor),/Preparation changed/);
  const confirmed=structuredClone(first.doc.preparation);confirmed.menuConfirmed=true;confirmed.recipes[0].confirmed=true;
  const second=applyPreparationChange(first.doc,confirmed,first.state,actor);
  assert.equal(second.state.events[id].preparationNeedsReview,false);
});
test('identical preparation is a no-op',()=>{
  const {doc,state,plan}=fixture();const result=applyPreparationChange(doc,plan,state,actor);
  assert.equal(result.unchanged,true);assert.equal(result.doc.version,1);assert.equal(result.state.version,1);
});
async function apiFixture(t) {
  const dir=await mkdtemp(join(tmpdir(),'barsys-preparation-consistency-'));
  const store=await createStore({filename:join(dir,'isolated.sqlite')});
  const {doc,state}=fixture();await store.insert(doc,'synthetic-preparation-key','fingerprint');
  state.version=2;await store.saveOperations(state,1);
  let handler, identity=actor;
  const server=http.createServer((req,res)=>handler(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  handler=createAPI({store,origin,auth:{clientId:'test',require:async()=>{if(!identity)throw Object.assign(Error('Sign in'),{status:401});return identity;}}});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await store.close();await rm(dir,{recursive:true,force:true});});
  const url=origin+'/api/admin/inquiries/'+id+'/preparation';
  return {store,doc,state,setIdentity:v=>identity=v,get:async()=>(await fetch(url)).json(),patch:body=>fetch(url,{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})};
}
test('HTTP preparation requires both versions and commits event plus operations together',async t=>{
  const f=await apiFixture(t), view=await f.get();view.plan.drinksPerGuest=4;
  assert.equal((await f.patch({version:view.version,plan:view.plan})).status,409);
  assert.equal((await f.patch({version:view.version,operationsVersion:999,plan:view.plan})).status,409);
  const input={version:view.version,operationsVersion:view.operationsVersion,plan:view.plan};
  const response=await f.patch(input);assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.version,2);assert.equal(result.operationsVersion,3);
  assert.equal(result.plan.menuConfirmed,false);assert.ok(result.impact.warnings.length);
  assert.equal((await f.store.getOperations()).events[id].preparationNeedsReview,true);
  assert.equal((await f.patch(input)).status,409);
});
test('HTTP stock race rolls back preparation rather than half-saving',async t=>{
  const f=await apiFixture(t), view=await f.get();view.plan.drinksPerGuest=4;
  const atomic=f.store.saveEventAndOperations;
  f.store.saveEventAndOperations=async(...args)=>{
    const state=await f.store.getOperations();const next=structuredClone(state);next.version++;
    next.reservations.push({eventId:id,status:'reserved',itemId:'synthetic'});
    assert.equal(await f.store.saveOperations(next,state.version),true);
    return atomic(...args);
  };
  assert.equal((await f.patch({version:view.version,operationsVersion:view.operationsVersion,plan:view.plan})).status,409);
  assert.equal((await f.store.get(id)).version,1);assert.equal((await f.store.get(id)).preparation.drinksPerGuest,3);
  assert.equal((await f.store.getOperations()).reservations.length,1);
});
test('HTTP preparation retains owner authorization',async t=>{
  const f=await apiFixture(t), view=await f.get(), body={version:view.version,operationsVersion:view.operationsVersion,plan:view.plan};
  f.setIdentity('crew@barsys.com');assert.equal((await f.patch(body)).status,403);
  f.setIdentity(null);assert.equal((await f.patch(body)).status,401);
});
test('withdrawing menu approval prevents advancement without changing stock commitments',()=>{
  const {doc,state,plan}=fixture();state.events[id].stage=3;
  state.reservations=[{eventId:id,status:'reserved'}];plan.menuConfirmed=false;
  const result=applyPreparationChange(doc,plan,state,actor);
  assert.equal(result.state.events[id].preparationNeedsReview,true);
  assert.equal(result.state.events[id].stage,1);
  assert.deepEqual(result.state.reservations,state.reservations);
});
test('post-dispatch cost-reference corrections do not amend quantities or actual ledgers',()=>{
  const {doc,state,plan}=fixture();state.events[id].stage=6;
  plan.costOverrides=[{name:'Test ingredient',unit:'ml',packAmount:750,priceCents:1000,supplier:'Synthetic fixture'}];
  const result=applyPreparationChange(doc,plan,state,actor);
  assert.equal(result.state.events[id].stage,6);assert.equal(result.impact.material,false);
  assert.deepEqual(result.doc.preparation.recipes,doc.preparation.recipes);
});
test('both preparation interfaces send the shared operations version',async()=>{
  const {readFile}=await import('node:fs/promises');
  for(const name of ['admin/preparation.js','admin/operations.js']) {
    const text=await readFile(new URL('../'+name,import.meta.url),'utf8');
    assert.match(text,/operationsVersion:(saved|prep)\.operationsVersion/);
  }
});
