import {receiptKey} from './receipt-key.mjs';
import {randomUUID} from 'node:crypto';
import {HttpError} from './model.mjs';
const fail=x=>{throw new HttpError(422,x);};
const cents=x=>{if(!Number.isSafeInteger(x)||x<0||x>100000000)fail('Enter an amount in whole cents.');return x;};
const text=(x,max=200)=>{if(typeof x!=='string'||!x.trim()||x.length>max)fail('A reference, name or supplier is missing.');return x.trim();};
export function receiveStock(s,p,event,actor,now){
 let item=s.inventory.find(x=>x.id===p.itemId);
 if(!item&&p.newItem){const t=p.newItem;if(!['consumable','equipment'].includes(t.kind))fail('Invalid item type.');const name=text(t.name,120),unit=text(t.unit,30);item=t.kind==='consumable'?s.inventory.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.unit===unit&&x.kind===t.kind):null;if(!item){if(!s.openingStockZero)fail('Set opening inventory before adding stock through receipts.');let label=name;if(t.kind==='equipment'){let n=1;while(s.inventory.some(x=>x.name.toLowerCase()===(name+' #'+String(n).padStart(3,'0')).toLowerCase()))n++;label+=' #'+String(n).padStart(3,'0');}item={id:randomUUID(),name:label,kind:t.kind,unit,quantity:0,stockValueCents:0,condition:'ready',note:'Created from purchase receipt',countedAt:now};s.inventory.push(item);}}
 if(!item)fail('Choose an inventory item first.');
 if(item.quantity===null)fail('Count existing stock before receiving more.');
 if(!Number.isFinite(p.quantity)||p.quantity<=0||p.quantity>100000||item.quantity+p.quantity>100000)fail('Check the received quantity.');
 if(item.kind==='equipment'&&(p.quantity!==1||item.quantity!==0||s.reservations.some(r=>r.itemId===item.id&&r.status==='dispatched')))fail('Receive one new individually labelled asset.');
 const costCents=cents(p.costCents),paidCents=cents(p.paidCents);if(paidCents>costCents)fail('Paid amount cannot exceed this receipt line cost.');
 const supplier=text(p.supplier),reference=text(p.reference);s.receipts??=[];
 if(s.retiredReceiptKeys?.includes(receiptKey({itemId:item.id,supplier,reference}))||s.receipts.some(x=>x.itemId===item.id&&x.supplier.toLowerCase()===supplier.toLowerCase()&&x.reference.toLowerCase()===reference.toLowerCase()))fail('This invoice line was already received. Use a distinct delivery reference for a genuine partial receipt.');
 if(p.orderId&&!event.orders?.some(x=>x.id===p.orderId))fail('Supplier order not found.');
 item.stockValueCents=item.quantity===0?costCents:item.stockValueCents==null?null:item.stockValueCents+costCents;
 item.quantity=Math.round((item.quantity+p.quantity)*1000)/1000;item.countedAt=now;
 const receipt={id:randomUUID(),eventId:p.eventId,itemId:item.id,orderId:p.orderId||null,supplier,reference,quantity:p.quantity,costCents,paidCents,at:now,by:actor};s.receipts.push(receipt);event.inventoryCosting=true;
}
export function recordPayment(event,p,actor,now){
 event.payments??=[];const amountCents=cents(p.amountCents);if(!amountCents)fail('Payment must be greater than zero.');
 if(!['deposit','payment','refund'].includes(p.kind))fail('Choose deposit, payment or refund.');
 const reference=text(p.reference);if(event.payments.some(x=>x.reference.toLowerCase()===reference.toLowerCase()))fail('This payment reference is already recorded.');
 const net=event.payments.reduce((n,x)=>n+(x.kind==='refund'?-1:1)*x.amountCents,0);if(p.kind==='refund'&&amountCents>net)fail('Refund exceeds recorded receipts.');
 if(!/^\d{4}-\d\d-\d\d$/.test(p.date)||(!Number.isFinite(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date))fail('Enter a payment date.');
 event.payments.push({id:randomUUID(),kind:p.kind,amountCents,reference,date:p.date,by:actor,at:now});
}
export function paymentSummary(e){const payments=e.payments||[],collectedCents=payments.reduce((n,p)=>n+(p.kind==='refund'?-1:1)*p.amountCents,0),invoiceCents=e.invoiceTotalCents??e.revenueCents;return {invoiceCents,collectedCents,balanceCents:invoiceCents===null?null:invoiceCents-collectedCents,status:invoiceCents===null?'Revenue unconfirmed':collectedCents>invoiceCents?'Overpaid':collectedCents===invoiceCents?'Paid':collectedCents>0?'Part paid':'Unpaid'};}
export function stockCosts(s,id){const loads=s.reservations.filter(r=>r.eventId===id&&['dispatched','returned'].includes(r.status)&&s.inventory.find(i=>i.id===r.itemId)?.kind==='consumable');const lostAssets=s.reservations.filter(r=>r.eventId===id&&r.status==='returned'&&r.lost>0&&s.inventory.find(i=>i.id===r.itemId)?.kind==='equipment');const receipts=(s.receipts||[]).filter(r=>r.eventId===id);return {equipmentLossCents:lostAssets.reduce((n,r)=>n+(r.issuedCostCents==null?0:Math.round(r.issuedCostCents*r.lost/r.quantity)),0),complete:lostAssets.every(r=>r.issuedCostCents!=null)&&loads.every(r=>r.issuedCostCents!=null&&r.status==='returned'&&r.returnedCostCents!=null),issuedCents:loads.reduce((n,r)=>n+(r.issuedCostCents??0),0),returnedCents:loads.reduce((n,r)=>n+(r.returnedCostCents??0),0),purchasePaidCents:receipts.reduce((n,r)=>n+r.paidCents,0),purchaseUnpaidCents:receipts.reduce((n,r)=>n+r.costCents-r.paidCents,0)};}
