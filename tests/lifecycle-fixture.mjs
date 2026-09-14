// Isolated test support only. Never imports .env or an existing database.
import http from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes, createHash} from 'node:crypto';
import {createStore} from '../backend/store.mjs';
import {createAPI} from '../backend/api.mjs';
import {createAuth} from '../backend/auth.mjs';
export const owner = 'fareed@barsys.com';
export function syntheticInquiry() {
  return {schemaVersion:1,type:'team',guests:25,tier:'signature',menus:['agave'],menuMode:'choose',addons:{},program:'single',frequency:'exploring',commitment:'exploring',billing:'exploring',beverage:'mixed',serviceHours:2,
    details:{name:'Synthetic QA Organizer',email:'qa@example.invalid',phone:'',company:'SYNTHETIC LIFECYCLE - DO NOT FULFILL',contractEntity:'QA Only',date:'2099-09-17',startTime:'17:00',timezone:'America/New_York',city:'New York',region:'NY',venue:'Synthetic office',restrictions:'',notes:'Isolated automated test only',venueType:'office',budget:'',venueApproval:'pending',coi:'unsure',glassware:'discuss',marketingInterest:'no',photoPreference:'discuss'}};
}
export async function seedSession(store, email=owner) {
  const token=randomBytes(32).toString('base64url');
  await store.saveSession(createHash('sha256').update(token).digest('hex'),{email,sub:'synthetic-test-user',role:email===owner?'owner':'crew'},Date.now()+3600000);
  return token;
}
export async function startFixture(apiOptions={}) {
  const directory=await mkdtemp(join(tmpdir(),'barsys-lifecycle-test-'));
  const store=await createStore({filename:join(directory,'isolated.sqlite')});
  const token=await seedSession(store);
  let offset=0;
  // Explicit virtual rate-limit windows keep a long rehearsal fast; limiter logic is unchanged.
  const apiStore={...store,consumeRate:(key,now)=>store.consumeRate(key,now+offset)};
  const auth=createAuth({store,clientId:'synthetic-local-client'});
  let handler;
  const server=http.createServer((req,res)=>handler(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  handler=createAPI({store:apiStore,auth,origin,local:true,...apiOptions});
  async function request(path,{method='GET',body,anonymous=false,key,session=token}={}) {
    const response=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(!anonymous?{Cookie:'barsys_session='+session}:{}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,body:await response.json()};
  }
  async function close() {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    await store.close();
    await rm(directory,{recursive:true,force:true});
  }
  return {store,request,origin,token,close,nextWindow:()=>{offset+=120000;}};
}
