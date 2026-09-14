import assert from 'node:assert/strict';
import {defaultEvent} from '../backend/operations.mjs';
import {createStore} from '../backend/store.mjs';
if(process.env.BARSYS_ISOLATED_PG_CONFIRMED!=='synthetic-only')throw Error('Explicit synthetic-only database confirmation required');
const store=await createStore({databaseURL:process.env.BARSYS_ISOLATED_PG_URL});
try{
 const doc={id:'synthetic-expired',createdAt:'2020-01-01',status:'received',version:1,payload:{details:{email:'synthetic@example.invalid'}}};
 await store.insert(doc,'synthetic-key','fp');await store.saveRetention('event:'+doc.id,{version:1,hold:false},0);
 const ops=await store.getOperations();
 const results=await Promise.all([store.disposeInquiry(doc.id,1,1,'synthetic-owner'),store.disposeInquiry(doc.id,1,1,'synthetic-owner')]);
 assert.equal(results.filter(r=>r.removed).length,1);assert.equal(await store.get(doc.id),null);assert.equal((await store.list()).length,0);
 assert.doesNotMatch((await store.findKey('synthetic-key')).document,/synthetic@example/);
 ops.version++;assert.equal(await store.saveOperations(ops,ops.version-1),false);
 await store.insert({...doc,id:'held'},'held-key','fp');await store.saveRetention('event:held',{version:1,hold:true},0);
 assert.equal((await store.disposeInquiry('held',1,1,'synthetic-owner')).removed,false);assert.ok(await store.get('held'));
 for(let i=0;i<8;i++){
  const id='mail-race-'+i;
  await store.insertMail({messageId:id,threadId:id,receivedAt:'2020-01-01',text:'PRIVATE MAIL'});
  await store.saveRetention('mail:'+id,{version:1,hold:false},0);
  const actions=[()=>store.disposeMail(id,1,'synthetic-owner'),()=>store.insert({...doc,id:'event-'+i,source:{type:'gmail',messageId:id,threadId:id}},'mail-key-'+i,'fp')];
  const result=await Promise.allSettled((i%2?actions.reverse():actions).map(f=>f()));
  const removed=!!(await store.getMail(id)).disposedAt,converted=!!await store.get('event-'+i);
  assert.equal(removed&&converted,false);assert.equal(removed||converted,true);
  if(removed){assert.equal(await store.insertMail({messageId:id,receivedAt:'2020-01-01',text:'PRIVATE MAIL'}),false);assert.doesNotMatch(JSON.stringify(await store.getMail(id)),/PRIVATE MAIL/);}
 }
 await store.insert({...doc,id:'restore-private'},'restore-key','fp',true);
 await store.insertMail({messageId:'restore-mail',threadId:'restore-thread',receivedAt:'2020-01-01',text:'PRIVATE RESTORED'});
 const row=id=>({id,removed_at:'2026-09-10T00:00:00Z',actor:'synthetic-owner'});
 const ledger={schema:1,inquiries:[row('restore-private')],mail:[row('restore-mail'),row('missing-mail')]};
 await store.reconcileDisposals(ledger,{isolated:true});
 assert.equal(await store.get('restore-private'),null);assert.equal(await store.insertMail({messageId:'missing-mail',receivedAt:'2020-01-01'}),false);
 assert.doesNotMatch(JSON.stringify(await store.getMail('restore-mail')),/PRIVATE RESTORED/);
 await store.reconcileDisposals(ledger,{isolated:true});
 const core={...doc,id:'old-core',status:'completed',proposal:{note:'PRIVATE CORE'}};
 await store.insert(core,'core-key','fp');const state=await store.getOperations(),event=defaultEvent();
 Object.assign(event,{stage:8,revenueCents:1000,staffingConfirmed:true,actualHoursConfirmed:true,leftoverCents:0,stockUsedCents:0,payments:[{kind:'payment',amountCents:1000}],notes:'PRIVATE CORE'});event.expenses.forEach(e=>e.actualCents=0);state.events[core.id]=event;state.version++;await store.saveOperations(state,state.version-1);
 await store.saveRetention('event:'+core.id,{version:1,hold:false,closedOn:'2010-01-01',taxDate:'2011-01-01'},0);
 assert.equal((await store.retireEvent(core.id,1,1,'synthetic-owner')).removed,true);assert.equal(await store.get(core.id),null);
 assert.equal((await store.exportDisposalLedger()).retired[0].summary.profitCents,1000);
 console.log('PostgreSQL completed-event retirement passed.');
 console.log('PostgreSQL restore reconciliation and repeat replay passed.');
 console.log('Email disposal/conversion PostgreSQL races and reimport protection passed.');
 console.log('Isolated PostgreSQL 16: concurrent exactly-once removal, tombstone, stale operations and hold protection passed.');
}finally{await store.close();}
