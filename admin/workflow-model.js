// Pure presentation rules; no workflow state is changed by these suggestions.
export function workItems(events,state,template,now=new Date()){
 const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 return events.flatMap(d=>{
  const e=state.events[d.id]||template;if(e.stage>=8)return [];
  const loads=state.reservations.filter(r=>r.eventId===d.id&&r.status==='dispatched');
  const overdue=e.due&&Date.parse(e.due)<now.getTime();
  const date=d.payload.details.date;
  const reasons=[];
  if(loads.some(r=>Date.parse(r.end)<now.getTime())||(loads.length&&e.stage===6))reasons.push({priority:0,label:'Office return due',action:'Receive equipment & stock'});
  if(overdue)reasons.push({priority:1,label:'Deadline overdue',action:'Review overdue action'});
  if(date===today)reasons.push({priority:2,label:'Event today',action:'Open today’s event'});
  if(!e.owner||!e.staffingConfirmed)reasons.push({priority:3,label:!e.owner?'Owner needed':'Staffing needs review',action:!e.owner?'Assign event owner':'Open event plan'});
  if(e.stage===2)reasons.push({priority:4,label:'Purchasing to arrange',action:'Review supplier needs'});
  if(e.stage===7)reasons.push({priority:5,label:'Financial closeout',action:'Reconcile event costs'});
  if(!reasons.length)return [];
  reasons.sort((a,b)=>a.priority-b.priority);
  return [{id:d.id,...reasons[0],reasons:reasons.map(x=>x.label),due:e.due||'',eventDate:date||''}];
 }).sort((a,b)=>a.priority-b.priority||(a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id));
}
export const stageSections=[['finance'],['finance','staff','stock'],['orders','supplier'],['stock'],[],['staff','stock'],['stock'],['finance'],[]];
export function equipmentReceipt(action,quantity){
 if(!['ready','cleaning','charging','repair','missing'].includes(action))throw Error('Unknown return action');
 return {returned:action==='missing'?0:quantity,lost:action==='missing'?quantity:0,condition:action==='missing'?'repair':action};
}
export const flowSteps=['Confirm','Prepare','Purchase & pack','Run event','Return & close'];
export const flowStep=stage=>stage<2?stage:stage<4?2:stage<6?3:4;
export const flowSections=[['finance'],['planning','staff','stock','finance'],['planning','orders','supplier','stock'],['planning','staff'],['stock','staff','orders','finance']];
export function planningUpdate(original,values,equipment){
 const plan=structuredClone(original);
 plan.drinksPerGuest=values.drinksPerGuest;plan.bufferPercent=values.bufferPercent;plan.menuConfirmed=values.menuConfirmed;plan.machines=values.machines;
 for(const rule of equipment){
  const item=plan.equipment[rule.id];
  if(rule.minimum!==null){const minimum=rule.minimum/original.machines*plan.machines;item.quantity=rule.id==='machines'?plan.machines:Math.max(item.quantity??0,minimum);}
  if(plan.machines!==original.machines)item.packed=false;
 }
 return plan;
}
export function recordGaps(event,financials,loads){
 if(event.stage===8)return [];
 const gaps=[];
 if(event.preparationNeedsReview)gaps.push('Review and confirm the saved menu and quantities on the Prepare step (Menu, quantities & equipment card) before continuing.');
 if(!event.owner)gaps.push('Assign an event owner.');
 if([0,7].includes(event.stage)&&event.revenueCents===null)gaps.push('Enter the agreed revenue.');
 if(event.stage===1&&!financials?.plannedComplete)gaps.push('Review staffing and enter every planned cost in View cost breakdown.');
 if(event.stage===3&&(!loads.length||loads.some(x=>x.status==='reserved')))gaps.push('Record and dispatch the outgoing inventory load.');
 if(event.stage>=6&&loads.some(x=>['reserved','dispatched'].includes(x.status)))gaps.push('Receive dispatched loads or release unused reservations.');
 if(event.stage===7&&financials?.payments?.balanceCents!==0)gaps.push('Settle the client balance in Client payments before financial closeout.');
 if(event.stage===7&&!financials?.actualComplete)gaps.push('Confirm actual expenses, staff hours, office-stock value and reusable leftovers.');
 return gaps;
}
export function purchaseNeeds(rows,state,eventId,matcher=null){
 const groups=new Map(),unresolved=[];
 for(const row of rows){const exact=state.inventory.filter(x=>x.kind==='consumable'&&x.name.toLowerCase()===row.name.toLowerCase()&&x.unit===row.unit);const m=exact.length||!matcher?{matches:exact,factor:()=>1}:matcher(row,state);const matches=m.matches,factor=m.factor,ids=matches.map(x=>x.id),allocated=state.reservations.filter(r=>r.eventId===eventId&&ids.includes(r.itemId)&&['reserved','dispatched'].includes(r.status)).reduce((n,r)=>n+r.quantity*factor(matches.find(x=>x.id===r.itemId)),0),known=matches.length?matches.every(x=>x.quantity!==null):!!state.openingStockZero;
  if(!known&&allocated<row.amount){unresolved.push(row.name+' — stock count needed');continue;}
  const free=matches.reduce((n,x)=>n+(x.condition==='ready'?Math.max(0,(x.quantity??0)-state.reservations.filter(r=>r.itemId===x.id&&r.status==='reserved').reduce((n,r)=>n+r.quantity,0))*factor(x):0),0),amount=Math.max(0,row.amount-allocated-free);
  if(!amount)continue;const p=row.price;if(!p){unresolved.push(row.name+' — price or pack yield needed');continue;}
  const key=p.url?JSON.stringify([p.url,row.unit,p.packAmount,p.priceCents]):row.name.toLowerCase()+'|'+row.unit;
  const g=groups.get(key)||{product:p.product||p.supplier||row.name,unit:row.unit,amount:0,packAmount:p.packAmount,priceCents:p.priceCents,url:p.url||null,ingredients:[]};g.amount+=amount;g.ingredients.push(row.name);groups.set(key,g);
 }
 const purchases=[...groups.values()].map(x=>({...x,packs:Math.ceil(x.amount/x.packAmount-1e-9),purchaseCents:Math.ceil(x.amount/x.packAmount-1e-9)*x.priceCents}));return {purchases,unresolved,knownPurchaseCents:purchases.reduce((n,x)=>n+x.purchaseCents,0)};
}

export function closeoutLabel(financials){return financials?.payments?.balanceCents===0?'Financially closed':'Operations complete · client balance unresolved';}
