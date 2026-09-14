import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAuth} from '../backend/auth.mjs';
import {createStore} from '../backend/store.mjs';
const capture=()=>({headers:{},setHeader(k,v){this.headers[k]=v;}});
const cookie=res=>[res.headers['Set-Cookie']].flat().map(s=>s.split(';')[0]).join('; ');
test('Google staff login: verified exact identity, nonce, durable cookies, expiry and logout',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'barsys-auth-'));const filename=join(dir,'auth.sqlite');let store=await createStore({filename});t.after(async()=>{await store.close();await rm(dir,{recursive:true,force:true});});
 let clock=Date.now(),claims;const settings={clientId:'test.apps.googleusercontent.com',secure:true,now:()=>clock,verify:async()=>claims};let auth=createAuth({...settings,store});
 const prepare=async()=>{const res=capture();const c=await auth.challenge(res);claims={aud:settings.clientId,iss:'https://accounts.google.com',sub:'google-subject',email:'fareed@barsys.com',hd:'barsys.com',email_verified:true,exp:Math.floor(clock/1000)+600,nonce:c.nonce};return {headers:{cookie:cookie(res)}};};
 assert.equal(await auth.user({headers:{}}),null);await assert.rejects(()=>auth.require({headers:{}}),e=>e.status===401);
 for(const patch of [{email:'other@barsys.com'},{email:'fareed@barsys.com.attacker.test'},{email_verified:false},{hd:'attacker.test'},{aud:'wrong'},{iss:'attacker'},{exp:0},{nonce:'wrong'}]){const req=await prepare();Object.assign(claims,patch);await assert.rejects(()=>auth.signIn(req,capture(),{credential:'test'}),e=>[401,403].includes(e.status));}
 const req=await prepare(),res=capture();await auth.signIn(req,res,{credential:'test'});const session={headers:{cookie:cookie(res)}};assert.equal((await auth.user(session)).email,'fareed@barsys.com');assert.ok(res.headers['Set-Cookie'][0].includes('HttpOnly; SameSite=Strict'));assert.ok(res.headers['Set-Cookie'][0].includes('Secure'));assert.ok(res.headers['Set-Cookie'][0].startsWith('__Host-'));
 await assert.rejects(()=>auth.signIn(req,capture(),{credential:'test'}),e=>e.status===401);
 await store.close();store=await createStore({filename});auth=createAuth({...settings,store});assert.equal((await auth.user(session)).sub,'google-subject');
 const signedOut=capture();await auth.signOut(session,signedOut);assert.equal(await auth.user(session),null);assert.ok(signedOut.headers['Set-Cookie'][0].includes('Max-Age=0'));
 const r2=capture();await auth.signIn(await prepare(),r2,{credential:'test'});const session2={headers:{cookie:cookie(r2)}};clock+=8*60*60*1000+1;assert.equal(await auth.user(session2),null);
});
test('missing client config and failed Google signature verification fail closed',async()=>{
 const store={};const auth=createAuth({store});await assert.rejects(()=>auth.challenge(capture()),e=>e.status===503);
 const invalid=createAuth({store,clientId:'test',verify:async()=>{throw new Error('invalid signature');}});await assert.rejects(()=>invalid.signIn({headers:{cookie:'barsys_challenge=test'}},capture(),{credential:'forged'}),e=>e.status===401);
});
test('explicit crew allowlist is checked on login and every session use',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'crew-auth-')),store=await createStore({filename:join(dir,'db')});t.after(async()=>{await store.close();await rm(dir,{recursive:true,force:true});});let s=await store.getOperations();s.staff.push({id:'crew',email:'crew@barsys.com',active:true,crewAccess:true});s.version++;await store.saveOperations(s,s.version-1);
 let claims;const auth=createAuth({store,clientId:'test',verify:async()=>claims});const res=capture(),c=await auth.challenge(res);claims={aud:'test',iss:'accounts.google.com',sub:'crew-sub',email:'crew@barsys.com',hd:'barsys.com',email_verified:true,exp:Math.floor(Date.now()/1000)+600,nonce:c.nonce};const out=capture();await auth.signIn({headers:{cookie:cookie(res)}},out,{credential:'test'});const session={headers:{cookie:cookie(out)}};assert.equal((await auth.user(session)).role,'crew');s=await store.getOperations();s.staff[0].crewAccess=false;s.version++;await store.saveOperations(s,s.version-1);assert.equal(await auth.user(session),null);
});
