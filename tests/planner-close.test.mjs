import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../v3.js',import.meta.url),'utf8');
const close=source.slice(source.indexOf('  function closePlanner()'),source.indexOf('  function showRoute('));
for(const restricted of [false,true])test(`planner close restores interaction when history ${restricted?'is restricted':'is available'}`,()=>{
 const events=[],removed=[],background={inert:true};let focused=false,url;
 const context={document:{body:{classList:{remove:x=>removed.push(x)}}},plannerBackground:[background],plannerOpener:{isConnected:true,focus:()=>focused=true},$:()=>({removeAttribute:x=>removed.push(x)}),location:{pathname:'/events',search:'?test=1'},history:{replaceState:(_s,_t,u)=>{if(restricted)throw Object.assign(new Error('opaque origin'),{name:'SecurityError'});url=u;}},emit:x=>events.push(x)};
 vm.runInNewContext(close+';closePlanner();',context);
 assert.equal(background.inert,false);assert.equal(focused,true);assert.ok(removed.includes('aria-modal'));assert.deepEqual(events,['planner_closed']);if(!restricted)assert.equal(url,'/events?test=1');
});
