import test from 'node:test';import assert from 'node:assert/strict';
import {inquiryNotifications} from '../backend/notifications.mjs';
import {startFixture,syntheticInquiry,seedSession} from './lifecycle-fixture.mjs';
test('notification drafts confirm receipt without booking or sensitive internal email content',()=>{
 const doc={id:'test-id',payload:syntheticInquiry()};const n=inquiryNotifications(doc);
 assert.equal(n.deliveryEnabled,false);assert.equal(n.customer.to,doc.payload.details.email);assert.equal(n.internal.to,'fareed@barsys.com');assert.match(n.customer.text,/does not hold a date/);assert.ok(!n.internal.text.includes(doc.payload.details.email));assert.ok(!n.internal.text.includes(doc.payload.details.venue));
});
test('notification previews are owner-only and do not change inquiry state',async t=>{
 const f=await startFixture();t.after(f.close);const r=await f.request('/api/inquiries',{method:'POST',body:syntheticInquiry(),key:'notification-preview-0001',anonymous:true});const id=r.body.id;const path='/api/admin/inquiries/'+id+'/notification-preview';
 assert.equal((await f.request(path,{anonymous:true})).status,401);const state=await f.store.getOperations();state.staff.push({id:'notification-crew',active:true,email:'crew@barsys.com',crewAccess:true});state.version++;await f.store.saveOperations(state,state.version-1);const crew=await seedSession(f.store,'crew@barsys.com');assert.equal((await f.request(path,{session:crew})).status,403);assert.equal((await f.request('/api/admin/inquiries/00000000-0000-0000-0000-000000000000/notification-preview')).status,404);const before=await f.store.get(id);const preview=await f.request(path);assert.equal(preview.status,200);assert.equal(preview.body.status,'draft_only');assert.deepEqual(await f.store.get(id),before);
});
