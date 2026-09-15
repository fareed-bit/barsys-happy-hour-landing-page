/* Event-planning safeguards derived from the supplied example, with
   client-specific commercial terms deliberately left unconfigured. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s), C=window.BARSYS;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const maps={venueApproval:{'not-checked':'Not checked yet',pending:'Approval pending',confirmed:'Organizer reports approval confirmed',na:'Not applicable / discuss'},coi:{unsure:'Not sure yet',required:'COI requested',notRequired:'Not required by organizer'},glassware:{discuss:'Help me choose / scope to confirm',barsys:'Barsys-supplied glassware requested',venue:'Venue-supplied glassware / suitability to confirm'},photoPreference:{discuss:'Discuss permissions separately',noGuests:'No identifiable guest images for publicity',ask:'Request separate written approval before publication'}};
 const label=(key,v)=>maps[key]?.[v]||'To be confirmed';
 const policyLink=(key,text)=>`<a href="#${key==='terms'?'event-terms':key==='cancellations'?'cancellations':key==='cookies'?'cookies-storage':key==='references'?'brand-references':key==='accessibility'?'accessibility-help':'privacy-policy'}" data-policy="${key}">${text}</a>`;
 function select(s,prefix,key,title,options,hint=''){
   return `<div class="field"><label for="${prefix}-${key}">${title} <small>Optional</small></label><select id="${prefix}-${key}" ${prefix==='detail'?'data-field':'data-quick-field'}="${key}">${Object.entries(options).map(([v,t])=>`<option value="${v}" ${s.details[key]===v?'selected':''}>${esc(t)}</option>`).join('')}</select>${hint?`<span class="field-hint">${hint}</span>`:''}</div>`;
 }
 function eventFields(s,prefix='detail'){
   return `<details class="readiness-options"><summary>Venue approval &amp; insurance paperwork <span>Optional</span></summary><div class="field-grid readiness-field-grid">${select(s,prefix,'venueApproval','Venue / building permission',{'not-checked':'Not checked yet',pending:'Approval pending',confirmed:'Confirmed by organizer',na:'Not applicable / discuss'},'Venue consent is separate from any alcohol-service authorization. The event team confirms the arrangements.')}${select(s,prefix,'coi','Does your building require a COI?',{unsure:'Not sure yet',required:'Yes / please coordinate',notRequired:'No'},'A certificate-of-insurance request does not confirm coverage or additional-insured status.')}</div><p class="readiness-small">Full access instructions, facilities contacts and exact insurance naming can follow after the initial conversation. ${policyLink('terms','How venue coordination works')}</p></details>`;
 }
 function glasswareMarkup(s,prefix='detail'){
   const inc=(C.quoteRules.glassware?.includedIn||[]).includes(s.tier);
   return `<section class="scope-panel"><div><p class="eyebrow">SERVICE SCOPE / NOT A HIDDEN EXTRA</p><h4>Glassware &amp; getting there.</h4></div><div class="field-grid">${select(s,prefix,'glassware','Glassware',maps.glassware,inc?'Glassware is included under the approved package configuration.':'Package inclusion, styles and any rental cost will be confirmed. No sample-event charge is applied.')}
   <div class="scope-delivery"><strong>Delivery &amp; venue access</strong><p>Delivery, load-in and access costs are confirmed for your venue. This is required event scope, not an optional add-on you can remove.</p><span>To be confirmed / outside this subtotal</span></div></div><p class="readiness-small">Venue-supplied glassware still needs a suitability check. Requested service time is planned in advance; any event-day extension needs separate authorization and availability.</p></section>`;
 }
 function serviceMarkup(s){
   return `<div class="service-disclosures"><div><strong>${s.beverage==='zero'?'Zero-proof requests':'Responsible service'}</strong><p>${s.beverage==='zero'?'The event team will confirm alcohol-free menus, ingredients and service arrangements.':'Alcohol service includes 21+ ID checks. Staff may refuse or stop service for underage, intoxicated or unsafe guests. Open-bar service is subject to these safeguards.'}</p></div><div><strong>Shared service environment</strong><p>Menus can contain allergens and cross-contact is possible. The absence of allergens cannot be guaranteed. Share event-level needs; do not enter named guests\' medical information.</p></div><p class="readiness-small">${policyLink('terms','Read the service planning guide')}</p></div>`;
 }
 function consentLine(s){
   return `<div class="permission-options"><label class="permission-check"><input type="checkbox" data-memory-choice="marketingInterest" ${s.details.marketingInterest==='yes'?'checked':''}/><span>I'd like to hear about future Barsys events and offers. <small>Optional.</small></span></label></div><p class="review-info">An inquiry does not hold a date or take payment. ${policyLink('terms','Event terms')} &middot; ${policyLink('cancellations','Cancellations')} &middot; ${policyLink('privacy','Privacy')}</p>`;
 }
 const finalNotice=consentLine;
 function timeline(){return `<ol class="booking-timeline"><li class="current"><span>01</span><div><strong>Local plan created</strong><p>On this device only. No inquiry has been sent.</p></div></li><li><span>02</span><div><strong>Written proposal</strong><p>Availability, full price and scope need team confirmation.</p></div></li><li><span>03</span><div><strong>Agreement &amp; deposit</strong><p>Not started. Signed agreement and required deposit before a date is held.</p></div></li><li><span>04</span><div><strong>Menus &amp; logistics</strong><p>Guest count, menu sign-off, COI and access deadlines are set in the agreement.</p></div></li></ol>`;}
 function summaryRows(s){return [['Venue permission',label('venueApproval',s.details.venueApproval),0],['Insurance paperwork',label('coi',s.details.coi),0],['Glassware',label('glassware',s.details.glassware),3]];}
 function exportMeta(s){return {version:'3.8-preview',sourceBasis:'Example event-service agreement, generalized planning principles only',booking:{status:'LOCAL_PLAN_ONLY',inquirySent:false,agreementSigned:false,depositReceived:false,dateHeld:false,writtenConfirmationReceived:false},venueApproval:s.details.venueApproval,coiRequest:s.details.coi,glasswarePreference:s.details.glassware,contractingEntity:s.details.contractEntity||null,marketing:{preference:s.details.marketingInterest==='yes',subscribed:false,recordedLocallyOnly:true},publicity:{preference:s.details.photoPreference,permissionGranted:false,writtenApprovalRequired:true},deadlines:{menuSignOff:null,headcount:null,venueAccess:null,coi:null,basis:'To be set in the signed event agreement'},terms:{approved:false,eventSpecific:true,depositPercent:null,cancellationSchedule:null,overtimeRate:null},allergenNotice:'Shared service environment; absence of allergens cannot be guaranteed.'};}
 function summaryMarkup(data){const c=data.contact||{},r=data.readiness;return `<h3>Before this becomes a booking</h3><dl class="approval-grid">${[['Venue permission',label('venueApproval',c.venueApproval)],['Insurance paperwork',label('coi',c.coi)],['Glassware',label('glassware',c.glassware)],['Marketing preference',c.marketingInterest==='yes'?'Interested / not subscribed':'No opt-in recorded'],['Publicity preference',label('photoPreference',c.photoPreference)+' / not publication permission']].map(([k,v])=>`<div class="approval-item"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>Service includes 21+ ID checks. Drinks are prepared in a shared environment, so allergens cannot be ruled out. Deposit, cancellation and sign-off terms are set in the event agreement. This summary grants no publicity rights.</p>`;}
 window.BarsysReadiness=Object.freeze({eventFields,glasswareMarkup,serviceMarkup,finalNotice,consentLine,timeline,summaryRows,exportMeta,summaryMarkup,label,policyLink});
 // Modal policies exist in the document before the shared video managers initialize.
 const hashes={privacy:'privacy-policy',terms:'event-terms',cancellations:'cancellations',cookies:'cookies-storage',accessibility:'accessibility-help',references:'brand-references'};
 let policyFocus=null,previousHash='';
 function openPolicy(key){const p=window.BARSYS_POLICIES[key];if(!p)return;const d=$('#policy-dialog');if(!d.open){policyFocus=document.activeElement;previousHash=location.hash;}
   $('#policy-title').textContent=p.title;$('#policy-tag').textContent=p.tag;$('#policy-body').innerHTML=p.body;
   $('#policy-dialog').dataset.policy=key;
   if(!d.open)d.showModal();$('#policy-title').focus({preventScroll:true});
   try{history.replaceState(null,'','#'+hashes[key]);}catch(_){}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-policy],#policy-close');if(b){e.preventDefault();if(b.id==='policy-close')$('#policy-dialog').close();else openPolicy(b.dataset.policy);}});
 document.addEventListener('change',e=>{const f=e.target;if(f.hasAttribute('data-memory-choice'))window.BarsysPlanner?.setDetails({[f.dataset.memoryChoice]:f.checked?'yes':'no'});});
 $('#policy-dialog').addEventListener('close',()=>{try{history.replaceState(null,'',previousHash||location.pathname+location.search);}catch(_){}if(policyFocus?.isConnected)policyFocus.focus({preventScroll:true});});
 $('#policy-dialog').addEventListener('click',e=>{const d=e.currentTarget,r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});
 const hashPolicy=()=>{const key=Object.keys(hashes).find(k=>location.hash==='#'+hashes[k]);if(key)openPolicy(key);};
 window.addEventListener('hashchange',hashPolicy);setTimeout(hashPolicy,0);
 document.addEventListener('barsys:privacy',()=>{
   const A=window.BarsysPlanner;if(!A)return;
   if(window.BarsysPrivacy.can('rememberSelections'))window.BarsysPrivacy.saveDraft(A.getState());
 });
 // Error references expose the same message to assistive technology and remain valid across rerenders.
 // Keep focus within the top planning/privacy dialog, including in browser test contexts.
 document.addEventListener('keydown',e=>{
   if(e.key!=='Tab')return;
   const d=document.activeElement?.closest('dialog[open]');
   if(!d||!d.matches('#policy-dialog,#privacy-dialog'))return;
   const items=[...d.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
   const first=items[0],last=items.at(-1);if(!first)return;
   if(e.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 const errorLinker=new MutationObserver(()=>{
   for(const [host,error] of [['#step-content','form-error'],['#quick-content','quick-error']]){
     document.querySelectorAll(host+' [aria-invalid="true"]').forEach(el=>{
       el.setAttribute('aria-describedby',[...(el.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).filter(x=>x!==error),error].join(' '));
     });
   }
 });
 for(const sel of ['#step-content','#quick-content'])errorLinker.observe($(sel),{subtree:true,attributes:true,attributeFilter:['aria-invalid']});
})();
