import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {createStore} from '../backend/store.mjs';
import {createAPI} from '../backend/api.mjs';
test('rate limits are shared between instances and reset with a new window',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'barsys-limit-'));const filename=join(dir,'test.sqlite');const a=await createStore({filename}),b=await createStore({filename});t.after(async()=>{await a.close();await b.close();await rm(dir,{recursive:true,force:true});});const now=120000;
 for(let i=0;i<30;i++)assert.equal(await (i%2?a:b).consumeRate('shared',now),true);
 assert.equal(await a.consumeRate('shared',now),false);assert.equal(await b.consumeRate('shared',now),false);assert.equal(await b.consumeRate('shared',now+60000),true);
});
test('staging exposes sign-in metadata but rejects signed-out inquiry writes',async t=>{
 let handler;const server=http.createServer((req,res)=>handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin=`http://127.0.0.1:${server.address().port}`;
 const auth={clientId:'test',user:async()=>null,require:async()=>{const e=new Error('Sign-in required');e.status=401;throw e;}};
 handler=createAPI({store:{},auth,origin,local:true,staging:true});const status=await (await fetch(origin+'/api/status')).json();assert.equal(status.mode,'STAGING_TEST');
 const response=await fetch(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,401);
});
