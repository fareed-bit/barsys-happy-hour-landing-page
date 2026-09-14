import {finances} from './operations.mjs';
import {receiptKey} from './receipt-key.mjs';
export function retirementBlock(doc,meta,ops,now=Date.now()){
 if(!doc||doc.disposedAt)return 'Record unavailable.';
 if(!meta?.version||meta.hold)return 'Save a review without a preservation hold first.';
 const e=ops.events?.[doc.id];
 if(!e||e.stage!==8)return 'Financial closeout must be complete.';
 for(const k of ['closedOn','taxDate'])if(!/^\d{4}-\d{2}-\d{2}$/.test(meta[k]||'')||!Number.isFinite(Date.parse(meta[k])))return 'Confirm closeout and relevant tax dates.';
 const base=[meta.closedOn,meta.taxDate].sort().at(-1),due=new Date(base);due.setUTCFullYear(due.getUTCFullYear()+7);
 if(+due>now)return 'The seven-year review period has not expired.';
 const f=finances(e,ops,doc.id);
 if(!f.actualComplete||f.payments.balanceCents!==0||f.profit===null)return 'Resolve financial completeness and payment balances first.';
 if(ops.reservations.some(r=>r.eventId===doc.id&&['reserved','dispatched'].includes(r.status)))return 'Resolve stock commitments first.';
 if(ops.receipts?.some(r=>r.eventId===doc.id&&r.paidCents!==r.costCents))return 'Resolve supplier payments first.';
 return null;
}
export function retireEventState(doc,ops,at){
 const state=structuredClone(ops),f=finances(state.events[doc.id],state,doc.id);
 // Preserve aggregate accounting values, not free-text event/client/staff details.
 const summary={retiredAt:at,revenueCents:state.events[doc.id].revenueCents,invoiceCents:f.payments.invoiceCents,collectedCents:f.payments.collectedCents,consumedCents:f.consumed,profitCents:f.profit};
 state.retiredReceiptKeys??=[];
 for(const r of state.receipts||[])if(r.eventId===doc.id)state.retiredReceiptKeys.push(receiptKey(r));
 state.retiredReceiptKeys=[...new Set(state.retiredReceiptKeys)];
 state.receipts=(state.receipts||[]).filter(r=>r.eventId!==doc.id);
 state.reservations=state.reservations.filter(r=>r.eventId!==doc.id);
 state.audit=state.audit.filter(r=>r.eventId!==doc.id);
 delete state.events[doc.id];state.version++;
 return {state,summary};
}
