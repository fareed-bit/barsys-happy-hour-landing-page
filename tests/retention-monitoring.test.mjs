import test from 'node:test';
import assert from 'node:assert/strict';
import {retentionView} from '../backend/retention.mjs';
import {startFixture,seedSession} from './lifecycle-fixture.mjs';
test('retention preserves active/core records, clamps leap dates, and prioritizes holds',()=>{
 const d={id:'e',createdAt:'2020-02-29T00:00:00Z',status:'received'};
 assert.equal(retentionView(d,'event',{}, {},Date.parse('2021-03-01')).reviewAt,'2021-02-28');
 const ops={events:{e:{stage:7}}};assert.equal(retentionView(d,'event',{},ops).reviewAt,null);
 ops.events.e.stage=8;
 assert.equal(retentionView(d,'event',{closedOn:'2020-01-01'},ops).reviewAt,null);
 assert.equal(retentionView(d,'event',{closedOn:'2020-01-01',taxDate:'2021-04-15'},ops).reviewAt,'2028-04-15');
 assert.equal(retentionView(d,'event',{hold:true},{},Date.parse('2030-01-01')).status,'On hold');
 assert.equal(retentionView({messageId:'m',receivedAt:'2020-01-01'},'mail').reviewAt,'2020-03-31');
});
test('owner retention reviews enforce auth, dates and optimistic updates without altering inquiries',async()=>{
 const f=await startFixture();try{
 const d={id:'sample',version:1,createdAt:'2020-01-01',status:'received'};await f.store.insert(d,'key','fp');
 assert.equal((await f.request('/api/admin/retention',{anonymous:true})).status,401);
 const ops=await f.store.getOperations();ops.staff.push({id:'crew',active:true,crewAccess:true,email:'crew@barsys.com'});ops.version++;await f.store.saveOperations(ops,ops.version-1);
 const crew=await seedSession(f.store,'crew@barsys.com');assert.equal((await f.request('/api/admin/retention',{session:crew})).status,403);
 const body={version:0,hold:true,holdReason:'Pending dispute',closedOn:'',taxDate:''};
 assert.equal((await f.request('/api/admin/retention/event/sample',{method:'PATCH',body:{...body,taxDate:'2020-02-30'}})).status,422);
 assert.equal((await f.request('/api/admin/retention/event/sample',{method:'PATCH',body})).status,200);
 assert.equal((await f.request('/api/admin/retention/event/sample',{method:'PATCH',body})).status,409);
 assert.equal((await f.request('/api/admin/retention')).body.items[0].status,'On hold');
 assert.deepEqual(await f.store.get('sample'),d);
 assert.equal((await f.request('/api/admin/system-health',{anonymous:true})).status,401);
 }finally{await f.close();}
});
test('queue health detects failures beyond latest 100 and pending backlog',async()=>{
 const f=await startFixture();try{
 for(let i=0;i<52;i++)await f.store.insert({id:'q'+i,version:1,createdAt:new Date().toISOString()},'k'+i,'fp',true);
 const job=await f.store.claimNotification(Date.now()+1000);await f.store.finishNotification(job.id,'failed',0,'failure');
 assert.equal((await f.store.notificationStatus())[0].status,'failed');
 const health=await f.store.notificationHealth(Date.now()+1000000);assert.equal(health.counts.failed,1);assert.equal(health.overdue,true);assert.equal(health.attention,true);
 const sending=await f.store.claimNotification(Date.now()+1000);assert.ok(sending);assert.equal((await f.store.notificationHealth(Date.now()+200000)).stalled,true);
 }finally{await f.close();}
});
test('missing and stale worker heartbeats require attention',async()=>{
 const f=await startFixture();try{
 assert.equal((await f.store.workerHealth(1000000)).stale,true);
 await f.store.recordWorkerSuccess(1000000);
 assert.equal((await f.store.workerHealth(1001000)).stale,false);
 assert.equal((await f.store.workerHealth(1900001)).stale,true);
 }finally{await f.close();}
});
