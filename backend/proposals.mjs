import {config,HttpError} from './model.mjs';
import {defaultPreparation,recipeCatalog} from './preparation.mjs';
import {addDays,calculateProposal,proposalGaps,confirmations,detailFields} from '../admin/proposal-model.js';
export const proposalMenus=config.menus.map(m=>({id:m.id,name:m.name,recipes:(recipeCatalog.menus[m.id]?.recipes||[]).map(r=>({name:r.name,ingredients:r.ingredients.map(i=>i.name)}))}));
export function defaultProposal(doc){
 const s=doc.payload,d=s.details,plan=doc.preparation||defaultPreparation(s),hours=s.serviceHours;
 let endTime='';if(d.startTime&&hours){const [h,m]=d.startTime.split(':').map(Number);endTime=String((h+hours)%24).padStart(2,'0')+':'+String(m).padStart(2,'0');}
 const lines=(doc.estimate?.lines||[]).filter(x=>x.quantity>0).map((x,i)=>({id:'addon-'+i,label:x.name+(x.variantLabel?' — '+x.variantLabel:''),quantity:x.quantity,unitCents:x.total===null?null:Math.round(x.total*100/x.quantity),taxable:true}));
 for(const [id,label] of [['glassware','Glassware'],['transport','Transportation']])if(!lines.some(l=>l.label.toLowerCase().includes(id==='transport'?'transport':'glassware')))lines.push({id,label,quantity:1,unitCents:null,taxable:true});
 return {schemaVersion:1,details:{company:d.company,name:d.name,email:d.email,phone:d.phone,entity:d.contractEntity,date:d.date,startTime:d.startTime,endTime,timezone:d.timezone,venue:d.venue,city:[d.city,d.region].filter(Boolean).join(', '),loadIn:'',departure:'',packageName:config.packages[s.tier].name,restrictions:d.restrictions,scope:(s.tier==='classic'?config.packages.classic.detail:config.packages.classic.detail+' '+config.packages[s.tier].detail.replace('Everything in Classic, with','Also includes')),terms:''},planningGuests:s.guests,billedGuests:s.guests,graceGuests:null,machines:plan.machines,menuIds:[...s.menus],rateCents:doc.estimate?.base===null?null:Math.round(config.packages[s.tier].rate*100),packageTaxable:true,lines,taxMilliPercent:null,depositBps:5000,overageCents:null,expires:'',menuDue:addDays(d.date,-7),guestDue:addDays(d.date,-2),depositDue:'',balanceDue:addDays(d.date,7),confirmed:Object.fromEntries(confirmations.map(k=>[k,false]))};
}
export function validateProposal(input){
 const fail=m=>{throw new HttpError(422,m);};if(!input||input.schemaVersion!==1)fail('Invalid proposal version.');
 const p={schemaVersion:1,details:{}};
 for(const [k,label] of detailFields){const x=input.details?.[k];if(typeof x!=='string'||x.length>(['scope','terms'].includes(k)?6000:k==='restrictions'?2000:254))fail('Check '+label+'.');p.details[k]=x.trim();}
 if(p.details.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.details.email))fail('Check client email.');
 const date=(x,label)=>{if(typeof x!=='string'||x&&!/^\d{4}-\d{2}-\d{2}$/.test(x))fail('Check '+label+'.');if(x&&(!Number.isFinite(Date.parse(x))||new Date(x).toISOString().slice(0,10)!==x))fail('Check '+label+'.');return x;};
 date(p.details.date,'event date');for(const k of ['expires','menuDue','guestDue','depositDue','balanceDue'])p[k]=date(input[k],k);
 for(const k of ['startTime','endTime','loadIn','departure'])if(p.details[k]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.details[k]))fail('Check '+k+'.');
 if(p.details.timezone&&!['America/New_York'].includes(p.details.timezone))fail('Use America/New_York timezone.');
 for(const [k,min,max] of [['planningGuests',1,10000],['billedGuests',1,10000],['graceGuests',0,10000],['machines',1,1000],['rateCents',0,10000000],['taxMilliPercent',0,100000],['depositBps',0,10000],['overageCents',0,10000000]]){const x=input[k];if(x!==null&&(!Number.isSafeInteger(x)||x<min||x>max))fail('Check '+k+'.');p[k]=x;}
 if(typeof input.packageTaxable!=='boolean')fail('Check package tax choice.');p.packageTaxable=input.packageTaxable;
 if(!Array.isArray(input.menuIds)||input.menuIds.length>config.menus.length||input.menuIds.some(id=>!proposalMenus.some(m=>m.id===id))||new Set(input.menuIds).size!==input.menuIds.length)fail('Choose valid mixlists.');p.menuIds=[...input.menuIds];
 if(!Array.isArray(input.lines)||input.lines.length>30)fail('Use up to 30 pricing lines.');
 p.lines=input.lines.map((x,i)=>{if(!x||typeof x.label!=='string'||!x.label.trim()||x.label.length>150||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>10000||x.unitCents!==null&&(!Number.isSafeInteger(x.unitCents)||x.unitCents<0||x.unitCents>100000000)||typeof x.taxable!=='boolean')fail('Check pricing line '+(i+1)+'.');return {id:'line-'+i,label:x.label.trim(),quantity:x.quantity,unitCents:x.unitCents,taxable:x.taxable};});
 p.confirmed={};for(const k of confirmations){if(typeof input.confirmed?.[k]!=='boolean')fail('Check review confirmations.');p.confirmed[k]=input.confirmed[k];}
 const c=calculateProposal(p);if(c.knownSubtotal>1000000000000)fail('Proposal exceeds supported amount.');return p;
}
export function proposalView(doc){const plan=doc.proposal?.plan||defaultProposal(doc);return {version:doc.version,sourceStale:!!doc.proposal?.sourceStale,acceptedRevision:doc.acceptances?.at(-1)?.revision||null,latestAcceptance:doc.acceptances?.at(-1)||null,plan,calculation:calculateProposal(plan),gaps:proposalGaps(plan),savedAt:doc.proposal?.savedAt||null,sourceVersion:doc.proposal?.sourceVersion||doc.version,menus:proposalMenus,source:{details:doc.payload.details,guests:doc.payload.guests,menus:doc.labels.menus,serviceHours:doc.payload.serviceHours,notes:doc.estimate?.reasons||[]},revision:doc.proposal?.revision||0};}
