import {config,validate,estimate,labels,HttpError} from './model.mjs';
import {defaultPreparation,validatePreparation} from './preparation.mjs';
import {proposalMenus} from './proposals.mjs';
import {defaultEvent} from './operations.mjs';
import {calculateProposal,proposalGaps} from '../admin/proposal-model.js';
export const editableDetails=['name','email','phone','company','contractEntity','date','startTime','timezone','city','region','venue','restrictions','notes'];
const fail=m=>{throw new HttpError(422,m);};
export function editedPayload(doc,input){
 if(!input||!input.details)fail('Event details are required.');const p=structuredClone(doc.payload);
 for(const k of editableDetails)p.details[k]=input.details[k];for(const k of ['guests','tier','menus','serviceHours'])p[k]=input[k];p.menuMode=p.menus?.length?'choose':'recommend';
 const hours=Math.max(0,(p.serviceHours||2)-2);if(hours)p.addons['extra-hours']={quantity:hours,variant:''};else delete p.addons['extra-hours'];
 return validate({...p,schemaVersion:1},{allowPastDate:p.details.date===doc.payload.details.date});
}
export function changeImpact(doc,p,state){
 const old=doc.payload,e=state.events[doc.id]||defaultEvent(),changed=[];
 for(const k of ['guests','tier','menus','serviceHours'])if(JSON.stringify(old[k])!==JSON.stringify(p[k]))changed.push(k);
 for(const k of editableDetails)if(old.details[k]!==p.details[k])changed.push(k);
 const operational=changed.some(k=>['guests','tier','menus','serviceHours','date','startTime','timezone','venue','city','region','restrictions'].includes(k)),schedule=changed.some(k=>['date','startTime','timezone','serviceHours'].includes(k));
 const reservations=state.reservations.filter(x=>x.eventId===doc.id&&['reserved','dispatched'].includes(x.status));const blockers=[];
 if(operational&&e.stage>=3)blockers.push('This event has reached packing or later. Resolve its live operations before changing service scope.');
 if(operational&&reservations.length)blockers.push('Release reserved stock in operations first. Dispatched stock must be received before changing service scope.');
 if(schedule&&e.staffing.length)blockers.push('Unassign staff before changing the service schedule, then assign them to the revised times.');
 const warnings=operational?['Ingredient quantities will recalculate; menu and packing confirmations will reset.','Event returns to Confirm. Existing expenses, supplier records and payments are retained for review.']:[];
 if(schedule)warnings.push('Staff and stock timing must be checked against the new schedule.');
 if(changed.length&&doc.proposal)warnings.push('The saved proposal keeps its own copy. It must be reviewed against these changes before acceptance.');
 if(operational&&doc.acceptances?.length)warnings.push('Previously accepted figures remain recorded, but profit is withheld until a revised proposal is accepted.');
 return {changed,operational,schedule,blockers,warnings};
}
export function applyEventChange(original,p,previous,actor){
 const impact=changeImpact(original,p,previous);if(impact.blockers.length)fail(impact.blockers.join(' '));
 const doc=structuredClone(original),state=structuredClone(previous),e=state.events[doc.id]||=defaultEvent(),now=new Date().toISOString();
 if(!impact.changed.length)return {doc,state,impact};
 if(impact.operational){const old=doc.preparation||defaultPreparation(doc.payload),fresh=defaultPreparation(p),machines=Math.max(old.machines,fresh.machines);fresh.machines=machines;fresh.recipes=fresh.recipes.map(r=>old.recipes.find(x=>x.id===r.id)||r);fresh.drinksPerGuest=old.drinksPerGuest;fresh.bufferPercent=old.bufferPercent;fresh.costOverrides=old.costOverrides;fresh.menuConfirmed=false;
 for(const id of Object.keys(fresh.equipment))fresh.equipment[id]={...old.equipment[id],packed:false};
 // Apply exact per-machine requirements without reducing intentionally larger counts.
 for(const [id,factor] of Object.entries({machines:1,cords:1,blocks:1,ipads:1,stands:1,shakers:2,funnels:1,glasses:2}))fresh.equipment[id].quantity=id==='machines'?machines:Math.max(old.equipment[id].quantity||0,machines*factor);
 doc.preparation=validatePreparation(fresh,p);e.preparationNeedsReview=true;e.stage=0;e.tasks=defaultEvent().tasks;e.staffingConfirmed=false;e.agreementNeedsReview=!!doc.acceptances?.length;
 }
 doc.payload=p;doc.labels=labels(p);doc.estimate=estimate(p);doc.version++;doc.updatedAt=now;
 if(doc.proposal){doc.proposal.sourceStale=true;Object.keys(doc.proposal.plan.confirmed).forEach(k=>doc.proposal.plan.confirmed[k]=false);}
 doc.history.push({at:now,actor,action:'Event details edited: '+impact.changed.join(', '),before:original.payload,after:p});state.version++;state.audit.push({at:now,actor,action:'event-details',eventId:doc.id,changed:impact.changed});return {doc,state,impact};
}
export function acceptProposal(original,previous,input,actor){
 if((previous.events[original.id]?.stage||0)>=3)fail('Accept or amend proposals before packing begins. This event is already in active operations.');
 const saved=original.proposal;if(!saved)fail('Save a proposal first.');
 if(saved.sourceStale)fail('Event details changed. Review and save the proposal against the current event first.');
 if(input.revision!==saved.revision)fail('Proposal revision changed. Reload before accepting.');
 if(original.acceptances?.some(a=>a.revision===saved.revision))fail('This proposal revision is already accepted.');
 if(input.confirmed!==true||typeof input.reference!=='string'||!input.reference.trim()||input.reference.length>500)fail('Confirm actual client acceptance and enter its email or document reference.');
 const gaps=proposalGaps(saved.plan);if(gaps.length)fail('Complete proposal review before acceptance: '+gaps.join(', '));
 const plan=saved.plan,c=calculateProposal(plan);if(c.totalCents===null||c.subtotal>100000000)fail('Proposal total is incomplete or outside supported limits.');
 const tier=Object.keys(config.packages).find(k=>config.packages[k].name.toLowerCase()===plan.details.packageName.toLowerCase());if(!tier)fail('Use a recognized package name before transferring to operations.');
 const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));let duration=(minutes(plan.details.endTime)-minutes(plan.details.startTime)+1440)%1440/60;if(!Number.isInteger(duration)||duration<1||duration>8)fail('Event service must span 1–8 whole hours.');
 const proposed=structuredClone(original.payload);Object.assign(proposed,{guests:plan.planningGuests,tier,menus:plan.menuIds,serviceHours:duration});Object.assign(proposed.details,{name:plan.details.name,email:plan.details.email,phone:plan.details.phone,company:plan.details.company,contractEntity:plan.details.entity,date:plan.details.date,startTime:plan.details.startTime,timezone:plan.details.timezone,venue:plan.details.venue,restrictions:plan.details.restrictions});
 const city=/^(.*), (NY|NJ|CT|Other)$/.exec(plan.details.city);proposed.details.city=city?city[1]:plan.details.city;if(city)proposed.details.region=city[2];
 const payload=editedPayload(original,proposed);const impact=changeImpact(original,payload,previous);const machineChanged=plan.machines!==(original.preparation||defaultPreparation(original.payload)).machines;if(machineChanged){impact.changed.push('machines');impact.warnings.push('Machine allocation changes; recheck equipment and packing.');if(previous.reservations.some(r=>r.eventId===original.id&&['reserved','dispatched'].includes(r.status)))impact.blockers.push('Release existing stock reservations before changing machine allocation.');}if(impact.blockers.length)fail(impact.blockers.join(' '));
 const changed=applyEventChange(original,payload,previous,actor),doc=changed.doc,state=changed.state,e=state.events[doc.id]||=defaultEvent();
 impact.warnings=impact.warnings.filter(x=>!x.startsWith('The saved proposal')&&!x.startsWith('Previously accepted'));
 const now=new Date().toISOString();if(!changed.impact.changed.length){doc.version++;state.version++;}if(machineChanged){e.stage=0;e.tasks=defaultEvent().tasks;e.staffingConfirmed=false;}doc.updatedAt=now;
 const prep=doc.preparation||defaultPreparation(payload);prep.machines=plan.machines;for(const [k,f] of Object.entries({machines:1,cords:1,blocks:1,ipads:1,stands:1,shakers:2,funnels:1,glasses:2})){prep.equipment[k].quantity=k==='machines'?plan.machines:Math.max(prep.equipment[k].quantity||0,plan.machines*f);prep.equipment[k].packed=false;}prep.menuConfirmed=false;doc.preparation=validatePreparation(prep,payload);e.preparationNeedsReview=true;
 const acceptance={revision:saved.revision,at:now,by:actor,reference:input.reference.trim(),menus:structuredClone(proposalMenus.filter(m=>saved.plan.menuIds.includes(m.id))),plan:structuredClone(saved.plan),calculation:c};(doc.acceptances||=[]).push(acceptance);doc.proposal=structuredClone(saved);doc.proposal.sourceStale=false;doc.proposal.acceptedAt=now;
 e.revenueCents=c.subtotal;e.salesTaxCents=c.taxCents;e.invoiceTotalCents=c.totalCents;e.acceptedProposalRevision=saved.revision;e.agreementNeedsReview=false;e.acceptedScope={loadIn:plan.details.loadIn,departure:plan.details.departure,scope:plan.details.scope,terms:plan.details.terms,depositCents:c.depositCents,balanceCents:c.balanceCents,depositDue:plan.depositDue,balanceDue:plan.balanceDue};
 doc.history.push({at:now,actor,action:'Recorded client acceptance of proposal revision '+saved.revision,reference:acceptance.reference});state.audit.push({at:now,actor,action:'proposal-accepted',eventId:doc.id,revision:saved.revision});return {doc,state,impact};
}
