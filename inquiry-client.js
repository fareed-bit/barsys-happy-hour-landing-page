/* Sends the planner state to the event server in connected modes (LOCAL_TEST, STAGING_TEST, LIVE).
   Standalone previews (no runtime, connect-src 'none') never send anything. */
(()=>{'use strict';
 const runtime=window.BARSYS_RUNTIME;
 const connected=!!runtime&&/^https?:$/.test(location.protocol)&&!document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content.includes("connect-src 'none'");
 let status=null,key,signature,receipt,pending=null;
 if(connected)fetch('/api/status').then(r=>r.ok?r.json():null).then(s=>{status=s;}).catch(()=>{});
 const payload=()=>({schemaVersion:1,...window.BarsysPlanner.getState()});
 async function send(){
  if(!connected)throw new Error('This preview does not send inquiries.');
  if(pending)return pending;
  const data=payload(),next=JSON.stringify(data);
  if(signature!==next){signature=next;key=crypto.randomUUID();receipt=null;}
  if(receipt)return receipt;
  if(status&&status.enabled===false)throw new Error('Inquiries are paused right now. Email '+(window.BARSYS?.email||'fareed@barsys.com')+'.');
  pending=(async()=>{
   try{
    const response=await fetch('/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){const fields=Object.entries(result.fields||{}).map(([k,v])=>`${k.replace('details.','')}: ${v}`).join(' ');throw new Error(`${result.error||'Not sent.'} ${fields}`.trim());}
    receipt=result;return receipt;
   }catch(error){
    if(error.name==='TimeoutError')throw new Error('Not confirmed. Try again; a duplicate will not be created.');
    if(error instanceof TypeError)throw new Error('Not sent. Check your connection and try again.');
    throw error;
   }finally{pending=null;}
  })();
  return pending;
 }
 window.BarsysInquiry=Object.freeze({connected,mode:runtime?.mode||null,send,getReceipt:()=>receipt});
})();
