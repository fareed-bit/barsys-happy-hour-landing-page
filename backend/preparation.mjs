import {readFileSync} from 'node:fs';
import {costSummary,validateCosts} from './costing.mjs';
export const recipeCatalog=JSON.parse(readFileSync(new URL('./recipe-catalog.json',import.meta.url),'utf8'));
import {config,HttpError} from './model.mjs';
export const equipmentRules=[
 ['machines','Barsys 360 machines',1,1],['cords','360 charging cords',1,1],['blocks','360 charging blocks',1,1],['ipads','iPads',1,1],['stands','iPad stands',1,1],['shakers','Shakers',2,2],['funnels','360 funnels',1,2],['glasses','Mixing glasses',2,2],['chargers','Portable chargers',null,null],['towels','Microfiber towels',null,null],['wipes','Clorox wipes',null,null]
];
export function defaultPreparation(payload){return {menuConfirmed:payload.menuMode!=='recommend',drinksPerGuest:3,costOverrides:[],bufferPercent:0,machines:Math.ceil(payload.guests/25),recipes:payload.menus.flatMap(id=>{const m=config.menus.find(x=>x.id===id);return Array.from({length:m.recipes},(_,i)=>({id:id+'-'+i,menuId:id,name:recipeCatalog.menus[id]?.recipes[i]?.name||m.examples?.[i]||`${m.name} — recipe ${i+1}`,share:1,confirmed:!!recipeCatalog.menus[id]?.recipes[i]&&!recipeCatalog.menus[id]?.recipes[i]?.reviewRequired,sourceUrl:recipeCatalog.menus[id]?.recipes[i]?.sourceUrl||null,reviewNote:recipeCatalog.menus[id]?.recipes[i]?.reviewNote||null,ingredients:structuredClone(recipeCatalog.menus[id]?.recipes[i]?.ingredients||[])}));}),equipment:Object.fromEntries(equipmentRules.map(([id,,min])=>[id,{quantity:min===null?null:Math.ceil(payload.guests/25)*min,packed:false,notes:''}]))};}
export function validatePreparation(input,payload){
 const fail=m=>{throw new HttpError(422,m);};
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Invalid preparation plan.');
 const num=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 if(input.drinksPerGuest!==null&&!num(input.drinksPerGuest,0.1,20))fail('Enter expected drinks per guest (0.1–20), or leave unset.');
 if(!num(input.bufferPercent,0,100)||!Number.isInteger(input.machines)||input.machines<Math.ceil(payload.guests/25)||input.machines>1000)fail('Check the buffer and machine count. Machines must cover 25 guests each.');
 if(typeof input.menuConfirmed!=='boolean')fail('Confirm the menu status.');
 const initial=defaultPreparation(payload);
 if(!Array.isArray(input.recipes)||input.recipes.length!==initial.recipes.length)fail('Recipe list must match the selected collections.');
 const recipes=input.recipes.map((r,i)=>{
  const expected=initial.recipes[i];
  if(!r||r.id!==expected.id||r.menuId!==expected.menuId||typeof r.name!=='string'||!r.name.trim()||r.name.length>150||!num(r.share,0,100)||typeof r.confirmed!=='boolean'||!Array.isArray(r.ingredients)||r.ingredients.length>30)fail('Check recipe names, shares and ingredients.');
  const ingredients=r.ingredients.map(x=>{if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>120||!num(x.amount,0.001,10000)||!['ml','g','each','pinch','dash'].includes(x.unit))fail('Each ingredient needs a name, positive amount and ml, g, each, pinch or dash unit.');return {name:x.name.trim(),amount:x.amount,unit:x.unit};});
  if(r.confirmed&&!ingredients.length)fail('Add measured ingredients before confirming a recipe.');
  return {...expected,name:r.name.trim(),share:r.share,confirmed:r.confirmed,ingredients};
 });
 const equipment={};
 for(const [id,,min] of equipmentRules){const e=input.equipment?.[id];if(!e||!(e.quantity===null||Number.isInteger(e.quantity)&&e.quantity>=0&&e.quantity<=10000)||typeof e.packed!=='boolean'||typeof e.notes!=='string'||e.notes.length>300)fail('Check equipment quantities and notes.');if(min!==null&&(e.quantity===null||e.quantity<input.machines*min))fail('Required equipment must meet the per-machine minimum.');if(id==='machines'&&e.quantity!==input.machines)fail('Equipment machine count must match the service plan.');if(e.packed&&(e.quantity===null||e.quantity===0))fail('Enter a positive quantity before marking an item packed.');equipment[id]={quantity:e.quantity,packed:e.packed,notes:e.notes.trim()};}
 return {costOverrides:validateCosts(input.costOverrides),menuConfirmed:input.menuConfirmed,drinksPerGuest:input.drinksPerGuest,bufferPercent:input.bufferPercent,machines:input.machines,recipes,equipment};
}
export function preparationSummary(payload,plan=defaultPreparation(payload)){
 const total=plan.drinksPerGuest===null?null:Math.ceil(payload.guests*plan.drinksPerGuest*(1+plan.bufferPercent/100)-1e-9);
 const weight=plan.recipes.reduce((n,r)=>n+r.share,0),counts=plan.recipes.map(r=>total===null||!weight?null:Math.floor(total*r.share/weight));
 if(total!==null&&weight){let left=total-counts.reduce((a,b)=>a+b,0);const order=plan.recipes.map((r,i)=>({i,remainder:total*r.share/weight-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);for(let i=0;i<left;i++)counts[order[i].i]++;}
 const totals=new Map();const missing=[];
 plan.recipes.forEach((r,i)=>{if(!r.share)return;if(!r.confirmed||!r.ingredients.length){missing.push(r.name);return;}if(counts[i]===null)return;for(const x of r.ingredients){const key=x.name.toLowerCase()+'|'+x.unit;const item=totals.get(key)||{name:x.name,unit:x.unit,amount:0};item.amount+=x.amount*counts[i];totals.set(key,item);}});
 const perMachine=total===null?null:Math.ceil(total/plan.machines);
 const result={minimumMachines:Math.ceil(payload.guests/25),totalDrinks:total,servings:plan.recipes.map((r,i)=>({id:r.id,count:counts[i]})),ingredients:[...totals.values()].map(x=>({...x,amount:Math.ceil((x.amount-1e-9)*1000)/1000})),missing,complete:total!==null&&weight>0&&missing.length===0&&plan.menuConfirmed,refills:perMachine===null?null:{perMachineDrinks:perMachine,min:Math.max(0,Math.ceil(perMachine/50)-1),max:Math.max(0,Math.ceil(perMachine/40)-1)},packed:equipmentRules.filter(([id])=>plan.equipment[id].packed).length,equipment:equipmentRules.map(([id,name,min,max])=>({id,name,minimum:min===null?null:min*plan.machines,recommendedMax:max===null?null:max*plan.machines,...plan.equipment[id]}))};
 result.costs=costSummary(payload,plan,result);result.catalogWarnings=payload.menus.flatMap(id=>!recipeCatalog.menus[id]?[`${config.menus.find(m=>m.id===id).name}: CMS mapping needs confirmation.`]:recipeCatalog.menus[id].compatible==null?[`${config.menus.find(m=>m.id===id).name}: Published recipe drafts only; source CMS mapping and 360 compatibility need staff confirmation.`]:recipeCatalog.menus[id].compatible===false?[`${config.menus.find(m=>m.id===id).name}: CMS does not mark this mixlist as 360 compatible. Confirm service method.`]:[]);return result;
}
