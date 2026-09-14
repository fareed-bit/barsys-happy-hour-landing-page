import {receiveStock,recordPayment,paymentSummary,stockCosts} from './purchasing.mjs';
import {randomUUID} from 'node:crypto';
import {HttpError} from './model.mjs';
export const stages=['Confirm event','Plan & budget','Purchase & arrange','Pack & dispatch','Arrive & set up','Run & close event','Return to office','Reconcile & complete'];
export const checklist=[['Client, venue and date confirmed','Revenue and service scope agreed'],['Menu and ingredient quantities reviewed','Staff and equipment assigned'],['Supplier orders and rentals confirmed','Transport and venue access arranged'],['Packing checklist checked','Load checked by responsible staff'],['Equipment tested and ingredients loaded','Team ready for service'],['Service finished and venue cleaned','Return load checked'],['Office received equipment and supplies','Cleaning, charging and damage assigned'],['Invoices and actual hours entered','Leftovers valued and finances reviewed']];
export const expenseCategories=['Spirits, mixers & ingredients','Ice & consumables','Transport & parking','Glassware & rentals','Payment fees','Equipment & overhead','Other'];
export const emptyOperations=()=>({version:1,inventory:[],staff:[],events:{},reservations:[],audit:[]});
export const defaultEvent=()=>({stage:0,orders:[],owner:'',due:'',notes:'',tasks:checklist.map(a=>a.map(()=>({done:false,by:null,at:null}))),revenueCents:null,targetMargin:80,leftoverCents:null,stockUsedCents:null,expenses:expenseCategories.map(name=>({name,plannedCents:null,actualCents:null,note:''})),staffing:[],staffingConfirmed:false,actualHoursConfirmed:false});
const fail=m=>{throw new HttpError(422,m);};
const str=(x,n=200)=>{if(typeof x!=='string'||x.length>n)fail('Text is missing or too long.');return x.trim();};
const num=(x,min,max)=>{if(!Number.isFinite(x)||x<min||x>max)fail('Number outside allowed range.');return x;};
const money=x=>x===null?null:Number.isInteger(x)?num(x,0,100000000):fail('Amounts must be whole USD cents or unknown.');
const stamp=x=>{if(typeof x!=='string'||!/^\d{4}-\d\d-\d\dT/.test(x)||!Number.isFinite(Date.parse(x)))fail('Enter a valid start and end time.');return new Date(x).toISOString();};
const overlap=(a,b)=>a.start<b.end&&b.start<a.end;
const day=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
export function finances(e,state=null,eventId=null){
 const ledger=e.inventoryCosting&&state?stockCosts(state,eventId):null;
 const plannedStaff=e.staffing.reduce((n,s)=>n+Math.round(s.plannedHours*s.rateCents),0),actualStaff=e.staffing.reduce((n,s)=>n+(s.actualHours===null?0:Math.round(s.actualHours*s.rateCents)),0);
 const planned=plannedStaff+e.expenses.reduce((n,x)=>n+(x.plannedCents??0),0),cash=actualStaff+e.expenses.reduce((n,x)=>n+(x.actualCents??0),0);
 const plannedComplete=e.staffingConfirmed&&e.expenses.every(x=>x.plannedCents!==null),actualComplete=(!e.inventoryCosting||!!ledger?.complete)&&e.actualHoursConfirmed&&e.staffingConfirmed&&e.staffing.every(x=>x.actualHours!==null)&&e.expenses.every(x=>x.actualCents!==null)&&(ledger!==null||(e.leftoverCents!==null&&e.stockUsedCents!==null));
 const consumed=cash+(ledger?.equipmentLossCents??0)+(ledger?ledger.issuedCents:(e.stockUsedCents??0))-(ledger?ledger.returnedCents:(e.leftoverCents??0)),profit=!e.agreementNeedsReview&&e.revenueCents!==null&&actualComplete?e.revenueCents-consumed:null;
 return {payments:paymentSummary(e),ledger,plannedStaff,actualStaff,planned,cash:cash+(ledger?.purchasePaidCents??0),consumed,plannedComplete,actualComplete,plannedProfit:!e.agreementNeedsReview&&plannedComplete&&e.revenueCents!==null?e.revenueCents-planned:null,profit,margin:profit!==null&&e.revenueCents>0?profit/e.revenueCents*100:null,budget:e.revenueCents===null?null:Math.round(e.revenueCents*(1-e.targetMargin/100))};
}
export function availability(state,item){const committed=state.reservations.filter(r=>r.itemId===item.id&&r.status==='reserved').reduce((n,r)=>n+r.quantity,0);return item.quantity===null?null:item.quantity-committed;}
// A single compare-and-swap writes the shared ledger: competing reservations cannot both commit.
export function applyOperation(previous,command,actor,now=new Date().toISOString()){
 const s=structuredClone(previous),p=command.payload||{},action=command.action;let event;
 if(p.eventId){if(!/^[a-f0-9-]{36}$/.test(p.eventId))fail('Invalid event.');event=s.events[p.eventId]??=defaultEvent();}
 const needEvent=()=>{if(!event)fail('Select an event.');if(event.stage===8)fail('This event is closed. Reopen it before editing.');return event;};
 if(action==='opening-zero'){
  if(s.openingStockZero)fail('Opening stock is already recorded.');
  if(s.inventory.length||s.reservations.length)fail('Opening zero can only be set in an empty inventory workspace.');
  s.openingStockZero={at:now,by:actor};
 }else if(action==='receive-stock'){needEvent();receiveStock(s,p,event,actor,now);
 }else if(action==='pay-receipt'){needEvent();const receipt=s.receipts?.find(x=>x.id===p.id&&x.eventId===p.eventId);if(!receipt)fail('Receipt not found.');const paid=money(p.paidCents);if(paid===null||paid<receipt.paidCents||paid>receipt.costCents)fail('Updated total paid must be between the previous amount and invoice cost.');receipt.paidCents=paid;receipt.paymentUpdatedAt=now;
 }else if(action==='receipt-file'){
  // Photo/PDF receipt with the amount paid: a financial record kept with the event for seven years. Bytes are stored by the API; only the reference lives here.
  needEvent();event.receiptFiles??=[];
  if(!/^[a-f0-9-]{36}$/.test(p.id||'')||event.receiptFiles.some(x=>x.id===p.id))fail('Invalid receipt id.');
  if(typeof p.objectPath!=='string'||!p.objectPath.startsWith(`events/${p.eventId}/receipts/${p.id}.`)||p.objectPath.length>200)fail('Invalid receipt file path.');
  if(!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||p.amountCents>100000000)fail('Enter the amount paid, greater than zero.');
  const supplier=str(p.supplier,200);if(!supplier)fail('Enter the supplier (for example Gopuff).');
  if(!day(p.paidOn))fail('Enter the date paid (YYYY-MM-DD).');if(p.paidOn>new Date(Date.parse(now)+86400000).toISOString().slice(0,10))fail('The paid date cannot be in the future.');
  const contentType=str(p.contentType,100);if(!['image/jpeg','image/png','application/pdf'].includes(contentType))fail('Upload a JPEG or PNG photo, or a PDF.');
  if(!Number.isSafeInteger(p.bytes)||p.bytes<=0||p.bytes>8*1024*1024)fail('Receipt files must be 8 MB or smaller.');
  if(p.orderId&&!event.orders?.some(x=>x.id===p.orderId))fail('Supplier order not found.');
  event.receiptFiles.push({id:p.id,objectPath:p.objectPath,filename:str(p.filename||'',200)||'receipt',contentType,bytes:p.bytes,amountCents:p.amountCents,supplier,paidOn:p.paidOn,note:str(p.note||'',500),orderId:p.orderId||null,by:actor,at:now});
 }else if(action==='receipt-file-remove'){
  needEvent();const x=(event.receiptFiles||[]).find(x=>x.id===p.id);if(!x)fail('Receipt not found.');event.receiptFiles=event.receiptFiles.filter(y=>y!==x);
 }else if(action==='payment'){needEvent();recordPayment(event,p,actor,now);
 }else if(action==='inventory'){
  const item=p.id?s.inventory.find(x=>x.id===p.id):null;if(p.id&&!item)fail('Inventory item not found.');
  const kind=item?.kind||p.kind;if(!['consumable','equipment'].includes(kind))fail('Choose inventory type.');
  const name=str(p.name,120);if(!name)fail('Name is required.');const unit=item?.unit||str(p.unit,30);if(!unit)fail('Unit is required.');
  const quantity=p.quantity===null?null:num(p.quantity,0,100000);if(kind==='equipment'&&quantity!==null&&quantity!==0&&quantity!==1)fail('Track each machine or device separately (quantity 0 or 1).');
  const condition=str(p.condition,30);if(!['ready','cleaning','charging','repair'].includes(condition))fail('Invalid condition.');
  if(item&&s.reservations.some(r=>r.itemId===item.id&&r.status==='dispatched'))fail('Check dispatched stock back in before adjusting it.');
  const committed=s.reservations.filter(r=>r.itemId===item?.id&&r.status==='reserved');if(committed.length&&(quantity===null||condition!=='ready'||(kind==='consumable'&&quantity<committed.reduce((n,r)=>n+r.quantity,0))||(kind==='equipment'&&quantity<1)))fail('This adjustment conflicts with reservations. Release them first.');
  if(kind==='equipment'&&s.inventory.some(x=>x.id!==item?.id&&x.kind==='equipment'&&x.name.toLowerCase()===name.toLowerCase()))fail('This equipment asset label already exists.');
  const stockValueCents=p.stockValueCents!==undefined?money(p.stockValueCents):quantity===0?0:item&&quantity===item.quantity?item.stockValueCents??null:null;if(quantity===0&&stockValueCents)fail('Zero stock must have zero value.');
  const row={id:item?.id||randomUUID(),name,kind,unit,quantity,stockValueCents,condition,note:str(p.note||'',500),countedAt:quantity===null?null:now};if(item)s.inventory[s.inventory.indexOf(item)]=row;else s.inventory.push(row);
 }else if(action==='staff'){
  const row=p.id?s.staff.find(x=>x.id===p.id):null;if(p.id&&!row)fail('Staff member not found.');const name=str(p.name,120);if(!name)fail('Staff name required.');const value={id:row?.id||randomUUID(),name,role:str(p.role,120),rateCents:money(p.rateCents),active:p.active!==false,email:str(p.email??row?.email??'',200).toLowerCase(),crewAccess:p.crewAccess===true,internal:p.internal===true};if(value.email&&!/^[^\s@]+@barsys\.com$/.test(value.email))fail('Use a Barsys Google Workspace email.');if(value.crewAccess&&!value.email)fail('Enter the staff email before enabling access.');if(value.email&&s.staff.some(x=>x.id!==row?.id&&x.email===value.email))fail('This email is already assigned to a staff member.');if(value.rateCents===null)fail('Staff rate required.');if(row)s.staff[s.staff.indexOf(row)]=value;else s.staff.push(value);
 }else if(action==='event'){
  needEvent();if(event.acceptedProposalRevision&&p.revenueCents!==event.revenueCents)fail('Revenue comes from an accepted proposal. Accept a revised proposal to change it.');event.owner=str(p.owner,120);event.due=p.due?stamp(p.due):'';event.notes=str(p.notes,2000);event.revenueCents=money(p.revenueCents);event.targetMargin=num(p.targetMargin,0,100);event.leftoverCents=money(p.leftoverCents);event.stockUsedCents=money(p.stockUsedCents);
  if(!Array.isArray(p.expenses)||p.expenses.length!==expenseCategories.length)fail('Complete the expense categories.');event.expenses=p.expenses.map((x,i)=>({name:expenseCategories[i],plannedCents:money(x.plannedCents),actualCents:money(x.actualCents),note:str(x.note||'',500)}));
  if(!event.inventoryCosting&&event.leftoverCents!==null&&(event.expenses[0].actualCents===null||event.leftoverCents>event.expenses[0].actualCents+(event.stockUsedCents??0)))fail('Leftover credit cannot exceed confirmed ingredient/spirits spend. Enter existing stock value separately.');
  event.staffingConfirmed=p.staffingConfirmed===true;event.actualHoursConfirmed=p.actualHoursConfirmed===true;
 }else if(action==='order'){
  needEvent();event.orders??=[];const old=event.orders.find(x=>x.id===p.id);if(p.id&&!old)fail('Order not found.');
  if(!['draft','requested','confirmed','received','cancelled'].includes(p.status))fail('Invalid supplier status.');
  const row={id:old?.id||randomUUID(),supplier:str(p.supplier,200),reference:str(p.reference||'',200),status:p.status,amountCents:money(p.amountCents),notes:str(p.notes||'',2000),updatedAt:now,by:actor};if(!row.supplier)fail('Supplier required.');if(old)event.orders[event.orders.indexOf(old)]=row;else event.orders.push(row);
 }else if(action==='assign'){
  needEvent();const staff=s.staff.find(x=>x.id===p.staffId);if(!staff||(!staff.active&&!p.id))fail('Select active staff.');const start=stamp(p.start),end=stamp(p.end);if(start>=end)fail('End must follow start.');const slot={id:p.id||randomUUID(),staffId:staff.id,name:staff.name,role:str(p.role,120),start,end,plannedHours:num(p.plannedHours,0,500),actualHours:p.actualHours===null?null:num(p.actualHours,0,500),rateCents:staff.internal?0:staff.rateCents,internal:!!staff.internal};
  const old=event.staffing.find(x=>x.id===p.id);if(p.id&&!old)fail('Assignment not found.');if(old)slot.rateCents=old.rateCents;
  for(const e of Object.values(s.events))for(const x of e.staffing)if(e.stage<8&&x.id!==slot.id&&x.staffId===staff.id&&overlap(x,slot))fail('Staff member already assigned during this time.');
  if(old)event.staffing[event.staffing.indexOf(old)]=slot;else event.staffing.push(slot);event.actualHoursConfirmed=false;
 }else if(action==='unassign'){
  needEvent();const x=event.staffing.find(x=>x.id===p.id);if(!x)fail('Assignment not found.');if(x.actualHours!==null)fail('Recorded actual hours must not be silently removed.');event.staffing=event.staffing.filter(x=>x.id!==p.id);event.staffingConfirmed=false;
 }else if(action==='reserve'){
  needEvent();const item=s.inventory.find(x=>x.id===p.itemId);if(!item||item.quantity===null)fail('Count this stock before reserving.');if(item.condition!=='ready')fail('Equipment is not ready.');const quantity=num(p.quantity,0.001,100000),start=stamp(p.start),end=stamp(p.end);if(start>=end)fail('End must follow start.');if(kindEquipment(item)&&quantity!==1)fail('Reserve one individually tracked asset.');
  const taken=s.reservations.filter(r=>r.itemId===item.id&&(r.status==='reserved'||r.status==='dispatched'));
  if(item.kind==='consumable'){if(quantity>availability(s,item))fail('Not enough unreserved stock.');}
  else if(item.quantity<1||taken.some(r=>r.status==='dispatched'||overlap(r,{start,end})))fail('Equipment already reserved or awaiting return.');
  s.reservations.push({id:randomUUID(),eventId:p.eventId,itemId:item.id,quantity,start,end,status:'reserved',returned:null,lost:null,note:'',by:actor});
 }else if(['dispatch','release','return'].includes(action)){
  needEvent();const r=s.reservations.find(x=>x.id===p.id&&x.eventId===p.eventId),item=s.inventory.find(x=>x.id===r?.itemId);if(!r||!item)fail('Reservation not found.');
  if(action==='release'){if(r.status!=='reserved')fail('Only reserved items can be released.');r.status='released';}
  if(action==='dispatch'){if(r.status!=='reserved'||item.condition!=='ready'||item.quantity===null||item.quantity<r.quantity)fail('Stock cannot be dispatched.');r.issuedCostCents=item.stockValueCents==null?null:Math.round(item.stockValueCents*r.quantity/item.quantity);if(item.stockValueCents!=null)item.stockValueCents-=r.issuedCostCents;item.quantity=Math.round((item.quantity-r.quantity)*1000)/1000;if(item.kind==='consumable'&&r.issuedCostCents!==null)event.inventoryCosting=true;r.status='dispatched';r.dispatchedAt=now;}
  if(action==='return'){if(r.status!=='dispatched')fail('This load is not awaiting return.');const returned=num(p.returned,0,r.quantity),lost=num(p.lost,0,r.quantity);if(returned+lost>r.quantity)fail('Returns exceed dispatched quantity.');if(item.kind==='equipment'&&(!Number.isInteger(returned)||!Number.isInteger(lost)))fail('Equipment returns must be whole assets.');if(item.kind==='equipment'&&returned+lost!==r.quantity)fail('Account for every asset as returned or lost.');const note=str(p.note||'',500);if(lost&&!note)fail('Record the loss or damage details.');const condition=p.condition;if(!['ready','cleaning','charging','repair'].includes(condition))fail('Set return condition.');r.returnedCostCents=r.issuedCostCents==null?null:Math.round(r.issuedCostCents*returned/r.quantity);item.stockValueCents=item.quantity===0?r.returnedCostCents:item.stockValueCents==null||r.returnedCostCents==null?null:item.stockValueCents+r.returnedCostCents;item.quantity=Math.round((item.quantity+returned)*1000)/1000;item.condition=condition;r.returned=returned;r.lost=lost;r.consumed=r.quantity-returned-lost;r.note=note;r.status='returned';r.returnedAt=now;r.receivedBy=actor;}
 }else if(action==='task'){
  needEvent();const stage=p.stage,index=p.index;if(!Number.isInteger(stage)||!checklist[stage]||!Number.isInteger(index)||!checklist[stage][index])fail('Task not found.');event.tasks[stage][index]={done:p.done===true,by:actor,at:now};if(!p.done&&stage<event.stage)event.stage=stage;
 }else if(action==='advance'){
  needEvent();if(!event.owner)fail('Assign an event owner.');if(!event.tasks[event.stage].every(t=>t.done))fail('Finish this stage’s checklist first.');
  const loads=s.reservations.filter(r=>r.eventId===p.eventId);
  if(event.agreementNeedsReview)fail('Event scope changed. Accept a revised proposal before advancing.');
  if(event.preparationNeedsReview)fail('Preparation changed. Review and confirm the saved menu and quantities before advancing.');
  if(event.stage===0&&event.revenueCents===null)fail('Enter agreed revenue before confirming the event.');
  if(event.stage===1&&!finances(event).plannedComplete)fail('Review staffing and fill each planned cost (use zero only when confirmed).');
  if(event.stage===3&&(!loads.length||loads.some(r=>r.status==='reserved')))fail('Record and dispatch the event load before leaving the office.');
  if(event.stage>=6&&loads.some(r=>['reserved','dispatched'].includes(r.status)))fail('Receive or release every load before office return is complete.');
  if(event.stage===7&&!finances(event,s,p.eventId).actualComplete)fail('Confirm all expenses, staff hours and leftover value before closeout.');if(event.stage===7&&event.revenueCents===null)fail('Confirm event revenue.');if(event.stage===7&&paymentSummary(event).balanceCents!==0)fail('Settle the client balance before financial closeout. Record received payments or resolve overpayments in Client payments.');event.stage++;
 }else if(action==='reopen'){
  if(!event||event.stage!==8)fail('Only closed events can be reopened.');event.stage=7;event.tasks[7]=checklist[7].map(()=>({done:false,by:null,at:null}));
 }else fail('Unknown operation.');
 if(s.inventory.length>2000||s.staff.length>500||s.reservations.length>20000)fail('Workspace capacity reached; contact support before adding more records.');
 s.version++;s.audit.push({at:now,actor,action,eventId:p.eventId||null,detail:JSON.stringify(p)});return s;
}
const kindEquipment=i=>i.kind==='equipment';
