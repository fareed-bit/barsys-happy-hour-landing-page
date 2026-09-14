import test from 'node:test';import assert from 'node:assert/strict';
import {emptyOperations,defaultEvent,applyOperation,finances} from '../backend/operations.mjs';
import {crewEvent,allowCrewAction} from '../backend/crew.mjs';
const id='00000000-0000-4000-8000-000000000001',actor='fareed@barsys.com';
const run=(s,action,payload={})=>applyOperation(s,{action,payload},actor);
const receipt={eventId:id,newItem:{name:'Vodka',kind:'consumable',unit:'ml'},quantity:1000,costCents:10000,paidCents:8000,supplier:'Test supplier',reference:'INV-1'};
test('zero opening, receipts and weighted inventory cost reconcile a complete trial event',()=>{
 let s=run(emptyOperations(),'opening-zero');s=run(s,'receive-stock',receipt);assert.equal(s.inventory[0].quantity,1000);assert.equal(s.inventory[0].stockValueCents,10000);assert.throws(()=>run(s,'receive-stock',receipt),/already received/);assert.throws(()=>run(s,'opening-zero'),/already/);
 const e=s.events[id];e.owner='Fareed';e.revenueCents=1600000;e.staffingConfirmed=true;e.actualHoursConfirmed=true;e.expenses.forEach(x=>{x.plannedCents=0;x.actualCents=0;});
 s=run(s,'payment',{eventId:id,kind:'deposit',amountCents:500000,date:'2026-09-09',reference:'DEP-1'});
 s=run(s,'reserve',{eventId:id,itemId:s.inventory[0].id,quantity:1000,start:'2026-10-01T12:00:00Z',end:'2026-10-01T22:00:00Z'});
 for(let stage=0;stage<8;stage++){for(let index=0;index<2;index++)s=run(s,'task',{eventId:id,stage,index,done:true});if(stage===3)s=run(s,'dispatch',{eventId:id,id:s.reservations[0].id});if(stage===6){assert.throws(()=>run(s,'advance',{eventId:id}),/every load/);s=run(s,'return',{eventId:id,id:s.reservations[0].id,returned:250,lost:50,condition:'ready',note:'50ml spillage'});}if(stage===7){assert.throws(()=>run(s,'advance',{eventId:id}),/client balance/);s=run(s,'payment',{eventId:id,kind:'payment',amountCents:1100000,date:'2026-09-10',reference:'TEST balance'});}s=run(s,'advance',{eventId:id});}
 const f=finances(s.events[id],s,id);assert.equal(f.consumed,7500);assert.equal(f.cash,8000);assert.equal(f.profit,1592500);assert.equal(f.payments.balanceCents,0);assert.equal(f.ledger.purchaseUnpaidCents,2000);assert.equal(s.inventory[0].stockValueCents,2500);assert.equal(s.events[id].stage,8);
});
test('unknown stock value remains incomplete and receipts never manufacture known prior value',()=>{
 let s=run(emptyOperations(),'inventory',{name:'Vodka',unit:'ml',kind:'consumable',quantity:100,condition:'ready'});s=run(s,'receive-stock',{...receipt,newItem:undefined,itemId:s.inventory[0].id});assert.equal(s.inventory[0].stockValueCents,null);
});
test('payments reject duplicate references and excess refunds without changing revenue',()=>{
 let s=emptyOperations();s.events[id]=defaultEvent();s.events[id].revenueCents=10000;const p={eventId:id,kind:'deposit',amountCents:5000,date:'2026-09-09',reference:'REF'};s=run(s,'payment',p);assert.throws(()=>run(s,'payment',p),/already recorded/);assert.throws(()=>run(s,'payment',{...p,kind:'refund',reference:'REF2',amountCents:6000}),/exceeds/);assert.equal(s.events[id].revenueCents,10000);
});
test('crew projections omit all financial fields and cross-event actions are denied',()=>{
 const s=emptyOperations();s.staff.push({id:'staff',active:true,crewAccess:true,email:'crew@barsys.com'});s.events[id]={...defaultEvent(),stage:3,staffing:[{staffId:'staff',rateCents:5000}],revenueCents:12345,notes:'Private finance'};
 const doc={id,payload:{guests:25,details:{name:'Client',budget:'private',email:'private'}},labels:{menus:[]}};
 const visible=JSON.stringify(crewEvent(s,doc));assert.ok(!visible.includes('12345'));assert.ok(!visible.includes('private'));assert.ok(!visible.includes('rateCents'));
 assert.throws(()=>allowCrewAction(s,'other@barsys.com',{action:'dispatch',payload:{eventId:id}}),/not assigned/);assert.throws(()=>allowCrewAction(s,'crew@barsys.com',{action:'payment',payload:{eventId:id}}),/cannot edit/);allowCrewAction(s,'crew@barsys.com',{action:'task',payload:{eventId:id,stage:3}});assert.throws(()=>allowCrewAction(s,'crew@barsys.com',{action:'task',payload:{eventId:id,stage:7}}),/current/);
});
test('supplier payment updates cumulative cash once and cannot exceed invoice',()=>{let s=run(emptyOperations(),'opening-zero');s=run(s,'receive-stock',receipt);const p={eventId:id,id:s.receipts[0].id,paidCents:10000};s=run(s,'pay-receipt',p);s=run(s,'pay-receipt',p);assert.equal(finances(s.events[id],s,id).cash,10000);assert.throws(()=>run(s,'pay-receipt',{...p,paidCents:11000}),/between/);});
test('lost equipment is charged at its recorded cost, reusable equipment is not expensed',()=>{let s=run(emptyOperations(),'opening-zero');s=run(s,'receive-stock',{...receipt,newItem:{name:'360',kind:'equipment',unit:'each'},quantity:1});const event=s.events[id];event.expenses.forEach(x=>x.actualCents=0);s=run(s,'reserve',{eventId:id,itemId:s.inventory[0].id,quantity:1,start:'2026-10-01T12:00:00Z',end:'2026-10-01T22:00:00Z'});s=run(s,'dispatch',{eventId:id,id:s.reservations[0].id});s=run(s,'return',{eventId:id,id:s.reservations[0].id,returned:0,lost:1,condition:'repair',note:'Missing asset'});assert.equal(finances(s.events[id],s,id).ledger.equipmentLossCents,10000);assert.equal(finances(s.events[id],s,id).consumed,10000);});
