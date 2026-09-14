import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticInquiry,owner} from './lifecycle-fixture.mjs';
import {validate,labels,estimate} from '../backend/model.mjs';
import {defaultPreparation} from '../backend/preparation.mjs';
import {defaultProposal} from '../backend/proposals.mjs';
import {emptyOperations,defaultEvent,applyOperation} from '../backend/operations.mjs';
import {acceptProposal,editedPayload,applyEventChange} from '../backend/event-changes.mjs';
function fixture(){const payload=validate(syntheticInquiry()),id='00000000-0000-4000-8000-000000000088';const doc={id,version:1,createdAt:'2026-09-10',payload,labels:labels(payload),estimate:estimate(payload),history:[],booking:{confirmed:false}};doc.preparation=defaultPreparation(payload);const state=emptyOperations();state.events[id]=defaultEvent();return {doc,state};}
test('accepted proposal handoff requires fresh preparation review even when quantities match',()=>{
  const {doc,state}=fixture(),plan=defaultProposal(doc);
  Object.assign(plan,{graceGuests:0,taxMilliPercent:0,expires:'2099-09-10',depositDue:'2099-09-10'});
  Object.assign(plan.details,{loadIn:'16:00',departure:'20:00'});
  for(const line of plan.lines)line.unitCents=0;for(const k of Object.keys(plan.confirmed))plan.confirmed[k]=true;
  doc.proposal={plan,revision:1,savedAt:'2026-09-10',sourceStale:false};
  const r=acceptProposal(doc,state,{revision:1,confirmed:true,reference:'Synthetic review only'},owner);
  assert.equal(r.doc.preparation.menuConfirmed,false);
  assert.equal(r.state.events[doc.id].preparationNeedsReview,true);
  r.state.events[doc.id].owner='Synthetic owner';r.state.events[doc.id].tasks[0].forEach(x=>x.done=true);
  assert.throws(()=>applyOperation(r.state,{action:'advance',payload:{eventId:doc.id}},owner),/preparation/i);
});
test('material event edits set the same preparation-review gate as preparation edits',()=>{
  const {doc,state}=fixture();state.events[doc.id].preparationNeedsReview=false;
  const changed=editedPayload(doc,{...doc.payload,guests:30});
  const r=applyEventChange(doc,changed,state,owner);
  assert.equal(r.doc.preparation.menuConfirmed,false);
  assert.equal(r.state.events[doc.id].preparationNeedsReview,true);
});
