// Read-only acceptance check. Never enables intake or writes customer records.
const origin=process.argv[2];
if(!origin||!/^https?:\/\//.test(origin))throw Error('Provide the exact reviewed deployment origin');
const base=new URL(origin);if(base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw Error('Use an origin without path, query or credentials');
const checks=[];
async function get(path){const r=await fetch(new URL(path,base),{redirect:'manual',signal:AbortSignal.timeout(15000)});return {r,body:r.headers.get('content-type')?.includes('application/json')?await r.json():null};}
try{
 const ready=await get('/api/ready');checks.push({name:'Database ready',passed:ready.r.status===200&&ready.body?.ready===true});
 const status=await get('/api/status');checks.push({name:'Actual Cloud Run revision reported',passed:status.r.status===200&&/^barsys-happyhours-/.test(status.body?.release||''),mode:status.body?.mode,revision:status.body?.release});
 for(const path of ['/api/admin/inquiries','/api/admin/operations','/api/admin/retention/disposal-ledger']){const {r}=await get(path);checks.push({name:'Anonymous access denied: '+path,passed:r.status===401});}
 for(const path of ['/backend/store.mjs','/package.json']){const {r}=await get(path);checks.push({name:'Private source blocked: '+path,passed:r.status===404});}
 const policy=await get('/api/menu-policy');checks.push({name:'Package menu policy published',passed:policy.r.status===200&&policy.body?.published===true&&Object.keys(policy.body.assignments||{}).length===27,version:policy.body?.version});
 console.log(JSON.stringify({origin:base.origin,checkedAt:new Date().toISOString(),checks,limitations:'Does not establish service/coverage approval, screen-reader/device acceptance or live submission/email success.'},null,2));
 if(checks.some(c=>!c.passed))process.exitCode=1;
}catch(error){console.error('Deployed check could not complete:',error.message);process.exitCode=1;}
