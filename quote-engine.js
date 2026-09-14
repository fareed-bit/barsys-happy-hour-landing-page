/* Pure quote arithmetic shared by both local planning routes.
 * `null` is unknown, never zero. Only explicitly approved prices are included.
 * This is a client preview, NOT a server-authoritative quote or tax calculation. */
(() => {
  'use strict';
  const units = {event:()=>1,guest:s=>s.guests,hour:(s,q)=>q,quantity:(s,q)=>q,guest_quantity:(s,q)=>s.guests*q};
  const included = (item,state) => (item.includedIn||[]).includes(state.tier);
  const quantity = (item,state) => Math.max(0,Math.min(item.maxQuantity||1,Math.trunc(Number(state.addons?.[item.id]?.quantity)||0)));
  function line(item,state) {
    const q=quantity(item,state), inc=included(item,state);
    const variant=state.addons?.[item.id]?.variant||item.variants?.[0]?.[0]||'';
    // Variant prices require their own approval; a base price never silently prices every variant.
    const rate=item.variants ? item.variantPrices?.[variant] : item;
    const approved=!!rate?.approved && Number.isFinite(rate.price) && rate.price>=0;
    const totalCents=inc?0:approved&&q>0?Math.round(rate.price*100)*units[item.unit](state,q):null;
    return {id:item.id,name:item.name,quantity:q,variant,variantLabel:item.variants?.find(v=>v[0]===variant)?.[1]||'',unit:item.unit,unitLabel:item.unitLabel,status:inc?'included':approved?'priced':'quote',unitPrice:approved?rate.price:null,total:totalCents===null?null:totalCents/100,selected:q>0,approved};
  }
  const menuAvailable=(id,tier,C=window.BARSYS)=>{const p=C.menuPolicy;if(!p?.published)return true;const r={classic:0,signature:1,reserve:2};return Object.hasOwn(r,p.assignments?.[id])&&r[p.assignments[id]]<=r[tier];};
  function calculate(state,C=window.BARSYS) {
    const p=C.packages[state.tier], rules=C.quoteRules;
    const reasons=[];
    if(state.guests<C.minGuests||state.guests>C.maxGuests)reasons.push(`Group size ${state.guests}: custom event scope required.`);
    const city=(state.details.city||'').trim().toLowerCase();
    if(state.details.region!=='NY'||!['new york','new york city','nyc','manhattan','brooklyn','queens','bronx','the bronx','staten island'].includes(city))reasons.push('Location: service scope and travel to be confirmed.');
    const eligible=reasons.length===0;
    const base=eligible?Math.round(p.rate*100)*state.guests/100:null;
    const lines=C.addons.map(a=>line(a,state)).filter(l=>l.selected||l.status==='included');
    const pending=lines.filter(l=>l.selected&&l.status==='quote');
    const priced=lines.filter(l=>l.selected&&l.status==='priced');
    const addOnTotal=priced.reduce((sum,l)=>sum+Math.round(l.total*100),0)/100;
    const allowed=p.menuLimit+quantity(C.addons.find(a=>a.id==='extra-mixlists'),state);
    const unavailableMenus=state.menus.filter(id=>!menuAvailable(id,state.tier,C));if(unavailableMenus.length)reasons.push('Retained menu preferences are outside this package. Change package or remove those preferences before submitting.');
    const overflow=Math.max(0,state.menus.length-allowed);
    if(overflow)reasons.push(`${overflow} extra collection preference${overflow===1?'':'s'} retained: request more mixlists or adjust your choices.`);
    if(state.serviceHours!==null&&state.serviceHours<rules.includedServiceHours)reasons.push('Shorter service requested: package minimum and scope to be confirmed.');
    if(state.beverage==='zero'&&state.menus.some(id=>!C.menus.find(m=>m.id===id)?.zeroProof))reasons.push('Zero-proof event: confirm alcohol-free alternatives for the retained cocktail preferences.');
    if(state.beverage==='zero'&&quantity(C.addons.find(a=>a.id==='beer-wine'),state))reasons.push('Beer and wine request conflicts with zero-proof-only service: please review.');
    if(state.beverage==='zero'&&quantity(C.addons.find(a=>a.id==='spirits'),state))reasons.push('Spirit upgrade retained for review: this is a zero-proof-only event.');
    if(state.program==='recurring')reasons.push('Recurring frequency, commitment and billing requested; no recurring discount or contract total has been applied.');
    const delivery=C.quoteRules.delivery||{};
    const deliveryApproved=delivery.approved===true&&Number.isFinite(delivery.price)&&delivery.price>=0;
    const glassIncluded=(C.quoteRules.glassware?.includedIn||[]).includes(state.tier);
    const mode=state.details.glassware||'discuss';
    const scopeCosts=[{id:'delivery',name:'Delivery & venue access',optional:false,status:deliveryApproved?'priced':'quote',label:deliveryApproved?'Approved event cost':'To be confirmed',total:deliveryApproved?Math.round(delivery.price*100)/100:null}];
    scopeCosts.push({id:'glassware',name:'Glassware',optional:false,status:glassIncluded?'included':mode==='venue'?'venue-supplied':'quote',label:glassIncluded?'Included in package':mode==='venue'?'Venue supplies / review':mode==='barsys'?'Barsys supply / quote':'Scope undecided',total:glassIncluded?0:null});
    const eventCostTotal=scopeCosts.filter(l=>l.status==='priced').reduce((n,l)=>n+Math.round(l.total*100),0)/100;
    const subtotal=base===null?null:(Math.round(base*100)+Math.round(addOnTotal*100)+Math.round(eventCostTotal*100))/100;
    return {rate:p.rate,base,addOnTotal,subtotal,tax:null,total:null,currency:'USD',eligible,scopeCosts,eventCostTotal,lines,pending,priced,reasons,menuLimit:allowed,menuOverflow:overflow,unavailableMenus,includedMenus:p.menuLimit,requiresQuote:!eligible||pending.length>0||reasons.length>0||scopeCosts.some(l=>l.status==='quote'),serviceHours:state.serviceHours,includedServiceHours:rules.includedServiceHours,taxLabel:'Tax to be confirmed',version:rules.version};
  }
  window.BarsysQuote=Object.freeze({calculate,line,included,quantity,menuAvailable});
})();
