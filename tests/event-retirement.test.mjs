import test from 'node:test';
import assert from 'node:assert/strict';
import {startFixture} from './lifecycle-fixture.mjs';
import {defaultEvent} from '../backend/operations.mjs';
import {receiptKey} from '../backend/receipt-key.mjs';
const meta={version:1,hold:false,closedOn:'2010-01-01',taxDate:'2011-01-01'};
async function seed(f){
 await f.store.insert({id:'retire',version:1,createdAt:'2010-01-01',status:'completed',payload:{details:{name:'PRIVATE CLIENT'}},proposal:{notes:'PRIVATE PROPOSAL'}},'retire-key','fp');
 const ops=await f.store.getOperations(),event=defaultEvent();Object.assign(event,{stage:8,staffingConfirmed:true,actualHoursConfirmed:true,revenueCents:10000,leftoverCents:0,stockUsedCents:0,notes:'PRIVATE VENUE',payments:[{amountCents:10000,kind:'payment',reference:'PRIVATE PAYMENT'}]});event.expenses.forEach(e=>{e.actualCents=0;e.note='PRIVATE EXPENSE';});
 ops.events.retire=event;ops.receipts=[{id:'receipt',eventId:'retire',itemId:'item',supplier:'PRIVATE SUPPLIER',reference:'PRIVATE INVOICE',paidCents:100,costCents:100}];ops.audit=[{eventId:'retire',detail:'PRIVATE AUDIT'},{eventId:'other',detail:'KEEP OTHER'}];ops.inventory=[{id:'item',quantity:5,stockValueCents:200}];ops.version++;
 await f.store.saveOperations(ops,1);await f.store.saveRetention('event:retire',meta,0);return ops;
}
test('retirement removes linked details atomically while retaining totals and shared stock',async()=>{
 const f=await startFixture();try{const old=await seed(f);
 const r=await f.request('/api/admin/retention/event/retire/retire',{method:'POST',body:{version:1,reviewVersion:1,confirm:'RETIRE retire',reviewedCopies:true,obligationsCleared:true}});assert.equal(r.status,200);
 assert.equal(await f.store.get('retire'),null);const ops=await f.store.getOperations();assert.doesNotMatch(JSON.stringify(ops),/PRIVATE/);assert.deepEqual(ops.inventory,old.inventory);assert.equal(ops.audit[0].detail,'KEEP OTHER');assert.ok(ops.retiredReceiptKeys.includes(receiptKey(old.receipts[0])));
 const ledger=await f.store.exportDisposalLedger();assert.equal(ledger.retired[0].summary.profitCents,10000);assert.doesNotMatch(JSON.stringify(ledger),/PRIVATE/);
 assert.equal((await f.store.retireEvent('retire',1,1,'owner')).removed,false);
 }finally{await f.close();}
});
test('retirement rejects missing confirmation, holds, new tax dates and unsettled payments',async()=>{
 const f=await startFixture();try{await seed(f);
 assert.equal((await f.request('/api/admin/retention/event/retire/retire',{method:'POST',body:{}})).status,422);
 await f.store.saveRetention('event:retire',{...meta,version:2,hold:true},1);assert.equal((await f.store.retireEvent('retire',1,2,'owner')).removed,false);
 await f.store.saveRetention('event:retire',{...meta,version:3,taxDate:'2026-01-01'},2);assert.equal((await f.store.retireEvent('retire',1,3,'owner')).removed,false);
 await f.store.saveRetention('event:retire',{...meta,version:4},3);const ops=await f.store.getOperations();ops.events.retire.payments=[];ops.version++;await f.store.saveOperations(ops,ops.version-1);assert.equal((await f.store.retireEvent('retire',1,4,'owner')).removed,false);
 assert.ok(await f.store.get('retire'));
 }finally{await f.close();}
});
test('retirement ledger redacts an older restored event and preserves restoration inventory',async()=>{
 const source=await startFixture(),target=await startFixture();try{
 await seed(source);const before=await seed(target);await source.store.retireEvent('retire',1,1,'owner');
 const ledger=await source.store.exportDisposalLedger();await target.store.reconcileDisposals(ledger,{isolated:true});
 assert.equal(await target.store.get('retire'),null);assert.doesNotMatch(JSON.stringify(await target.store.getOperations()),/PRIVATE/);assert.deepEqual((await target.store.getOperations()).inventory,before.inventory);
 }finally{await source.close();await target.close();}
});

test('a restore from before closeout cannot discard active stock or event state',async()=>{
 const source=await startFixture(),target=await startFixture();try{await seed(source);await seed(target);await source.store.retireEvent('retire',1,1,'owner');const state=await target.store.getOperations();state.events.retire.stage=4;state.version++;await target.store.saveOperations(state,state.version-1);await assert.rejects(target.store.reconcileDisposals(await source.store.exportDisposalLedger(),{isolated:true}),/predates/);assert.ok(await target.store.get('retire'));assert.equal((await target.store.getOperations()).events.retire.stage,4);}finally{await source.close();await target.close();}
});
