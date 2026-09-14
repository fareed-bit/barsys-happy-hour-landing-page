// Browser rehearsal of proposal -> accepted event -> operations using isolated data only.
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {createStore} from '../backend/store.mjs';
import {syntheticInquiry,seedSession} from './lifecycle-fixture.mjs';
import {connectCDP} from './cdp-client.mjs';
const root=new URL('../',import.meta.url),qa=new URL('../qa/',import.meta.url);
const directory=await mkdtemp(join(tmpdir(),'barsys-workflow-browser-'));
const filename=join(directory,'isolated.sqlite'),store=await createStore({filename});
const token=await seedSession(store);await store.close();
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const origin=`http://localhost:${port}`,env=Object.fromEntries(['PATH','HOME','TMPDIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(env,{NODE_ENV:'test',BARSYS_DB:filename,PORT:String(port),GOOGLE_CLIENT_ID:'synthetic-local-client',BARSYS_QA_DISABLE_RATE_LIMIT:'1',BARSYS_RECEIPT_DIR:join(directory,'receipts')});
const server=spawn(process.execPath,['backend/server.mjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
const evidence={scope:'Proposal and operations UI on actual backend; isolated SQLite and Chrome',checks:[],screenshots:[],errors:[]};
let browser;const record=(name)=>{evidence.checks.push({name,passed:true});console.log('PASS:',name);};
async function shot(name){const r=await browser.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL(name,qa),Buffer.from(r.data,'base64'));evidence.screenshots.push(name);}
async function nav(path,condition){await browser.call('Page.navigate',{url:origin+path});await browser.wait(`document.documentElement && document.readyState !== 'loading' && location.href === ${JSON.stringify(origin+path)} && (${condition})`);}
const api=async(path,options={})=>{const r=await fetch(origin+path,{...options,headers:{Origin:origin,'Content-Type':'application/json',Cookie:'barsys_session='+token,...options.headers}});const body=await r.json();assert.ok(r.ok,`${path}: ${JSON.stringify(body)}`);return body;};
async function clickTask(id,stage,index){for(let attempt=0;attempt<2;attempt++){await browser.wait(`!!document.querySelector('[data-task="${index}"]')`);await browser.evaluate(`document.querySelector('[data-task="${index}"]').click()`);for(let i=0;i<60;i++){const e=(await api('/api/admin/operations')).state.events[id];if(e.tasks[stage][index].done){await browser.wait(`document.querySelector('[data-task="${index}"]')?.checked===true`);return;}await new Promise(r=>setTimeout(r,50));}}throw Error(`Checklist ${stage}.${index} did not persist`);}
async function advanceTo(id,stage){for(let attempt=0;attempt<3;attempt++){await browser.evaluate("document.querySelector('[data-advance]').click()");for(let i=0;i<40;i++){const e=(await api('/api/admin/operations')).state.events[id];if(e.stage===stage){if(stage<8)await browser.wait("document.querySelector('[data-task=\"0\"]')?.checked===false");return;}await new Promise(r=>setTimeout(r,50));}const message=await browser.evaluate("document.getElementById('message').textContent");if(!message.includes('Operations changed')||attempt===2)throw Error('Advance failed: '+message);await browser.evaluate("location.reload()");await browser.wait("!!document.querySelector('[data-advance]')");}throw Error('Advance failed after concurrency retries');}
try{
 for(let i=0;i<80;i++){try{if((await fetch(origin+'/api/status')).ok)break;}catch{}if(i===79)throw Error('Isolated server unavailable');await new Promise(r=>setTimeout(r,100));}
 browser=await connectCDP(Number(process.env.BARSYS_QA_CHROME_PORT));
 await browser.call('Network.setCookie',{name:'barsys_session',value:token,url:origin,httpOnly:true,sameSite:'Strict'});
 const created=await fetch(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':'workflow-browser-0001'},body:JSON.stringify(syntheticInquiry())});assert.equal(created.status,201);const {id}=await created.json();
 await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await nav('/admin/proposal.html?event='+id,"!document.getElementById('workspace').hidden");
 assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=391'),'Proposal overflow at 390px');
 await browser.evaluate(`(()=>{const set=(k,v)=>{const e=document.querySelector('[data-key="'+k+'"]');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));};set('details.loadIn','16:00');set('details.departure','20:00');set('graceGuests','0');set('taxMilliPercent','8.875');set('expires','2099-09-10');set('depositDue','2099-09-10');document.querySelectorAll('[data-line-key="unitCents"]').forEach((e,i)=>{e.value=i?'100':'0';e.dispatchEvent(new Event('input',{bubbles:true}));});document.querySelectorAll('[data-confirm]').forEach(e=>{if(!e.checked){e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));}});document.getElementById('proposal-form').requestSubmit();})()`);
 await browser.wait("document.getElementById('message').textContent.includes('Proposal saved')");
 assert.match(await browser.evaluate("document.getElementById('readiness').textContent"),/ready to export/);
 await shot('workflow-proposal-mobile.png');record('proposal completes and saves without mobile overflow');
 await browser.evaluate("document.querySelector('[data-step=\"2\"]').click()");
 await browser.wait("!document.getElementById('acceptance').hidden");
 await browser.evaluate("document.getElementById('acceptance-reference').value='SYNTHETIC browser acceptance';document.getElementById('acceptance-reference').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('acceptance-confirmed').checked=true;document.getElementById('acceptance-confirmed').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('review-handoff').click()");
 await browser.wait("!document.getElementById('accept-proposal').hidden");record('acceptance impact review is visible before handoff');
 await browser.evaluate("document.getElementById('accept-proposal').click()");
 await browser.wait("location.pathname==='/admin/operations.html' && !!document.getElementById('flow-next')");
 assert.match(await browser.evaluate("document.querySelector('.event-title h2').textContent"),/SYNTHETIC LIFECYCLE/);
 assert.match(await browser.evaluate("document.getElementById('content').textContent"),/Accepted proposal r1/);record('accepted proposal transfers into event workspace');
 await browser.evaluate(`(()=>{const f=document.getElementById('event-form');f.elements.owner.value='Synthetic QA Owner';f.elements.owner.dispatchEvent(new Event('input',{bubbles:true}));f.elements.target.value='80';f.elements.staffingConfirmed.checked=true;f.elements['planned-0'].value='0';f.elements['planned-1'].value='0';f.elements['planned-2'].value='20';f.elements['planned-3'].value='0';f.elements['planned-4'].value='0';f.requestSubmit();})()`);
 await browser.wait("document.getElementById('message').textContent.includes('Saved')");
 await browser.evaluate("document.querySelector('[data-flow-step=\"1\"]').click()");
 await browser.wait("!!document.getElementById('flow-prep')");
 await browser.evaluate("const f=document.getElementById('flow-prep');f.elements.menuConfirmed.checked=true;f.elements.menuConfirmed.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit()");
 await browser.wait("document.getElementById('message').textContent.includes('Preparation saved')");
 await browser.evaluate("document.querySelector('[data-current-step]').click()");
 for(let i=0;i<2;i++)await clickTask(id,0,i);
 const beforeAdvance=(await api('/api/admin/operations')).state.events[id];assert.equal(beforeAdvance.preparationNeedsReview,false,'Preparation review should clear before advance');
 await advanceTo(id,1);
 const afterAdvance=(await api('/api/admin/operations')).state.events[id];
 await browser.wait("document.querySelector('.flow-intro h2').textContent.includes('Prepare')");record('accepted preparation review and confirm step advance through mobile UI');
 await browser.evaluate("document.querySelector('[data-tab=\"inventory\"]').click()");await browser.wait("document.getElementById('content').textContent.includes('Inventory & equipment')");
 await browser.evaluate("document.querySelector('[data-opening-zero]').click()");await browser.wait("document.getElementById('message').textContent.includes('Saved')");record('opening inventory can be confirmed from mobile workspace');
 await browser.evaluate("document.querySelector('[data-tab=\"events\"]').click()");await browser.wait("!!document.getElementById('flow-next')");
 assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=391'),'Operations event overflow after state changes');await shot('workflow-operations-mobile.png');
 let snapshot=(await api('/api/admin/operations')).state,e=snapshot.events[id];assert.equal(e.stage,1);assert.equal(e.owner,'Synthetic QA Owner');assert.equal(e.acceptedProposalRevision,1);assert.ok(snapshot.openingStockZero);
 record('browser-driven proposal and operations state persists through backend');
 await browser.evaluate(`(()=>{const f=document.getElementById('event-form');for(let i=0;i<7;i++){f.elements['planned-'+i].value=i===2?'20':'0';}f.elements.staffingConfirmed.checked=true;f.elements.staffingConfirmed.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);
 await browser.wait("document.getElementById('message').textContent.includes('Saved')");
 for(let i=0;i<2;i++)await clickTask(id,1,i);
 await advanceTo(id,2);
 const afterPlanAdvance=(await api('/api/admin/operations')).state.events[id];
 await browser.wait("document.querySelector('.flow-intro h2').textContent.includes('Purchase')");record('plan and budget stage advances from mobile UI');
 await browser.evaluate(`(()=>{const f=document.querySelector('.order-form[data-id=""]');f.elements.supplier.value='Synthetic supplier';f.elements.reference.value='QA-ORDER';f.elements.status.value='confirmed';f.elements.amount.value='10';f.elements.notes.value='Browser rehearsal only';f.elements.supplier.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);await browser.wait("document.getElementById('message').textContent.includes('Saved')");
 await browser.evaluate(`(()=>{const f=document.getElementById('receipt-form');const itemSelect=f.querySelector('select[name="item"]');itemSelect.selectedIndex=Array.from(itemSelect.options).findIndex(o=>o.textContent.includes('ml'));if(itemSelect.selectedIndex<1)itemSelect.selectedIndex=2;itemSelect.dispatchEvent(new Event('input',{bubbles:true}));f.elements.supplier.value='Synthetic supplier';f.elements.reference.value='QA-RECEIPT';f.elements.quantity.value='1000';f.elements.cost.value='10';f.elements.paid.value='10';f.requestSubmit();})()`);await new Promise(r=>setTimeout(r,300));
 const purchaseState=(await api('/api/admin/operations')).state;assert.ok(purchaseState.receipts?.some(r=>r.eventId===id),'Receipt save failed: '+await browser.evaluate("document.getElementById('message').textContent"));record('supplier record and stock receipt save through purchase UI');
 // Receipt photo upload at 390px: a tiny PNG through the Purchase & pack form; the thumbnail must render from the owner-only proxy route.
 await browser.wait("document.getElementById('content').textContent.includes('QA-RECEIPT')");
 const png=join(directory,'receipt.png');await writeFile(png,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64'));
 const doc=await browser.call('DOM.getDocument',{depth:0});const fileInput=await browser.call('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#receipt-upload input[name=file]'});assert.ok(fileInput.nodeId,'Receipt upload form missing');await browser.call('DOM.setFileInputFiles',{files:[png],nodeId:fileInput.nodeId});
 await browser.evaluate(`(()=>{const f=document.getElementById('receipt-upload');f.elements.amount.value='42.17';f.elements.supplier.value='Gopuff';f.elements.paidOn.value='2026-09-14';f.elements.note.value='Synthetic receipt';f.elements.amount.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);
 await browser.wait("document.getElementById('message').textContent.includes('Receipt saved')");
 const withReceipt=(await api('/api/admin/operations')).state.events[id];assert.equal(withReceipt.receiptFiles?.length,1);assert.equal(withReceipt.receiptFiles[0].amountCents,4217);assert.equal(withReceipt.receiptFiles[0].contentType,'image/png');
 await browser.evaluate("document.querySelector('[data-card-go=\"1\"]').click()");
 await browser.wait("(()=>{const i=document.querySelector('.section-card:not([hidden]) .receipt-card img');return !!i&&i.complete&&i.naturalWidth>0;})()");
 assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=391'),'Receipt card overflow at 390px');await browser.evaluate("document.querySelector('.section-card:not([hidden]) .receipt-card').scrollIntoView({block:'center'})");await shot('workflow-receipt-mobile.png');
 record('receipt photo uploads through the purchase form and its thumbnail renders at 390px');
 for(let i=0;i<2;i++)await clickTask(id,2,i);
 await advanceTo(id,3);await browser.wait("document.querySelector('.flow-intro h2').textContent.includes('Purchase')");
 snapshot=(await api('/api/admin/operations')).state;const item=snapshot.inventory[0];assert.ok(item&&item.quantity>0,'Receipt did not create inventory');
 await browser.evaluate(`(()=>{const f=document.getElementById('reserve-form');f.elements.itemId.value='${item.id}';f.elements.quantity.value='${Math.min(100,item.quantity)}';f.elements.start.value='2099-09-17T16:00';f.elements.end.value='2099-09-18T01:00';f.elements.itemId.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);await browser.wait("document.getElementById('message').textContent.includes('Saved')");
 await browser.evaluate("document.querySelector('[data-dispatch]').click()");for(let i=0;i<40;i++){const r=(await api('/api/admin/operations')).state.reservations.find(r=>r.eventId===id);if(r?.status==='dispatched')break;if(i===39)throw Error('Dispatch did not persist: '+await browser.evaluate("document.getElementById('message').textContent"));await new Promise(r=>setTimeout(r,50));}await browser.wait("!!document.querySelector('[data-task=\"0\"]')");record('stock reservation and dispatch complete through pack UI');
 for(let i=0;i<2;i++)await clickTask(id,3,i);
 await advanceTo(id,4);await browser.wait("document.querySelector('.flow-intro h2').textContent.includes('Run event')");
 for(const stage of [4,5]){for(let i=0;i<2;i++)await clickTask(id,stage,i);await advanceTo(id,stage+1);}
 await browser.wait("document.querySelector('.flow-intro h2').textContent.includes('Return')");record('arrival and run-event checkpoints advance through mobile UI');
 const load=(await api('/api/admin/operations')).state.reservations.find(r=>r.eventId===id&&r.status==='dispatched');assert.ok(load,'Dispatched load missing before return');
 await browser.evaluate(`(()=>{const f=document.querySelector('.return-form[data-id="${load.id}"]');f.elements.returned.value='${Math.max(0,load.quantity-10)}';f.elements.lost.value='0';f.elements.condition.value='ready';f.elements.note.value='Synthetic browser return';f.elements.returned.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);for(let i=0;i<40;i++){const r=(await api('/api/admin/operations')).state.reservations.find(r=>r.id===load.id);if(r?.status==='returned')break;if(i===39)throw Error('Return failed: '+await browser.evaluate("document.getElementById('message').textContent"));await new Promise(r=>setTimeout(r,50));}record('dispatched stock is received through return UI');
 for(let i=0;i<2;i++)await clickTask(id,6,i);await advanceTo(id,7);
 await browser.evaluate(`(()=>{const f=document.getElementById('event-form');for(let i=0;i<7;i++){f.elements['actual-'+i].value=i===2?'20':'0';}f.elements.actualHoursConfirmed.checked=true;f.elements.actualHoursConfirmed.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);await browser.wait("document.getElementById('message').textContent.includes('Saved')");
 const proposal=await api('/api/admin/inquiries/'+id+'/proposal');const total=proposal.calculation.totalCents;
 await browser.evaluate(`(()=>{const f=document.getElementById('payment-form');f.elements.kind.value='payment';f.elements.amount.value='${total/100}';f.elements.date.value='2099-09-18';f.elements.reference.value='QA-FULL-PAYMENT';f.elements.amount.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();})()`);await browser.wait("document.getElementById('message').textContent.includes('Saved')");
 for(let i=0;i<2;i++)await clickTask(id,7,i);await advanceTo(id,8);
 await browser.wait("document.getElementById('content').textContent.includes('Financially closed')");assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=391'),'Closed event overflow at 390px');await shot('workflow-closeout-mobile.png');record('return, payment reconciliation and financial closeout complete through mobile UI');
 evidence.errors=browser.errors;assert.equal(evidence.errors.length,0,'Uncaught browser errors');evidence.status='passed';
}catch(error){evidence.status='failed';evidence.failure=error.message;if(browser){evidence.errors=browser.errors;await shot('workflow-browser-failure.png').catch(()=>{});}process.exitCode=1;
}finally{
 if(browser){await browser.call('Page.navigate',{url:'about:blank'}).catch(()=>{});browser.close();}
 server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,3000))]);if(server.exitCode===null)server.kill('SIGKILL');
 await rm(directory,{recursive:true,force:true});await writeFile(new URL('workflow-browser-20260910.json',qa),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}
