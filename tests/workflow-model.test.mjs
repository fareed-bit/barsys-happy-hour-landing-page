import test from 'node:test';
import assert from 'node:assert/strict';
import {workItems,equipmentReceipt,stageSections} from '../admin/workflow-model.js';
const event=(id,date='')=>({id,payload:{details:{date}}});
const template={stage:0,owner:'Fareed',staffingConfirmed:true,due:''};
test('work queue prioritizes returns, deduplicates reasons and excludes completed events',()=>{
 const now=new Date(2026,8,9,12);
 const state={events:{return:{...template,stage:6,due:new Date(2026,8,8).toISOString()},today:template,closed:{...template,stage:8},later:template},reservations:[{eventId:'return',status:'dispatched',end:new Date(2026,8,8).toISOString()}]};
 const rows=workItems([event('today','2026-09-09'),event('return'),event('closed','2026-09-09'),event('later','2026-10-01')],state,template,now);
 assert.deepEqual(rows.map(x=>x.id),['return','today']);
 assert.deepEqual(rows[0].reasons,['Office return due','Deadline overdue']);
});
test('undated events are planning tasks, and future dispatched loads are not overdue',()=>{
 const state={events:{undated:{...template,owner:''},future:template},reservations:[{eventId:'future',status:'dispatched',end:'2030-01-01T00:00:00Z'}]};
 const rows=workItems([event('undated'),event('future')],state,template,new Date(2026,8,9));
 assert.equal(rows.length,1);assert.equal(rows[0].label,'Owner needed');assert.equal(rows[0].eventDate,'');
});
test('equipment receipt presets account for every asset and preserve unavailable conditions',()=>{
 for(const action of ['ready','cleaning','charging','repair'])assert.deepEqual(equipmentReceipt(action,1),{returned:1,lost:0,condition:action});
 assert.deepEqual(equipmentReceipt('missing',1),{returned:0,lost:1,condition:'repair'});
 assert.throws(()=>equipmentReceipt('unknown',1));
 assert.deepEqual(stageSections[6],['stock']);assert.deepEqual(stageSections[7],['finance']);
});

test('five-step presentation preserves all eight stored checkpoints',async()=>{
 const {flowStep,flowSteps}=await import('../admin/workflow-model.js');
 assert.equal(flowSteps.length,5);assert.deepEqual(Array.from({length:9},(_,i)=>flowStep(i)),[0,1,2,2,3,3,4,4,4]);
});
test('machine changes resize required equipment and clear packing without losing price overrides',async()=>{
 const {planningUpdate}=await import('../admin/workflow-model.js');
 const original={machines:2,recipes:[{id:'recipe'}],costOverrides:[{supplier:'Saved'}],equipment:{machines:{quantity:2,packed:true},shakers:{quantity:4,packed:true},wipes:{quantity:3,packed:true}}};
 const updated=planningUpdate(original,{machines:3,drinksPerGuest:3,bufferPercent:10,menuConfirmed:true},[{id:'machines',minimum:2},{id:'shakers',minimum:4},{id:'wipes',minimum:null}]);
 assert.equal(updated.equipment.shakers.quantity,6);assert.equal(updated.equipment.machines.quantity,3);assert.equal(updated.equipment.wipes.quantity,3);assert.ok(Object.values(updated.equipment).every(x=>!x.packed));assert.deepEqual(updated.costOverrides,original.costOverrides);assert.equal(original.equipment.shakers.packed,true);
});
test('next action exposes missing records before continuing',async()=>{
 const {recordGaps}=await import('../admin/workflow-model.js');
 assert.deepEqual(recordGaps({stage:0,owner:'',revenueCents:null},{},[]),['Assign an event owner.','Enter the agreed revenue.']);
 assert.equal(recordGaps({stage:6,owner:'Fareed'},{},[{status:'dispatched'}]).length,1);
 assert.equal(recordGaps({stage:8},{},[{status:'dispatched'}]).length,0);
 assert.match(recordGaps({stage:0,owner:'Fareed',revenueCents:1,preparationNeedsReview:true},{},[])[0],/Prepare step/);
 assert.equal(recordGaps({stage:0,owner:'Fareed',revenueCents:1,preparationNeedsReview:false},{},[]).length,0);
});
test('procurement subtracts ready stock and current allocations before pack rounding',async()=>{
 const {purchaseNeeds}=await import('../admin/workflow-model.js');const rows=[{name:'Vodka',unit:'ml',amount:1500,price:{packAmount:750,priceCents:2000}}];const s={openingStockZero:true,inventory:[{id:'v',name:'Vodka',kind:'consumable',unit:'ml',quantity:1000,condition:'ready'}],reservations:[{itemId:'v',eventId:'event',quantity:500,status:'reserved'}]};assert.equal(purchaseNeeds(rows,s,'event').purchases[0].packs,1);s.inventory[0].quantity=null;assert.equal(purchaseNeeds(rows,s,'event').unresolved.length,1);s.inventory=[];s.reservations=[];assert.equal(purchaseNeeds(rows,s,'event').purchases[0].packs,2);
});
