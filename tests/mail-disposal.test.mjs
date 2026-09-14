import test from 'node:test';
import assert from 'node:assert/strict';
import {startFixture} from './lifecycle-fixture.mjs';
const meta={version:1,hold:false,holdReason:'',closedOn:'',taxDate:''};
const mail=id=>({messageId:id,threadId:'thread-'+id,receivedAt:'2020-01-01',text:'PRIVATE EMAIL BODY',from:'private@example.invalid',payload:{}});
async function seed(f,id){await f.store.insertMail(mail(id));await f.store.saveRetention('mail:'+id,meta,0);}
test('owner email-copy removal clears private content, hides it and blocks reimport',async()=>{
 const f=await startFixture();try{
 await seed(f,'mail1');const path='/api/admin/retention/mail/mail1/remove',body={reviewVersion:1,confirm:'REMOVE mail1',reviewedCopies:true};
 assert.equal((await f.request(path,{method:'POST',body,anonymous:true})).status,401);
 assert.equal((await f.request(path,{method:'POST',body:{...body,reviewedCopies:false}})).status,422);
 assert.equal((await f.request(path,{method:'POST',body})).status,200);
 assert.equal((await f.store.listMail()).length,0);
 assert.doesNotMatch(JSON.stringify(await f.store.getMail('mail1')),/PRIVATE|private@example/);
 assert.equal(await f.store.insertMail(mail('mail1')),false);
 assert.equal((await f.request('/api/admin/email-inquiries/mail1/create',{method:'POST',body:{confirmed:true}})).status,404);
 assert.equal((await f.store.disposeMail('mail1',1,'owner')).removed,false);
 }finally{await f.close();}
});
test('holds, recent copies, stale reviews and other messages in converted threads block disposal',async()=>{
 const f=await startFixture();try{
 for(const id of ['held','recent','stale','linked'])await seed(f,id);
 await f.store.saveRetention('mail:held',{...meta,version:2,hold:true},1);
 await f.store.insertMail({...mail('new'),receivedAt:new Date().toISOString()});await f.store.saveRetention('mail:new',meta,0);
 await f.store.insert({id:'event1',version:1,createdAt:'2020-01-01',source:{type:'gmail',messageId:'linked',threadId:'thread-linked'}},'linked-key','fp');
 await f.store.insertMail({...mail('sibling'),threadId:'thread-linked'});await f.store.saveRetention('mail:sibling',meta,0);
 for(const [id,v] of [['held',2],['new',1],['stale',2],['linked',1],['sibling',1]])assert.equal((await f.store.disposeMail(id,v,'owner')).removed,false,id);
 }finally{await f.close();}
});
test('concurrent conversion and removal cannot both succeed; duplicate removal commits once',async()=>{
 const f=await startFixture();try{
 await seed(f,'race');
 const results=await Promise.allSettled([f.store.disposeMail('race',1,'owner'),f.store.insert({id:'converted',version:1,createdAt:'2020-01-01',source:{type:'gmail',messageId:'race',threadId:'thread-race'}},'race-key','fp')]);
 const removed=results[0].status==='fulfilled'&&results[0].value.removed;
 assert.equal(removed&&results[1].status==='fulfilled',false);
 assert.equal(removed||results[1].status==='fulfilled',true);
 await seed(f,'twice');const r=await Promise.all([f.store.disposeMail('twice',1,'owner'),f.store.disposeMail('twice',1,'owner')]);assert.equal(r.filter(x=>x.removed).length,1);
 }finally{await f.close();}
});
