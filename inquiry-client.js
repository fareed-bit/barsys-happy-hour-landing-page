/* Explicit save after creating a preview; disabled in standalone and legacy preview server. */
(()=>{'use strict';
 if(!/^https?:$/.test(location.protocol)||document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content.includes("connect-src 'none'"))return;
 let settings,key,signature,receipt,pending=false;
 const A=window.BarsysPlanner;
 const payload=()=>({schemaVersion:1,...A.getState()});
 async function save(button,output){
  if(pending)return;const data=payload(),next=JSON.stringify(data);
  if(signature!==next){signature=next;key=crypto.randomUUID();receipt=null;}
  if(receipt){output.textContent=`Already saved: ${receipt.id}. No booking or payment.`;return;}
  pending=true;button.disabled=true;output.textContent='Saving…';
  try{const response=await fetch('/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok){const fields=Object.entries(result.fields||{}).map(([k,v])=>`${k.replace('details.','')}: ${v}`).join(' ');throw new Error(`${result.error} ${fields}`);}
   receipt=result;output.textContent=`${result.mode==='STAGING_TEST'?'Staging test record saved':result.mode==='LOCAL_TEST'?'Local test record saved':'Inquiry received'}: ${result.id}. No date held, booking, payment or subscription.`;
  }catch(error){output.textContent=error.name==='TimeoutError'?'Save not confirmed. Retry to check safely without creating a duplicate.':error.message||'Save not confirmed. Please retry.';}
  finally{pending=false;button.disabled=false;}
 }
 function attach(){for(const host of document.querySelectorAll('.success-actions')){if(host.parentElement.querySelector('[data-inquiry-save]'))continue;const section=document.createElement('section');section.dataset.inquirySave='';section.className='inquiry-submit-panel';const heading=document.createElement('h4');heading.textContent=settings.mode==='LIVE'?'Ready for the Barsys team?':'Private preview submission';const p=document.createElement('p');p.textContent=settings.mode==='STAGING_TEST'?'Save this synthetic plan to the private staging database so the submission flow can be reviewed. Nothing is sent to the event team.':settings.mode==='LOCAL_TEST'?'Save this synthetic plan to the local event database. It will be visible in the local dashboard, but nothing is sent to the event team.':'Send this plan and contact details to the Barsys event team for review. This is an inquiry, not a reservation.';const b=document.createElement('button');b.type='button';b.className='button';b.textContent=settings.mode==='LIVE'?'Send inquiry':'Save test inquiry';const output=document.createElement('p');output.setAttribute('role','status');output.style.overflowWrap='anywhere';b.addEventListener('click',()=>save(b,output));section.append(heading,p,b,output);host.before(section);}}
 fetch('/api/status').then(r=>r.ok?r.json():null).then(s=>{if(!s?.enabled)return;settings=s;attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});}).catch(()=>{});
})();
