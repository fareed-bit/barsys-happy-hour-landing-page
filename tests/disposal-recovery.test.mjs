import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {createStore} from '../backend/store.mjs';
const entry=id=>({id,removed_at:'2026-09-10T00:00:00Z',actor:'owner'});
async function fixture(){const dir=await mkdtemp('/tmp/barsys-recovery-');const store=await createStore({filename:dir+'/isolated.sqlite'});return {store,close:async()=>{await store.close();await rm(dir,{recursive:true});}};}
test('recovery removes restored copies, blocks reimport and clears stale auth/delivery state',async()=>{
 const f=await fixture();try{const s=f.store;
 await s.insert({id:'old',version:1,createdAt:'2020-01-01',payload:{private:'PRIVATE'}},'old-key','fp',true);
 await s.insert({id:'keep',version:1,createdAt:'2020-01-01'},'keep-key','fp',true);
 await s.insertMail({messageId:'email',threadId:'thread',receivedAt:'2020-01-01',text:'PRIVATE'});
 await s.saveSession('token',{email:'private@example.invalid'},Date.now()+60000);
 const ledger={schema:1,inquiries:[entry('old')],mail:[entry('email'),entry('not-in-backup')]};
 await assert.rejects(s.reconcileDisposals(ledger));
 assert.equal((await s.reconcileDisposals(ledger,{isolated:true})).removed,true);
 assert.equal(await s.get('old'),null);assert.ok(await s.get('keep'));assert.equal(await s.getSession('token',Date.now()),null);
 assert.doesNotMatch((await s.findKey('old-key')).document,/PRIVATE/);assert.equal((await s.listMail()).length,0);
 assert.equal(await s.insertMail({messageId:'not-in-backup',receivedAt:'2020-01-01',text:'PRIVATE'}),false);
 assert.ok((await s.notificationStatus()).every(j=>j.status==='unknown'&&j.inquiry_id==='keep'));
 await s.reconcileDisposals(ledger,{isolated:true});assert.equal((await s.exportDisposalLedger()).mail.length,2);
 }finally{await f.close();}
});
test('conflicting restored relationships roll back the entire recovery; malformed ledgers rejected',async()=>{
 const f=await fixture();try{const s=f.store;
 await s.insert({id:'old',version:1,createdAt:'2020-01-01',payload:{private:'PRIVATE'}},'key','fp');
 await s.insertMail({messageId:'linked',threadId:'thread',receivedAt:'2020-01-01'});
 await s.insert({id:'event',version:1,createdAt:'2020-01-01',source:{type:'gmail',messageId:'linked',threadId:'thread'}},'event-key','fp');
 await assert.rejects(s.reconcileDisposals({schema:1,inquiries:[entry('old')],mail:[entry('linked')]},{isolated:true}),/links/);
 assert.ok(await s.get('old'));assert.equal((await s.exportDisposalLedger()).inquiries.length,0);
 await assert.rejects(s.reconcileDisposals({schema:1,inquiries:[entry('old'),entry('old')],mail:[]},{isolated:true}),/Invalid/);
 }finally{await f.close();}
});
