import {inquiryNotifications} from './notifications.mjs';
// transport must return accepted, retry, failed or unknown. Ambiguous sends never auto-retry.
export async function runNotifications({store,transport,now=()=>Date.now(),limit=20}){
 const summary={accepted:0,retry:0,failed:0,unknown:0};
 for(let i=0;i<limit;i++){
  const job=await store.claimNotification(now());if(!job)break;
  let outcome;
  try{const doc=await store.get(job.inquiry_id);outcome=doc?await transport(inquiryNotifications(doc)[job.kind],job.id):{status:'failed'};}catch{outcome={status:'unknown'};}
  if(!['accepted','retry','failed','unknown'].includes(outcome?.status))outcome={status:'unknown'};
  if(outcome.status==='retry'&&job.attempts>=5)outcome={status:'failed'};
  const status=outcome.status;summary[status]++;
  await store.finishNotification(job.id,status==='retry'?'pending':status,now()+Math.min(3600000,60000*2**job.attempts),status==='accepted'?'Gmail accepted':status==='retry'?'Retry scheduled':status==='unknown'?'Review Sent mail before retrying':'Delivery needs attention');
 }
 return summary;
}
