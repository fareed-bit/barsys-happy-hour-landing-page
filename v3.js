/* V3 experience + quick proposal. All selections use the existing planner.
   No request, payment, analytics SDK or personal-data persistence is performed.
   Public integration events contain only interface actions, never contact data. */
(() => {
  'use strict';
  const A = window.BarsysPlanner, C = window.BARSYS;
  const $ = (s,r=document) => r.querySelector(s), $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = n => `<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const dollars = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  const get = () => A.getState();
  const RT=window.BARSYS_RUNTIME, connected=!!RT, live=RT?.mode==='LIVE';
  const sendLabel=connected?(live?'Send inquiry':'Save test inquiry'):'Create proposal preview';
  let receipt=null;
  const motion = () => document.documentElement.dataset.motion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const emit = (action,info={}) => window.dispatchEvent(new CustomEvent('barsys:interaction',{detail:{action,...info}}));
  const TODAY = (()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);})();
  const occasions = [['team','Team happy hour'],['client','Client event'],['celebration','Company celebration'],['recruiting','Recruiting event'],['executive','Executive event'],['exploring','Just exploring'],['birthday','Birthday party'],['engagement','Engagement party'],['venue','Venue event'],['other','Another occasion']];
  let quickStep=0, route='quick', taste='signature', collection=null, dialogFocus=null, summaryFocus=null, imageTimer;
  const tasteCopy = {
    signature: {base:'VODKA & TEQUILA',notes:'Bright, citrus-forward crowd favorites. Think Cosmopolitan, Margarita, Madras and Tequila Twilight.'},
    spritz: {base:'THE SPARKLING COLLECTION',notes:'Light, bright and made for getting together. A golden-hour mood, even when the office is the venue.'},
    fluid: {base:'ZERO PROOF. FULL OF OCCASION.',notes:'An alcohol-free collection with its own place at the bar. Same occasion, without the alcohol.'}
  };
  const dateLabel = v => v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Date to be decided';
  const field = (key,label,{type='text',required=false,wide=false,placeholder='',hint='',autocomplete=''}={}) => {
    const value=get().details[key]||'';
    return `<div class="field ${wide?'field-full':''}"><label for="quick-${key}">${label}${required?'':' <small>(optional)</small>'}</label><input id="quick-${key}" name="${key}" data-quick-field="${key}" value="${esc(value)}" type="${type}" ${required?'required':''} ${type==='date'?`min="${TODAY}"`:type==='number'?'min="0" step="1"':''} ${autocomplete?`autocomplete="${autocomplete}"`:''} placeholder="${esc(placeholder)}" maxlength="${key==='email'?254:200}" ${hint?`aria-describedby="hint-${key}"`:''}/>${hint?`<span class="field-hint" id="hint-${key}">${hint}</span>`:''}</div>`;
  };
  function renderQuick(focus=false) {
    const s=get();
    $('#quick-error').hidden=true;
    $('#quick-step-count').textContent=quickStep===2?'02 / 02':`0${quickStep+1} / 02`;
    $('#quick-step-label').textContent=['The essentials','Your details',connected?(live?'Inquiry sent':'Test inquiry saved'):'Your preview'][quickStep];
    $('#quick-progress-fill').style.width=quickStep===0?'50%':'100%';
    $('.quick-controls').hidden=quickStep===2;
    $('#quick-back').style.visibility=quickStep>0?'visible':'hidden';
    $('#quick-next').innerHTML=quickStep===0?`Next: your details ${icon('arrow')}`:`${sendLabel} ${icon('check')}`;
    if(quickStep===0) {
      $('#quick-content').innerHTML=`<h3 tabindex="-1">Tell us the basics.</h3><p class="step-description">About a minute. Headcount and location are enough to start — everything else can stay flexible.</p><div class="quick-fields quick-essentials">
      <div class="field"><label for="quick-guests">How many guests?</label><input id="quick-guests" data-guest-input type="number" inputmode="numeric" min="1" max="10000" step="1" required value="${s.guests}"/><span class="field-hint">An estimate is fine.</span></div>
      <div class="field"><label for="quick-tier">Package</label><select id="quick-tier">${Object.entries(C.packages).map(([id,p])=>`<option value="${id}" ${s.tier===id?'selected':''}>${p.name} · ${dollars(p.rate)}/guest</option>`).join('')}</select><span class="field-hint">You can change this later.</span></div>
      ${field('city','Where is the event?',{required:true,placeholder:'New York',autocomplete:'address-level2'})}
      <div class="field"><label for="quick-region">State</label><select id="quick-region" data-quick-field="region" required>${[['NY','NY'],['NJ','NJ'],['CT','CT'],['Other','Other']].map(([id,name])=>`<option value="${id}" ${s.details.region===id?'selected':''}>${name}</option>`).join('')}</select></div>
      ${field('date','Date',{type:'date'})}
      </div><details class="quick-options"><summary>Occasion, timing & preferences <span>Optional ${icon('plus')}</span></summary><div class="quick-fields">
      <div class="field"><label for="quick-occasion">Occasion</label><select id="quick-occasion">${occasions.map(([id,name])=>`<option value="${id}" ${s.type===id?'selected':''}>${name}</option>`).join('')}</select></div>
      ${field('startTime','Start time / Eastern Time',{type:'time'})}
      <div class="field"><label for="quick-hours">Requested service</label><select id="quick-hours" data-hours><option value="" ${s.serviceHours===null?'selected':''}>Not sure yet</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${s.serviceHours===n?'selected':''}>${n} hours${n===2?' / included baseline':' / custom scope'}</option>`).join('')}</select></div>
      ${field('budget','Approximate budget',{type:'number',placeholder:'Optional total budget'})}
      <div class="field"><label for="quick-beverage">Beverage preference</label><select id="quick-beverage" data-option="beverage">${[['mixed','Cocktails + mocktails'],['zero','Entirely zero proof'],['recommend','Help choosing']].map(([id,name])=>`<option value="${id}" ${s.beverage===id?'selected':''}>${name}</option>`).join('')}</select></div>
      </div><p class="field-hint">Additional hours are quote requests. Tax and any unpriced requests stay outside the subtotal.</p></details>
      ${window.BarsysReadiness.eventFields(s,'quick')}<details class="quick-options quick-addon-drawer"><summary>Any extras in mind? <span id="quick-addon-count">Optional ${icon('plus')}</span></summary><p class="step-description">Nothing is added automatically. Choose any requests to include in your plan.</p><div data-addon-host>${A.addonsMarkup('quick')}</div></details>`;
    } else if(quickStep===1) {
      $('#quick-content').innerHTML=`<h3 tabindex="-1">Where should we send the proposal?</h3><p class="step-description">Just your contact details.</p><div class="quick-fields quick-contact-fields">
      ${field('name','Your full name',{required:true,placeholder:'Alex Morgan',autocomplete:'name'})}
      ${field('company','Company',{required:A.corporate(),placeholder:A.corporate()?'Your company':'Optional for private events',autocomplete:'organization'})}
      ${field('email',A.corporate()?'Work email':'Email',{type:'email',required:true,placeholder:'alex@example.com',autocomplete:'email'})}
      ${field('phone','Phone',{type:'tel',autocomplete:'tel'})}
      <div class="field field-full"><label for="quick-notes">Anything else? <small>Optional</small></label><textarea id="quick-notes" data-quick-field="notes" maxlength="2000" placeholder="Preferred brands, branding details, venue or ingredient requests.">${esc(s.details.notes)}</textarea></div></div>
      <details class="quick-review"><summary>Review my event <span>Optional check ${icon('chevron')}</span></summary>${A.reviewMarkup()}</details>${window.BarsysReadiness.consentLine(s,'quick')}`;
    } else {
      const c=s.details;
      $('#quick-content').innerHTML=connected?`<div class="quick-success"><div class="success-icon">${icon('check')}</div><h3 tabindex="-1">${live?'Inquiry sent.':'Test inquiry saved.'}</h3><p class="success-message">${live?`We'll be in touch at <strong>${esc(c.email)}</strong> to confirm availability, menus and scope. Nothing is booked or charged.`:`Saved to the ${RT.mode==='LOCAL_TEST'?'local':'staging'} database. Nothing was sent to the event team.`}</p>${receipt?`<p class="field-hint">Reference ${esc(receipt.id)}</p>`:''}<div class="success-actions"><button type="button" class="button button-outline" data-download-summary>Download summary ${icon('arrow')}</button></div></div>`
      :`<div class="quick-success"><div class="success-icon">${icon('check')}</div><h3 tabindex="-1">Your preview is ready.</h3><p class="success-message"><strong>Nothing has been sent or booked.</strong></p><div class="success-actions"><button type="button" class="button" data-open-summary>View event summary ${icon('arrow')}</button><button type="button" class="button button-outline" data-download-summary>Download summary ${icon('arrow')}</button><button type="button" class="text-link" data-copy-summary>Copy the details</button></div><button type="button" class="text-link" id="quick-edit">Edit the essentials ${icon('arrow')}</button></div>`;
    }
    updateQuickSummary();
    if(focus){$('#quick-content h3')?.focus({preventScroll:true});$('#quick-planner').scrollIntoView({behavior:motion()?'smooth':'auto',block:'start'});}
  }
  function quickError(text,el) {
    $('#quick-error').textContent=text;$('#quick-error').hidden=false;
    if(el){el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',[...(el.getAttribute('aria-describedby')||'').split(' ').filter(Boolean).filter(x=>x!=='quick-error'),'quick-error'].join(' '));for(let parent=el.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;el.focus();}
  }
  function validateQuick() {
    const fields=$$('input,select,textarea',$('#quick-content'));
    for(const f of fields){
      if(f.disabled) continue;
      f.removeAttribute('aria-invalid');
      if(['text','email'].includes(f.type)) f.value=f.value.trim();
      if(f.hasAttribute('data-quick-field')) A.setDetails({[f.dataset.quickField]:f.value});
      if(!f.checkValidity()) {
        const message=f.id==='quick-guests'?`Please enter a whole number from 1 to 10,000.`:f.type==='email'?'Please enter a valid email address.':f.type==='date'?'Choose today or a future date, or leave the date undecided.':`Please enter ${f.id==='quick-name'?'your name':f.id==='quick-company'?'your company':f.id==='quick-city'?'your event city':'a valid value'}.`;
        quickError(message,f);return false;
      }
    }
    const guest=$('#quick-guests');if(guest&&!A.setGuests(Number(guest.value),guest)){quickError('Please enter a valid whole guest count.',guest);return false;}
    return true;
  }
  function updateQuickSummary() {
    const s=get(),t=A.getEstimate(),p=C.packages[s.tier];
    const allowedTastes=Object.keys(tasteCopy).filter(id=>window.BarsysQuote.menuAvailable(id,s.tier,C));$$('[data-taste]').forEach(b=>b.hidden=!allowedTastes.includes(b.dataset.taste));if(!allowedTastes.includes(taste)&&allowedTastes.length){setTaste(allowedTastes[0]);return;}

    const names=s.menus.map(id=>C.menus.find(m=>m.id===id)?.name).filter(Boolean);
    const rows=[['users',`${s.guests} guests / ${p.name}`],['clock',A.serviceLabel()],['calendar',dateLabel(s.details.date)],['pin',[s.details.city,s.details.region].filter(Boolean).join(', ')||'Location undecided'],['glass',A.menuLabel()]];
    if(s.program==='recurring')rows.push(['calendar',`Recurring requested / ${s.frequency}`]);
    $('#quick-summary-lines').innerHTML=rows.map(([i,v])=>`<div class="qs-row">${icon(i)}<span>${esc(v)}</span></div>`).join('');
    $('#quick-total').textContent=t.subtotal===null?'Custom quote':money(t.subtotal);$('#quick-mobile-estimate').textContent=t.subtotal===null?'Custom quote':money(t.subtotal);
    const dock=$('#mobile-plan-dock-price');if(dock)dock.textContent=t.subtotal===null?`${s.guests} guests · Custom quote`:`${s.guests} guests · ${money(t.subtotal)}`;
    $('#quick-breakdown').innerHTML=A.priceMarkup();
    $('.quick-estimate-note').textContent=A.estimateNote();
    const count=$('#quick-addon-count');if(count)count.textContent=t.lines.filter(l=>l.selected).length+' selected';
    const tier=$('#quick-tier');if(tier&&document.activeElement!==tier)tier.value=s.tier;
    const tasteAdd=$('#taste-add');
    if(tasteAdd){tasteAdd.innerHTML=s.menus.includes(taste)?`Added. View my event ${icon('arrow')}`:`Add this collection ${icon('plus')}`;tasteAdd.disabled=!window.BarsysQuote.menuAvailable(taste,s.tier,C)&&!s.menus.includes(taste);tasteAdd.setAttribute('aria-pressed',String(s.menus.includes(taste)));}
    if(collection){$('#collection-add').disabled=!window.BarsysQuote.menuAvailable(collection,s.tier,C)&&!s.menus.includes(collection);const selected=s.menus.includes(collection);$('#collection-add').innerHTML=`${selected?'Remove from my event':'Add to my event'} ${icon(selected?'check':'plus')}`;$('#collection-add').setAttribute('aria-pressed',String(selected));}
  }
  let plannerOpener=null, plannerBackground=[];
  function openPlanner(value='quick') {
    if(!document.body.classList.contains('planner-focus')) {
      plannerOpener=document.activeElement;
      // Inert siblings along the ancestor path, keeping native modal dialogs usable.
      for(let branch=$('#proposal');branch!==document.body;branch=branch.parentElement) {
        for(const sibling of branch.parentElement.children) {
          if(sibling===branch || sibling.tagName==='DIALOG' || sibling.inert)continue;
          sibling.inert=true;plannerBackground.push(sibling);
        }
      }
      $('#proposal').setAttribute('role','dialog');
      $('#proposal').setAttribute('aria-modal','true');
    }
    document.body.classList.add('planner-focus','plan-intent');
    showRoute(value,false);
    requestAnimationFrame(()=>$(route==='full'?'#step-content h3':'#quick-content h3')?.focus({preventScroll:true}));
    emit('planner_opened',{route});
  }
  function closePlanner() {
    document.body.classList.remove('planner-focus');
    plannerBackground.forEach(el=>el.inert=false);plannerBackground=[];
    $('#proposal').removeAttribute('role');$('#proposal').removeAttribute('aria-modal');
    if(plannerOpener?.isConnected)plannerOpener.focus({preventScroll:true});
    plannerOpener=null;
    // URL cleanup is optional in standalone/opaque-origin previews.
    try { history.replaceState(null,'',location.pathname+location.search); }
    catch(error) { if(error.name!=='SecurityError')throw error; }
    emit('planner_closed');
  }
  function showRoute(value,scroll=false) {
    route=value==='full'?'full':'quick';
    $$('[data-plan-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.planRoute===route)));
    $('#quick-planner').hidden=route!=='quick';$('#planner').hidden=route!=='full';
    if(route==='full')A.openFull();else renderQuick();
    emit('planner_route',{route});
    if(scroll)$('#proposal').scrollIntoView({behavior:motion()?'smooth':'instant'});
  }
  function setTaste(id) {
    if(!Object.hasOwn(tasteCopy,id))return;
    taste=id;if(!$('#taste-image'))return;
    const m=C.menus.find(x=>x.id===id), info=tasteCopy[id];
    $$('[data-taste]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.taste===id)));
    $('#taste-base').textContent=info.base;$('#taste-name').textContent=m.name;$('#taste-notes').textContent=info.notes;
    const image=$('#taste-image');clearTimeout(imageTimer);image.classList.add('changing');
    imageTimer=setTimeout(()=>{A.setImage(image,id);image.closest('.taste-stage').dataset.taste=id;image.classList.remove('changing');},motion()?160:0);
    $('#taste-image-label').textContent='OFFICIAL BARSYS MIXLIST / '+(m.zeroProof?'ZERO PROOF':'COCKTAIL COLLECTION');
    updateQuickSummary();emit('taste_selected',{collection:id});
  }
  function openCollection(id) {
    const m=C.menus.find(x=>x.id===id);if(!m?.image)return;
    collection=id;dialogFocus=document.activeElement;
    $('#collection-title').textContent=m.name;$('#collection-type').textContent=`${m.recipes} RECIPES / ${m.base||'THE BARSYS MIXLISTS'}`;
    $('#collection-flavor').textContent=m.flavor||m.description;$('#collection-detail').textContent=m.detail||m.description;
    A.setImage($('#collection-image'),m.image);
    $('#collection-image-note').textContent='OFFICIAL BARSYS MIXLIST ARTWORK';
    $('#collection-recipes').innerHTML=(m.examples?`<div class="collection-recipes">${m.examples.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'')+(m.recipeSource||m.imageSource?`<a class="recipe-source" href="${esc(m.recipeSource||m.imageSource)}" target="_blank" rel="noopener noreferrer">View the original Barsys collection \u2197</a>`:'');
    updateQuickSummary();$('#collection-dialog').showModal();$('.collection-close').focus({preventScroll:true});emit('collection_viewed',{collection:id});
  }
  const dataRow=(label,value)=>`<div class="approval-item"><dt>${esc(label)}</dt><dd>${esc(value||'To be confirmed')}</dd></div>`;
  function approvalMarkup() {
    const d=A.exportData(),e=d.event,c=d.contact,t=d.estimate;
    const lineLabel=l=>`${l.name}${l.quantity>1?' x '+l.quantity:''}${l.variantLabel?' / '+l.variantLabel:''}`;
    return `<div class="approval-header"><img class="approval-logo" alt="Barsys" width="170" height="32" src="${esc(C.brand.summaryLogoDataURI)}"/><div class="approval-version">EVENT SUMMARY<br/>${esc(new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}))}</div></div>
    <h2 id="summary-title">Your next good time.<br/>Every detail, together.</h2><p class="approval-subtitle">${esc(c.company||c.name||'Your event')} / ${esc(e.occasion)}</p><span class="summary-safe">${receipt?`INQUIRY SENT / REF ${esc(receipt.id)}`:'NOT SENT, BOOKED OR CHARGED'}</span>
    <div class="approval-stats"><div><strong>${e.guests}</strong><span>APPROXIMATE GUESTS</span></div><div><strong>${esc(e.package)}</strong><span>STARTING PACKAGE</span></div><div><strong>${e.serviceHours===null?'TBD':e.serviceHours+' hours'}</strong><span>REQUESTED SERVICE</span></div></div>
    <dl class="approval-grid">${dataRow('Organizer',c.name)}${dataRow('Email',c.email)}${c.company?dataRow('Company',c.company):''}${dataRow('Date / time',dateLabel(c.date)+' / '+(c.startTime?c.startTime+' Eastern Time':'time undecided'))}${dataRow('Location',[c.city,c.region,c.venue,c.venueType].filter(Boolean).join('\n'))}${dataRow('Program',e.program==='recurring'?`${e.requestedCadence} / ${e.commitmentPreference} commitment / ${e.billingPreference} billing (requested)`:'Single event')}${dataRow('Menu preferences',[e.menus.join('\n'),e.menuRecommendationRequested?'Team recommendation requested':''].filter(Boolean).join('\n')||'Team recommendation')}${dataRow('Beverage preference',e.beveragePreference==='zero'?'Entirely zero proof':e.beveragePreference==='mixed'?'Cocktails + mocktails':'Help choosing')}${dataRow('Add-on requests',e.addons.map(l=>lineLabel(l)+' / '+(l.status==='included'?'Included':l.status==='priced'?money(l.total):'Quoted separately')).join('\n')||'None selected')}${c.budget?dataRow('Budget preference',c.budget):''}${c.phone?dataRow('Phone',c.phone):''}${c.restrictions?dataRow('Ingredient requests',c.restrictions):''}${c.notes?dataRow('Organizer notes',c.notes):''}</dl>
    <div class="approval-price"><div><span>${esc(e.package)} / ${e.guests} guests</span><strong>${t.base===null?'Custom quote':money(t.base)}</strong></div>${t.priced.map(l=>`<div><span>${esc(lineLabel(l))}</span><strong>${money(l.total)}</strong></div>`).join('')}${t.scopeCosts.map(l=>`<div><span>${esc(l.name)}</span><span>${l.status==='priced'?money(l.total):esc(l.label)}</span></div>`).join('')}<div class="approval-total"><span>Subtotal before tax</span><span>${t.subtotal===null?'Custom quote':money(t.subtotal)}</span></div><div><span>Tax</span><span>To be confirmed</span></div>${t.pending.length?`<h3>Requests outside this subtotal</h3>${t.pending.map(l=>`<div><span>${esc(lineLabel(l))}</span><span>Quoted separately</span></div>`).join('')}`:''}<p class="approval-optional">${esc(A.estimateNote())}</p></div>
    <h3>Included in the package baseline</h3><p>Two hours of service, Barsys machines, bartending, spirits, mixers, ice, cocktail and zero-proof options, setup and cleanup. Requested additional time is not included unless priced above. Package-specific menu, presentation and staffing scope need final confirmation.</p>
    ${window.BarsysReadiness.summaryMarkup(d)}<div class="approval-next"><h3 style="margin-top:0">Next: confirm with the event team</h3><p>The Barsys team (${esc(C.email)}) confirms availability, final scope, ingredient requirements, unpriced requests, tax and terms with you.</p></div><div class="approval-footer">Planning summary generated in your browser. Not an invoice or a booking confirmation.</div>`;
  }
  function openSummary() {
    summaryFocus=document.activeElement;$('#approval-sheet').innerHTML=approvalMarkup();$('#summary-dialog').showModal();$('#close-summary').focus({preventScroll:true});emit('summary_viewed');
  }
  function downloadSummary() {
    const css=`*{box-sizing:border-box}body{margin:0;background:#ececec;color:#111;font:14px/1.7 Arial,Helvetica,sans-serif}.tools{max-width:850px;margin:20px auto;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 20px;font-size:11px}.tools button{background:#111;color:#fff;border:0;padding:13px 20px;cursor:pointer;border-radius:3px}.approval-sheet{background:white;max-width:850px;margin:20px auto;padding:50px}.approval-header{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:2px solid #111;padding-bottom:25px}.approval-logo{width:170px;height:auto;display:block;object-fit:contain}.approval-version{font-size:9px;text-align:right;color:#666}.approval-sheet h2{font-size:42px;line-height:1.08;letter-spacing:-1.6px;margin:32px 0 14px}.approval-subtitle{color:#666;font-size:14px}.summary-safe{display:block;color:#75538e;font-size:10px;font-weight:700;margin-top:17px}.approval-stats{display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid #ddd;margin:26px 0;padding:22px 0;gap:20px}.approval-stats strong{font-size:26px;display:block}.approval-stats span{font-size:9px;color:#777}.approval-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 35px}.approval-item{overflow-wrap:anywhere;min-width:0}.approval-item dt{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777}.approval-item dd{font-size:14px;white-space:pre-line;margin:4px 0 0}.approval-price{padding:23px;background:#f5f5f5;border:1px solid #ddd;margin-top:28px}.approval-price>div{display:flex;justify-content:space-between;gap:20px;font-size:13px;margin:8px 0}.approval-price .approval-total{border-top:1px solid #ccc;padding-top:14px;margin-top:14px;font-size:19px;font-weight:700}.approval-sheet h3{font-size:16px;margin:26px 0 10px}.approval-sheet p{font-size:12px;color:#666;line-height:1.85}.approval-next{border-left:3px solid #111;background:#f8f8f8;padding:14px 19px;margin-top:23px}.approval-footer{border-top:1px solid #ddd;padding-top:18px;margin-top:30px;font-size:10px;color:#777}.booking-timeline{list-style:none;padding:0;margin:22px 0}.booking-timeline li{display:flex;gap:14px;border-top:1px solid #ddd;padding:15px 0}.booking-timeline li>span{font-size:11px;border:1px solid #aaa;border-radius:50%;width:28px;height:28px;flex:0 0 28px;text-align:center;line-height:28px}.booking-timeline p{margin:4px 0 0}.booking-timeline strong{font-size:14px}@media(max-width:600px){.approval-sheet{padding:26px 20px;margin:10px}.approval-header{flex-wrap:wrap}.approval-version{text-align:left}.approval-logo{width:140px;max-width:100%}.approval-grid{grid-template-columns:1fr}.approval-sheet h2{font-size:34px}.approval-stats{gap:10px}.approval-stats strong{font-size:20px}.approval-stats span{font-size:8px}.approval-price{padding:17px}.approval-price .approval-total{font-size:16px}}@media print{body{background:white}.tools{display:none}.approval-sheet{margin:0;padding:12mm;max-width:none}.approval-header,.approval-price,.approval-item{break-inside:avoid}}`;
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><title>Barsys | Event Planning Summary</title><style>${css}</style></head><body><div class="tools"><span>EVENT SUMMARY / NOT A BOOKING</span><button type="button" id="print">Print / save PDF</button></div><main class="approval-sheet">${approvalMarkup()}</main><script>document.getElementById('print').addEventListener('click',()=>window.print());</script></body></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download='Barsys-Event-Summary.html';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);A.toast('Summary download requested. Check your browser downloads.');emit('summary_download_requested');
  }
  $('#quick-form').addEventListener('submit',async event=>{event.preventDefault();if(quickStep===2)return;if(!validateQuick())return;if(get().details.date&&get().details.date<TODAY){quickStep=0;renderQuick();quickError('Choose a future date or leave it undecided.',$('#quick-date'));return;}
    if(quickStep===1&&connected){const b=$('#quick-next');b.disabled=true;b.textContent=live?'Sending…':'Saving…';try{if(!window.BarsysInquiry)throw new Error('Not sent. Email '+C.email+'.');receipt=await window.BarsysInquiry.send();}catch(error){b.disabled=false;renderQuick();quickError(error.message||'Not sent. Please try again.');return;}b.disabled=false;quickStep=2;renderQuick(true);emit('inquiry_sent');return;}
    quickStep++;renderQuick(true);emit(quickStep===2?'proposal_preview_created':'proposal_details_opened');});
  $('#quick-back').addEventListener('click',()=>{if(quickStep>0){quickStep--;renderQuick(true);}});
  $('#quick-reset').addEventListener('click',()=>{A.reset();receipt=null;quickStep=0;renderQuick(true);});
  $('#quick-planner').addEventListener('input',event=>{
    document.body.classList.add('plan-intent');
    const f=event.target;
    if(f.matches('[data-guest-input]')&&f.checkValidity()) $('#quick-error').hidden=true;
    if(f.hasAttribute('data-quick-field')){A.setDetails({[f.dataset.quickField]:f.value});f.removeAttribute('aria-invalid');$('#quick-error').hidden=true;}
  });
  $('#quick-planner').addEventListener('change',event=>{
    const f=event.target;
    if(f.hasAttribute('data-quick-field'))A.setDetails({[f.dataset.quickField]:f.value});
    if(f.id==='quick-occasion')A.setOccasion(f.value);
    if(f.id==='quick-tier'){A.setTier(f.value);A.refreshAddonHosts();}
    
  });
  document.addEventListener('barsys:state',updateQuickSummary);
  document.addEventListener('barsys:route',e=>{if(quickStep===2)quickStep=0;openPlanner(e.detail);});
  document.addEventListener('barsys:collection',e=>openCollection(e.detail));
  document.addEventListener('click',e=>{
    const t=e.target.closest('button,a');if(!t)return;
    if(t.matches('a[href="#proposal"]')){e.preventDefault();openPlanner('quick');return;}
    if(t.id==='planner-close'){closePlanner();return;}
    if(t.matches('[data-adjust-guests], [data-package], [data-taste], #taste-add, #collection-add'))document.body.classList.add('plan-intent');
    if(t.hasAttribute('data-taste'))setTaste(t.dataset.taste);
    if(t.id==='taste-add'){
      if(get().menus.includes(taste)){showRoute('quick',true);return;}
      if(A.addMenu(taste)){A.toast('Collection added to your event. Keep exploring or build your proposal.');emit('collection_added',{collection:taste});}
      updateQuickSummary();
    }
    if(t.hasAttribute('data-plan-route'))showRoute(t.dataset.planRoute);
    if(t.hasAttribute('data-rich-menu'))openCollection(t.dataset.richMenu);
    if(t.hasAttribute('data-close-collection'))$('#collection-dialog').close();
    if(t.id==='collection-add'&&collection){A.toggleMenu(collection);updateQuickSummary();}
    if(t.hasAttribute('data-open-summary'))openSummary();
    if(t.hasAttribute('data-download-summary'))downloadSummary();
    if(t.hasAttribute('data-copy-summary'))A.copyPlan();
    if(t.id==='close-summary')$('#summary-dialog').close();
    if(t.id==='print-summary'){document.body.classList.add('printing-plan');window.print();}
    if(t.id==='quick-summary-toggle'){const open=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',String(open));$('.quick-summary').classList.toggle('expanded',open);}
    if(t.id==='quick-edit'){quickStep=0;renderQuick(true);}
    if(t.getAttribute('href')==='#planner')showRoute('full');
  });
  window.addEventListener('afterprint',()=>document.body.classList.remove('printing-plan'));
  $('#collection-dialog').addEventListener('close',()=>{collection=null;if(dialogFocus?.isConnected)dialogFocus.focus({preventScroll:true});});
  $('#summary-dialog').addEventListener('close',()=>{document.body.classList.remove('printing-plan');if(summaryFocus?.isConnected)summaryFocus.focus({preventScroll:true});});
  for(const dialog of [$('#collection-dialog'),$('#summary-dialog')])dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
  window.addEventListener('hashchange',()=>{if(location.hash==='#planner')openPlanner('full');else if(location.hash==='#proposal')openPlanner('quick');});
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('planner-focus')||document.querySelector('dialog[open]'))return;
    if(e.key==='Escape'){e.preventDefault();closePlanner();return;}
    if(e.key!=='Tab')return;
    const targets=$$('a[href],button,input,select,textarea,summary,[tabindex]',$('#proposal'))
      .filter(el=>el.tabIndex>=0&&!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
    const first=targets[0],last=targets.at(-1);
    if(e.shiftKey&&(document.activeElement===first||!targets.includes(document.activeElement))){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  renderQuick();setTaste('signature');if(location.hash==='#planner')showRoute('full');
  window.BarsysV3=Object.freeze({getRoute:()=>route,getQuickStep:()=>quickStep,getTaste:()=>taste,summaryMarkup:approvalMarkup});
})();
