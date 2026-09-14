import test from 'node:test';
import assert from 'node:assert/strict';
import {startFixture} from './lifecycle-fixture.mjs';
const meta={version:1,hold:false,holdReason:'',closedOn:'',taxDate:''};
async function seed(f,id='expired',extra={}){if(extra.source?.type==='gmail'){extra={...extra,source:{type:'gmail',messageId:id,threadId:id}};await f.store.insertMail({messageId:id,threadId:id,receivedAt:'2020-01-01'});}await f.store.insert({id,version:1,status:'received',createdAt:'2020-01-01',payload:{details:{name:'PRIVATE CONTACT',email:'private@example.invalid'}},...extra},'key-'+id,'fingerprint');await f.store.saveRetention('event:'+id,meta,0);}
test('expired unconverted removal erases active data, keeps receipt tombstone and rejects stale resurrection',async()=>{
 const f=await startFixture();try{await seed(f);const old=await f.store.get('expired');
 assert.equal((await f.request('/api/admin/retention/event/expired/remove',{method:'POST',body:{},anonymous:true})).status,401);
 assert.equal((await f.request('/api/admin/retention/event/expired/remove',{method:'POST',body:{}})).status,422);
 const r=await f.request('/api/admin/retention/event/expired/remove',{method:'POST',body:{version:1,reviewVersion:1,confirm:'REMOVE expired',reviewedCopies:true}});assert.equal(r.status,200);
 assert.equal(await f.store.get('expired'),null);assert.equal((await f.store.list()).length,0);
 const tombstone=await f.store.findKey('key-expired');assert.doesNotMatch(tombstone.document,/PRIVATE CONTACT|private@example/);
 assert.equal(await f.store.update({...old,version:2},1),false);
 assert.equal((await f.store.disposeInquiry('expired',1,1,'fareed@barsys.com')).removed,false);
 }finally{await f.close();}
});
test('holds, progressed records, unresolved delivery and stale review stop removal',async()=>{
 const f=await startFixture();try{
 for(const [id,extra] of [['held',{}],['proposal',{proposal:{}}],['mail',{source:{type:'gmail'}}],['recent',{createdAt:new Date().toISOString()}]]){await seed(f,id,extra);}
 await f.store.saveRetention('event:held',{...meta,version:2,hold:true},1);
 for(const id of ['held','proposal','mail','recent'])assert.equal((await f.store.disposeInquiry(id,1,id==='held'?2:1,'owner')).removed,false,id);
 await seed(f,'stale');assert.equal((await f.store.disposeInquiry('stale',1,2,'owner')).removed,false);
 await f.store.insert({id:'queued',version:1,status:'received',createdAt:'2020-01-01'},'queued','fp',true);await f.store.saveRetention('event:queued',meta,0);
 assert.equal((await f.store.disposeInquiry('queued',1,1,'owner')).removed,false);
 assert.equal((await f.store.list()).length,6);
 }finally{await f.close();}
});
test('concurrent removals commit once and invalidate stale operations writes',async()=>{
 const f=await startFixture();try{await seed(f);const ops=await f.store.getOperations();
 const results=await Promise.all([f.store.disposeInquiry('expired',1,1,'owner'),f.store.disposeInquiry('expired',1,1,'owner')]);
 assert.equal(results.filter(r=>r.removed).length,1);ops.version++;assert.equal(await f.store.saveOperations(ops,ops.version-1),false);
 }finally{await f.close();}
});
