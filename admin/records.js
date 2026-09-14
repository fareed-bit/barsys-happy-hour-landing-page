const $=id=>document.getElementById(id);let next=null;
async function api(path,body,method='PATCH'){const r=await fetch('/api/admin/'+path,{method:body?method:'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
function field(form,label,type,value){const l=document.createElement('label'),input=document.createElement('input');l.textContent=label;input.type=type;if(type==='checkbox')input.checked=value;else input.value=value; l.append(input);form.append(l);return input;}
function row(item){const box=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${item.status} · ${item.id} · ${item.reviewAt||'No review date'}`;box.append(summary);const p=document.createElement('p');p.textContent=item.reason;box.append(p);const form=document.createElement('form');const hold=field(form,'Keep on hold','checkbox',item.hold),reason=field(form,'Hold reason (avoid sensitive details)','text',item.holdReason);reason.maxLength=500;const closed=field(form,'Confirmed financial closeout date','date',item.closedOn),tax=field(form,'Relevant tax filing or due date, whichever is later','date',item.taxDate);if(!item.core){closed.parentElement.hidden=true;tax.parentElement.hidden=true;}const button=document.createElement('button');button.textContent='Save review';form.append(button);const result=document.createElement('p');result.setAttribute('role','status');form.append(result);form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{await api(`retention/${item.kind}/${encodeURIComponent(item.id)}`,{version:item.version,hold:hold.checked,holdReason:reason.value,closedOn:closed.value,taxDate:tax.value});item.version++;result.textContent='Review saved. No records deleted. Refresh to recalculate the displayed status.';}catch(err){result.textContent=err.message;}finally{button.disabled=false;}};box.append(form);disposalControls(box,item);retirementControls(box,item);$('records').append(box);}
async function load(more=false){$('more').disabled=true;try{const d=await api(`retention?kind=${$('kind').value}&offset=${more?next:0}`);if(!more)$('records').replaceChildren();d.items.forEach(row);next=d.nextOffset;$('more').hidden=next===null;$('message').textContent=d.items.length?'Review a record before removal. Holds and event connections prevent automated disposal.':'No records on this page.';}catch(e){$('message').textContent=e.message;}finally{$('more').disabled=false;}}
async function health(){try{const d=await api('system-health');$('health').textContent=`Database reachable. Email queue: ${d.email.attention?'needs attention':'no backlog or delivery errors detected'}. Pending: ${d.email.counts.pending||0}; failed: ${d.email.counts.failed||0}; uncertain: ${d.email.counts.unknown||0}. Checked ${new Date(d.checkedAt).toLocaleString()}. Worker heartbeat: ${d.worker.stale?'missing or older than 15 minutes':'recent'}. External monitoring must run independently.`;}catch(e){$('health').textContent='Health check unavailable: '+e.message;}}
$('kind').onchange=()=>load();$('more').onclick=()=>load(true);$('refresh').onclick=()=>{load();health();deliveries();};load();health();deliveries();

function disposalControls(box,item){
 if(item.core)return;
 const info=document.createElement('p');info.textContent=item.removalBlock||(item.kind==='mail'?'Remove only the dashboard copy. Gmail stays unchanged; a minimal identifier prevents reimport. Event links are rechecked when you submit. This cannot be undone here.':'Eligible for owner-reviewed removal from the active inquiry database. This cannot be undone here.');box.append(info);if(item.removalBlock)return;
 const form=document.createElement('form');const copies=field(form,'I reviewed exported files, sent emails, backups and required records','checkbox',false);
 const confirmation=field(form,`Type REMOVE ${item.id} to confirm`,'text','');confirmation.autocomplete='off';
 const button=document.createElement('button');button.textContent=item.kind==='mail'?'Remove expired email copy':'Remove expired inquiry';form.append(button);const status=document.createElement('p');status.setAttribute('role','status');form.append(status);
 form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{const d=await api(`retention/${item.kind}/${encodeURIComponent(item.id)}/remove`,{version:item.recordVersion,reviewVersion:item.version,confirm:confirmation.value,reviewedCopies:copies.checked},'POST');const summary=box.querySelector('summary');summary.textContent='Removed · '+item.id;status.textContent=d.notice;box.replaceChildren(summary,status);}catch(err){status.textContent=err.message;button.disabled=false;}};box.append(form);
}

async function deliveries(){
 try{
  const data=await api('notifications');$('deliveries').replaceChildren();
  $('delivery-status').textContent=`Showing up to 100 deliveries, unresolved first. ${data.items.length} shown.`;
  for(const item of data.items){
   const box=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent=`${item.status} · ${item.kind} · ${item.attempts} attempt(s)`;box.append(summary);
   const detail=document.createElement('p');detail.textContent=`Inquiry ${item.inquiry_id}. Job ${item.id}. ${item.result||'No result yet.'}`;box.append(detail);
   const guidance=document.createElement('p');guidance.textContent=['unknown','sending'].includes(item.status)?'Check Gmail Sent for this inquiry before any manual message. Do not assume delivery failed.':item.status==='failed'?'Investigate the sender error and confirm no matching message in Sent. Escalate for a reviewed recovery; do not repeatedly submit the inquiry.':item.status==='accepted'?'Accepted by Gmail; this is not proof the recipient opened it.':'Queued for the scheduled worker.';box.append(guidance);
   $('deliveries').append(box);
  }
 }catch(error){$('delivery-status').textContent='Delivery status unavailable: '+error.message;}
}

function retirementControls(box,item){
 if(!item.core)return;
 const info=document.createElement('p');info.textContent=item.retirementBlock||'Eligible for retirement after seven years. Event-linked personal details will be removed; aggregate financial values and receipt fingerprints remain. Shared inventory and staff records are preserved.';box.append(info);
 if(item.retirementBlock)return;
 const form=document.createElement('form'),copies=field(form,'I reviewed outside copies and required financial documents','checkbox',false),obligations=field(form,'No remaining preservation obligation applies to these event details','checkbox',false),confirmation=field(form,`Type RETIRE ${item.id} to confirm`,'text','');confirmation.autocomplete='off';
 const button=document.createElement('button');button.textContent='Retire eligible event';form.append(button);const status=document.createElement('p');status.setAttribute('role','status');form.append(status);
 form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{const d=await api(`retention/event/${encodeURIComponent(item.id)}/retire`,{version:item.recordVersion,reviewVersion:item.version,confirm:confirmation.value,reviewedCopies:copies.checked,obligationsCleared:obligations.checked},'POST');const summary=box.querySelector('summary');summary.textContent='Retired · '+item.id;status.textContent=d.notice;box.replaceChildren(summary,status);}catch(err){status.textContent=err.message;button.disabled=false;}};box.append(form);
}
