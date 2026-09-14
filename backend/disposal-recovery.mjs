// Used only by the explicitly isolated restore tool, never by a public API.
export function validateDisposalLedger(value){
 if(!value||value.schema!==1||!Array.isArray(value.inquiries)||!Array.isArray(value.mail))throw Error('Invalid disposal ledger');
 for(const kind of ['inquiries','mail']){
  const seen=new Set();
  for(const row of value[kind]){
   if(!row||!/^[-a-zA-Z0-9_]{1,100}$/.test(row.id)||seen.has(row.id)||typeof row.removed_at!=='string'||!Number.isFinite(Date.parse(row.removed_at))||typeof row.actor!=='string'||!row.actor||row.actor.length>320)throw Error('Invalid disposal entry');
   seen.add(row.id);
  }
 }
 if(value.retired!==undefined){
  if(!Array.isArray(value.retired))throw Error('Invalid retirement ledger');
  const seen=new Set();for(const row of value.retired){
   if(!value.inquiries.some(r=>r.id===row.id)||seen.has(row.id)||!row.summary||!Number.isFinite(Date.parse(row.summary.retiredAt)))throw Error('Invalid retirement entry');
   const keys=['retiredAt','revenueCents','invoiceCents','collectedCents','consumedCents','profitCents'];
   if(Object.keys(row.summary).some(k=>!keys.includes(k))||keys.slice(1).some(k=>!Number.isSafeInteger(row.summary[k])))throw Error('Invalid retirement totals');
   seen.add(row.id);
  }
 }
 return value;
}
