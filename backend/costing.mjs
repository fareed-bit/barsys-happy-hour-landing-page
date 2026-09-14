import {readFileSync} from 'node:fs';
import {HttpError,config} from './model.mjs';
export const priceCatalog=JSON.parse(readFileSync(new URL('./ingredient-prices.json',import.meta.url),'utf8'));
export const ingredientKey=x=>x.name.trim().toLowerCase()+'|'+x.unit;
export function validateCosts(rows=[]){
 if(!Array.isArray(rows)||rows.length>300)throw new HttpError(422,'Too many ingredient prices.');
 const keys=new Set();return rows.map(x=>{
  if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>120||!['ml','g','each','pinch','dash'].includes(x.unit)||!Number.isFinite(x.packAmount)||x.packAmount<=0||x.packAmount>100000||!Number.isInteger(x.priceCents)||x.priceCents<0||x.priceCents>10000000||typeof x.supplier!=='string'||!x.supplier.trim()||x.supplier.length>200)throw new HttpError(422,'Each price needs an ingredient, matching unit, positive pack size, USD price and supplier/product description.');
  const key=ingredientKey(x);if(keys.has(key))throw new HttpError(422,'Duplicate ingredient price.');keys.add(key);
  return {name:x.name.trim(),unit:x.unit,packAmount:x.packAmount,priceCents:x.priceCents,supplier:x.supplier.trim()};
 });
}
export function costSummary(payload,plan,summary,catalog=priceCatalog){
 const overrides=new Map((plan.costOverrides||[]).map(x=>[ingredientKey(x),x]));
 const prices=new Map(catalog.items.map(x=>[ingredientKey(x),x]));
 const priced=x=>{const override=overrides.get(ingredientKey(x)),reference=prices.get(ingredientKey(x));const p=override?{...override,source:'Staff-entered event estimate',url:null,checkedAt:null}:reference;const valid=p&&Number.isInteger(p.priceCents)&&p.priceCents>=0&&p.packAmount>0;return {...x,reference:reference||null,price:valid?p:null,status:valid?'priced':reference?'yield-needed':'price-needed',usedCents:valid?x.amount/p.packAmount*p.priceCents:null,packs:valid?Math.ceil(x.amount/p.packAmount-1e-9):null};};
 const rows=summary.ingredients.filter(x=>x.amount>0).map(priced).map(x=>({...x,usedCents:x.usedCents===null?null:Math.round(x.usedCents),purchaseCents:x.price?x.packs*x.price.priceCents:null}));
 const menus=payload.menus.map(menuId=>{let raw=0,missing=0,servings=0,unmeasured=0;plan.recipes.forEach((r,i)=>{if(r.menuId!==menuId||!r.share)return;const count=summary.servings[i].count;servings+=count||0;if(!r.confirmed||!r.ingredients.length){unmeasured++;return;}if(!count)return;for(const x of r.ingredients){const p=priced({...x,amount:x.amount*count});if(p.usedCents===null)missing++;else raw+=p.usedCents;}});const complete=summary.totalDrinks!==null&&plan.menuConfirmed&&servings>0&&!unmeasured&&!missing;return {menuId,name:config.menus.find(m=>m.id===menuId)?.name||menuId,servings,missing,unmeasured,complete,knownUsedCents:Math.round(raw),totalCents:complete?Math.round(raw):null};});
 const missing=rows.filter(x=>!x.price).length,complete=summary.complete&&missing===0;
 const grouped=new Map();
 for(const row of rows){if(!row.price)continue;const p=row.price;
  // Only catalog products with matching units, pack sizes and prices share procurement.
  const key=p.url?JSON.stringify([p.url,row.unit,p.packAmount,p.priceCents]):ingredientKey(row);
  const group=grouped.get(key)||{product:p.product||p.supplier||row.name,unit:row.unit,amount:0,packAmount:p.packAmount,priceCents:p.priceCents,url:p.url||null,ingredients:[]};
  group.amount+=row.amount;group.ingredients.push(row.name);grouped.set(key,group);
 }
 const purchases=[...grouped.values()].map(p=>({...p,packs:Math.ceil(p.amount/p.packAmount-1e-9),purchaseCents:Math.ceil(p.amount/p.packAmount-1e-9)*p.priceCents}));
 const yieldMissing=rows.filter(r=>r.status==='yield-needed').length;
 const knownUsedCents=menus.reduce((n,m)=>n+m.knownUsedCents,0),knownPurchaseCents=purchases.reduce((n,x)=>n+(x.purchaseCents||0),0);
 return {estimatedRows:rows.filter(r=>r.price?.estimated||r.price?.yieldEstimated).length,currency:'USD',catalogCheckedAt:catalog.checkedAt,rows,menus,purchases,missing,yieldMissing,priceMissing:missing-yieldMissing,complete,knownUsedCents,knownPurchaseCents,totalUsedCents:complete?knownUsedCents:null,totalPurchaseCents:complete?knownPurchaseCents:null};
}
