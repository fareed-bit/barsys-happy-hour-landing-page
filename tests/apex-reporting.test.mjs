import test from 'node:test';import assert from 'node:assert/strict';
import {apexAuthorised,buildApexReport,APEX_REPORT_AUDIENCE,APEX_REPORT_CALLER} from '../backend/apex-reporting.mjs';
import {patchAPI} from '../deploy/apex-analytics-20261022/patch.mjs';
const now=new Date('2026-10-22T12:00:00Z');
const doc=id=>({id,mode:'LIVE',createdAt:'2026-10-21T13:00:00Z',payload:{details:{company:'Real Company',email:'private@example.com'}},history:[{actor:'Organizer',action:'Inquiry saved'}],booking:{confirmed:false}});
test('report verifies Google signature/audience and only the existing Apex identity',async()=>{
 const verify=async options=>{assert.equal(options.audience,APEX_REPORT_AUDIENCE);return {getPayload:()=>({email:APEX_REPORT_CALLER,email_verified:true})};};
 assert.ok(await apexAuthorised('Bearer signed-fixture',verify));
 assert.equal(await apexAuthorised(undefined,verify),false);
 assert.equal(await apexAuthorised('Basic signed-fixture',verify),false);
 for(const payload of [{email:'other@barsys.com',email_verified:true},{email:APEX_REPORT_CALLER,email_verified:false},undefined]){
  assert.equal(await apexAuthorised('Bearer signed-fixture',async()=>({getPayload:()=>payload})),false);
 }
 assert.equal(await apexAuthorised('Bearer bad',async()=>{throw Error('Invalid signature');}),false);
});
test('counts only stored public LIVE inquiries, with explicit booking evidence and no private fields',async()=>{
 const rows=[doc('a'),{...doc('b'),booking:{confirmed:true}},{...doc('c'),status:'confirmed'},
 {...doc('d'),mode:'STAGING_TEST'},{...doc('e'),source:{kind:'email'}},{...doc('f'),deleted:true},
 {...doc('g'),payload:{details:{company:'TEST ONLY - fixture'}}},{...doc('h'),createdAt:'2026-01-01T00:00:00Z'},
 {...doc('i'),history:[{actor:'Owner',action:'Imported'}]},{...doc('j'),createdAt:'2027-01-01T00:00:00Z'}];
 const result=await buildApexReport({list:async()=>rows},30,now);
 assert.equal(result.confirmed_inquiries,3);assert.equal(result.confirmed_bookings,1);assert.equal(result.booked_revenue,null);
 assert.ok(!JSON.stringify(result).includes('private@example.com'));assert.ok(!JSON.stringify(result).includes('Real Company'));
});
test('pagination deduplicates IDs and reports storage/date failures instead of a false zero',async()=>{
 let calls=0;const rows=Array.from({length:100},(_,i)=>doc(String(i)));
 const result=await buildApexReport({list:async()=>calls++? [doc('0'),doc('100')]:rows},30,now);
 assert.equal(result.confirmed_inquiries,101);
 await assert.rejects(buildApexReport({list:async()=>{throw Error('offline');}},30,now));
 await assert.rejects(buildApexReport({list:async()=>[{...doc('bad'),createdAt:'bad'}]},30,now));
 await assert.rejects(buildApexReport({list:async()=>[]},91,now));
});
test('production overlay installs reporting at the reviewed boundary and is idempotent',()=>{
 const old="   if(req.method==='GET'&&path==='/api/auth/me'){existing();}";
 const result=patchAPI(old);assert.ok(result.endsWith(old));assert.ok(result.includes('apexAuthorised'));
 assert.equal(patchAPI(result),result);assert.throws(()=>patchAPI('Unrecognised API'));
});
test('HTTP report route rejects unsigned requests without a new stored credential',async()=>{
 const {createAPI}=await import('../backend/api.mjs');
 const api=createAPI({store:{list:async()=>[doc('a')]},local:false,origin:'https://events.barsys.com',auth:{clientId:'fixture'}});
 let status,body;
 await api({method:'GET',url:'/api/integrations/apex/analytics',headers:{}},{writeHead:s=>{status=s;},end:b=>{body=JSON.parse(b);}});
 assert.equal(status,401);assert.ok(!JSON.stringify(body).includes('private@example.com'));
});
