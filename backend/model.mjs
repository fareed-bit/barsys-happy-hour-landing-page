import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{}});
for(const file of ['config.js','quote-engine.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
export const config=context.window.BARSYS;
export const statuses=['received','contacted','quoted','confirmed','completed','cancelled'];
const options={type:['team','client','celebration','recruiting','executive','exploring','birthday','engagement','venue','other'],tier:Object.keys(config.packages),menuMode:['choose','recommend'],program:['single','recurring'],frequency:['monthly','twice-monthly','quarterly','exploring'],commitment:['3-months','6-months','12-months','exploring'],billing:['monthly','quarterly','annual','exploring'],beverage:['mixed','zero','recommend']};
const detailOptions={region:['NY','NJ','CT','Other'],venueType:['office','rooftop','venue','deciding'],venueApproval:['not-checked','pending','confirmed','na'],coi:['unsure','required','notRequired'],glassware:['discuss','barsys','venue'],marketingInterest:['yes','no'],photoPreference:['discuss','noGuests','ask'],timezone:['America/New_York']};
export const detailKeys=['name','email','company','phone','date','startTime','timezone','city','region','venue','venueType','budget','restrictions','notes','venueApproval','coi','glassware','contractEntity','marketingInterest','photoPreference'];
export class HttpError extends Error {constructor(status,message,fields={}){super(message);this.status=status;this.fields=fields;}}
export function validate(input,{allowPastDate=false}={}){
 const errors={},out={};const fail=(k,m)=>errors[k]=m;
 if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError(422,'Invalid event details.');
 if(input.schemaVersion!==1)fail('schemaVersion','Unsupported form version. Refresh the page.');
 for(const [key,allowed] of Object.entries(options)){if(!allowed.includes(input[key]))fail(key,'Choose a valid '+key+'.');else out[key]=input[key];}
 if(!Number.isInteger(input.guests)||input.guests<1||input.guests>config.quoteRules.maxInquiryGuests)fail('guests','Enter between 1 and 10,000 guests.');else out.guests=input.guests;
 if(input.serviceHours!==null&&(!Number.isInteger(input.serviceHours)||input.serviceHours<1||input.serviceHours>8))fail('serviceHours','Choose 1–8 hours or leave undecided.');else out.serviceHours=input.serviceHours;
 if(!Array.isArray(input.menus)||input.menus.length>config.menus.length||input.menus.some(id=>!config.menus.some(m=>m.id===id))||new Set(input.menus).size!==input.menus.length)fail('menus','Choose valid, unique collections.');else out.menus=[...input.menus];
 out.addons={};
 if(!input.addons||typeof input.addons!=='object'||Array.isArray(input.addons))fail('addons','Invalid add-ons.');
 else for(const [id,value] of Object.entries(input.addons)){
  const item=config.addons.find(a=>a.id===id);
  if(!item||!value||!Number.isInteger(value.quantity)||value.quantity<0||value.quantity>item.maxQuantity){fail('addons','Invalid add-on quantity.');continue;}
  const variant=value.variant||'';
  if(item.variants?!item.variants.some(v=>v[0]===variant):variant!=='')fail('addons','Invalid add-on option.');
  out.addons[id]={quantity:value.quantity,variant};
 }
 const hours=out.addons['extra-hours']?.quantity||0;
 if(input.serviceHours!==undefined&&hours!==Math.max(0,(input.serviceHours||2)-2))fail('serviceHours','Extra hours must match the requested duration.');
 out.details={};
 for(const key of detailKeys){const value=input.details?.[key];if(typeof value!=='string'||value.length>(['notes','restrictions'].includes(key)?2000:254)){fail('details.'+key,'Enter a valid '+key+'.');continue;}out.details[key]=value.trim();}
 for(const [key,allowed] of Object.entries(detailOptions))if(!allowed.includes(out.details[key]))fail('details.'+key,'Choose a valid '+key+'.');
 for(const key of ['name','email','city'])if(!out.details[key])fail('details.'+key,'This field is required.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.details.email||''))fail('details.email','Enter a valid email address.');
 const date=out.details.date;
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!allowPastDate&&date<new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())))fail('details.date','Choose a valid future date or leave undecided.');
 if(out.details.startTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(out.details.startTime))fail('details.startTime','Enter a valid time.');
 if(out.details.budget&&!/^\d+(\.\d{1,2})?$/.test(out.details.budget))fail('details.budget','Enter a non-negative budget.');
 if(Object.keys(errors).length)throw new HttpError(422,'Review the highlighted event details.',errors);
 return out;
}
export function estimate(state){return JSON.parse(JSON.stringify(context.window.BarsysQuote.calculate(state,config)));}
export function labels(s){return {occasion:s.type,package:config.packages[s.tier].name,menus:s.menus.map(id=>config.menus.find(m=>m.id===id).name)};}
