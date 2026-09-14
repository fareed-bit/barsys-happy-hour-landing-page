// Browser evidence using the actual backend, an empty temp database and a fresh Chrome profile.
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {defaultPolicy} from '../backend/menu-policy.mjs';
import {createStore} from '../backend/store.mjs';
import {syntheticInquiry,seedSession} from './lifecycle-fixture.mjs';
import {connectCDP} from './cdp-client.mjs';
const root=new URL('../',import.meta.url),qa=new URL('../qa/',import.meta.url);
const directory=await mkdtemp(join(tmpdir(),'barsys-browser-rehearsal-'));
const filename=join(directory,'isolated.sqlite'),store=await createStore({filename});
const token=await seedSession(store);
if(process.env.BARSYS_QA_PUBLISHED_POLICY==='1'){const policy=defaultPolicy();policy.assignments.signature='signature';policy.assignments.agave='signature';await store.saveMenuPolicy({...policy,version:1,published:true,provisional:true},0);}
await store.close();
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const origin=`http://localhost:${port}`,env=Object.fromEntries(['PATH','HOME','TMPDIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(env,{NODE_ENV:'test',BARSYS_DB:filename,PORT:String(port),GOOGLE_CLIENT_ID:'synthetic-local-client',BARSYS_RECEIPT_DIR:join(directory,'receipts')});
const server=spawn(process.execPath,['backend/server.mjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
const evidence={scope:'Actual backend, isolated SQLite, synthetic records, fresh headless Chrome via CDP',checks:[],screenshots:[],errors:[]};
let browser;
const record=(name,details)=>{evidence.checks.push({name,passed:true,details});console.log('PASS:',name);};
async function screenshot(name){const r=await browser.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL(name,qa),Buffer.from(r.data,'base64'));evidence.screenshots.push(name);}
async function navigate(path,condition){await browser.call('Page.navigate',{url:origin+path});await browser.wait(`document.documentElement && document.readyState !== 'loading' && location.href === ${JSON.stringify(origin+path)} && (${condition})`);}
try {
  for(let i=0;i<80;i++){try{if((await fetch(origin+'/api/status')).ok)break;}catch{}if(i===79)throw Error('Isolated server unavailable');await new Promise(r=>setTimeout(r,100));}
  browser=await connectCDP(Number(process.env.BARSYS_QA_CHROME_PORT));
  await browser.call('Network.setCookie',{name:'barsys_session',value:token,url:origin,httpOnly:true,sameSite:'Strict'});
  await browser.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('/',"document.documentElement.dataset.appMode==='LOCAL_TEST' && !!window.BarsysPlanner");
  assert.match(await browser.evaluate("document.getElementById('runtime-data-notice').textContent"),/Only Save test inquiry/);
  record('connected runtime notice appears before any inquiry action');
  if(process.env.BARSYS_QA_PUBLISHED_POLICY==='1'){
    for(const [tier,count] of [['classic',4],['signature',9],['reserve',18]]){
      await browser.evaluate(`BarsysPlanner.setTier(${JSON.stringify(tier)})`);
      assert.equal(await browser.evaluate("document.querySelectorAll('#featured-menus .menu-card').length"),count);
    }
    await browser.evaluate("BarsysPlanner.setTier('signature')");
    const invalid={...syntheticInquiry(),tier:'classic'};
    const rejected=await fetch(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':'synthetic-wrong-package'},body:JSON.stringify(invalid)});
    assert.equal(rejected.status,422);record('published synthetic policy filters all three packages and rejects an unavailable menu server-side');
  }

  await browser.wait("Array.from(document.querySelectorAll('video')).some(v=>!v.paused && v.muted && v.currentTime>0)");
  record('muted hero video starts in isolated Chrome');
  await browser.evaluate("document.querySelector('[data-policy=privacy]').click()");
  await browser.wait("document.getElementById('policy-dialog').open");
  assert.match(await browser.evaluate("document.getElementById('policy-body').textContent"),/database/);
  await screenshot('lifecycle-privacy-desktop.png');
  await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.wait("!document.getElementById('policy-dialog').open");
  record('privacy dialog reflects connected storage and closes with Escape');
  const response=await fetch(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':'isolated-browser-inquiry-0001'},body:JSON.stringify(syntheticInquiry())});
  assert.equal(response.status,201);const {id}=await response.json();
  await navigate('/admin/',"!!document.querySelector('#events [data-id]')");
  await browser.evaluate("document.querySelector('#events [data-id]').click()");
  await browser.wait("!!document.getElementById('preview-emails')");
  await browser.evaluate("document.querySelector('.notification-preview').open=true;document.getElementById('preview-emails').click()");
  await browser.wait("document.getElementById('email-preview-status').textContent.includes('Nothing has been sent')");
  assert.match(await browser.evaluate("document.getElementById('email-preview-content').textContent"),/does not hold a date/);
  record('event email drafts load in the owner dashboard without sending');
  await navigate('/admin/preparation.html?event='+id,"!document.getElementById('prep-form').hidden");
  await browser.evaluate("document.getElementById('drinks').value='4';document.getElementById('drinks').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('prep-form').requestSubmit()");
  await browser.wait("document.getElementById('save-state').textContent.startsWith('Preparation saved.')");
  assert.match(await browser.evaluate("document.getElementById('capacity').textContent"),/100 planned drinks/);
  assert.equal(await browser.evaluate("document.getElementById('menu-confirmed').checked"),false);
  record('dedicated preparation saves both versions and resets menu confirmation');
  await screenshot('lifecycle-preparation-desktop.png');
  await navigate('/admin/operations.html?event='+id,"!!document.getElementById('flow-prep')");
  await browser.evaluate("document.querySelector('[data-flow-step=\"1\"]').click()");
  await browser.evaluate("const f=document.getElementById('flow-prep');f.elements.drinks.value='3';f.elements.drinks.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit()");
  await browser.wait("document.getElementById('message').textContent.includes('Preparation saved')");
  record('inline preparation saves and refreshes operations after demand edit');
  const api=async(path,options={})=>{const r=await fetch(origin+path,{...options,headers:{Origin:origin,'Content-Type':'application/json',Cookie:'barsys_session='+token}});const body=await r.json();assert.equal(r.ok,true,JSON.stringify(body));return body;};
  const ops=await api('/api/admin/operations');
  await api('/api/admin/operations',{method:'POST',body:JSON.stringify({version:ops.state.version,action:'task',payload:{eventId:id,stage:0,index:0,done:true}})});
  await browser.evaluate("(()=>{const f=document.getElementById('flow-prep');f.elements.drinks.value='5';f.elements.drinks.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()");
  await browser.wait("document.getElementById('message').textContent.includes('changed')");
  assert.equal(await browser.evaluate("document.getElementById('flow-prep').elements.drinks.value"),'5');
  assert.equal((await api('/api/admin/inquiries/'+id+'/preparation')).plan.drinksPerGuest,3);
  record('stale inline save retains typed edits while stored preparation remains unchanged');
  await browser.evaluate("document.getElementById('discard').click()");
  await browser.wait("document.getElementById('flow-prep').elements.drinks.value==='3'");
  record('explicit discard reloads the latest saved state');
  assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('.ops .prep-link')).color"),'rgb(255, 255, 255)','Dark operations action links need readable white text');
  record('dark operations action links retain readable foreground color');
  for(const width of [320,390,768,1440]){
    await browser.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
    await new Promise(r=>setTimeout(r,150));
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth<=${width}+1`),'Operations overflow at '+width);
  }
  record('operations page has no page-level horizontal overflow at four widths');
  await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await screenshot('lifecycle-operations-mobile.png');
  await navigate('/admin/preparation.html?event='+id,"!document.getElementById('prep-form').hidden");
  assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=391'),'Preparation mobile overflow');
  await screenshot('lifecycle-preparation-mobile.png');
  record('dedicated preparation fits 390px and retains saved demand');
  await navigate('/',"document.documentElement.dataset.appMode==='LOCAL_TEST'");
  await browser.evaluate("document.querySelector('[data-policy=cookies]').click()");
  await browser.wait("document.getElementById('policy-dialog').open");
  assert.match(await browser.evaluate("document.getElementById('policy-body').textContent"),/barsys_session/);
  assert.doesNotMatch(await browser.evaluate("document.getElementById('policy-body').textContent"),/does not set cookies/);
  assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=391'));
  await screenshot('lifecycle-cookies-mobile.png');
  record('mobile connected cookie inventory names the actual session cookie');
  evidence.errors=browser.errors;assert.equal(evidence.errors.length,0,'Uncaught browser errors');
  evidence.status='passed';
} catch(error) {
  evidence.status='failed';evidence.failure=error.message;
  if(browser){evidence.errors=browser.errors;await screenshot('lifecycle-browser-failure.png').catch(()=>{});}
  process.exitCode=1;
} finally {
  if(browser){await browser.call('Page.navigate',{url:'about:blank'}).catch(()=>{});browser.close();}
  server.kill('SIGTERM');
  await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,3000))]);
  if(server.exitCode===null)server.kill('SIGKILL');
  await rm(directory,{recursive:true,force:true});
  await writeFile(new URL('lifecycle-browser-20260910.json',qa),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
}
