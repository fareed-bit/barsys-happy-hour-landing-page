import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {emptyOperations,defaultEvent,applyOperation} from '../backend/operations.mjs';
import {closeoutLabel,recordGaps} from '../admin/workflow-model.js';
const id='00000000-0000-4000-8000-000000000001';
test('closeout requires exact gross invoice settlement and rejection leaves state intact',()=>{
 const s=emptyOperations(),e=s.events[id]=defaultEvent();Object.assign(e,{stage:7,owner:'QA',revenueCents:10000,invoiceTotalCents:11000,staffingConfirmed:true,actualHoursConfirmed:true,leftoverCents:0,stockUsedCents:0});e.tasks[7].forEach(t=>t.done=true);e.expenses.forEach(x=>x.actualCents=0);
 for(const amount of [0,10000,12000]){e.payments=[{kind:'payment',amountCents:amount}];const before=structuredClone(s);assert.throws(()=>applyOperation(s,{action:'advance',payload:{eventId:id}},'QA'),/client balance/);assert.deepEqual(s,before);}
 e.payments=[{kind:'payment',amountCents:11000}];assert.equal(applyOperation(s,{action:'advance',payload:{eventId:id}},'QA').events[id].stage,8);
 e.payments.push({kind:'refund',amountCents:100});assert.throws(()=>applyOperation(s,{action:'advance',payload:{eventId:id}},'QA'),/client balance/);
});
test('legacy closed records and current gaps identify unsettled payments',()=>{
 assert.match(closeoutLabel({payments:{balanceCents:10}}),/unresolved/);assert.equal(closeoutLabel({payments:{balanceCents:0}}),'Financially closed');assert.ok(recordGaps({stage:7,owner:'QA',revenueCents:100},{actualComplete:true,payments:{balanceCents:100}},[]).some(x=>x.includes('client balance')));
});
test('navigation follows server role across owner, crew, visitor and unknown roles',async()=>{
 const dash={},login={},logout={},identity={};let user;
 const context={location:{protocol:'https:'},fetch:async()=>({ok:true,json:async()=>({user})}),CustomEvent:class{},document:{querySelector:()=>null,querySelectorAll:s=>({'[data-staff-dashboard]':[dash],'[data-staff-login]':[login],'[data-staff-logout]':[logout],'[data-staff-identity]':[identity]}[s]||[]),addEventListener(){},dispatchEvent(){}},window:{addEventListener(){}}};
 vm.runInNewContext(readFileSync(new URL('../staff-auth.js',import.meta.url),'utf8'),context);
 for(const role of ['owner','crew',null,'other']){user=role?{role,email:'test@example.com'}:null;await context.window.BarsysStaff.refresh();assert.equal(dash.hidden,!['owner','crew'].includes(role));assert.equal(login.hidden,!!user);if(role==='crew'){assert.equal(dash.textContent,'My assignments');assert.equal(dash.href,'/admin/crew.html');}if(role==='owner'){assert.equal(dash.textContent,'Dashboard');assert.equal(dash.href,'/admin');}}
});
