import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../privacy.js',import.meta.url),'utf8');
const key='barsys-privacy-v38',draft='barsys-local-draft-v38';
const now=1800000000000;
function run(seed={},blocked=false){
 const data=new Map(Object.entries(seed)),nodes=new Map(),events={};
 const document={querySelector(s){if(!nodes.has(s))nodes.set(s,{addEventListener(){},focus(){},close(){},showModal(){}});return nodes.get(s);},addEventListener(){},dispatchEvent(){}};
 const window={BARSYS:{storageKey:draft},addEventListener(n,f){events[n]=f;}};
 const localStorage={getItem(k){if(blocked)throw Error('blocked');return data.get(k)??null;},setItem(k,v){if(blocked)throw Error('blocked');data.set(k,v);},removeItem(k){if(blocked)throw Error('blocked');data.delete(k);}};
 vm.runInNewContext(source,{window,document,localStorage,Date:{now:()=>now},CustomEvent:class{}});
 return {api:window.BarsysPrivacy,data,events};
}
const consent=JSON.stringify({version:1,rememberSelections:true,decided:true,expiresAt:now+10000});
test('draft writes require opt-in and preserve unrelated storage',()=>{const {api,data}=run({unrelated:'keep',[draft]:'old'});api.saveDraft({guests:50});assert(!data.has(draft));assert.equal(data.get('unrelated'),'keep');});
test('draft whitelist excludes contact and permission fields',()=>{const {api,data}=run();api.save({rememberSelections:true});api.saveDraft({guests:65,menus:['signature'],menuMode:'recommend',details:{name:'PRIVATE',email:'private@example.com'},name:'PRIVATE',photoPreference:'ask',marketingInterest:'yes'});const saved=JSON.parse(data.get(draft));assert.equal(saved.guests,65);assert.equal(saved.menuMode,'recommend');assert(!data.get(draft).includes('PRIVATE'));assert(!('photoPreference'in saved));assert.equal(saved.expiresAt,now+30*86400000);});
test('unexpired draft restores and expired draft is removed',()=>{const saved=JSON.stringify({version:3,guests:65,expiresAt:now+1000});assert.equal(run({[key]:consent,[draft]:saved}).api.loadDraft().guests,65);const expired=run({[key]:consent,[draft]:JSON.stringify({version:3,expiresAt:now-1})});assert.equal(expired.api.loadDraft(),null);assert(!expired.data.has(draft));});
test('expired consent removes draft without clearing unrelated keys',()=>{const {api,data}=run({[key]:JSON.stringify({version:1,rememberSelections:true,expiresAt:now-1}),[draft]:'old',other:'keep'});assert.equal(api.can('rememberSelections'),false);assert(!data.has(draft));assert.equal(data.get('other'),'keep');});
test('withdrawal deletes draft; cross-tab withdrawal also revokes saving',()=>{const {api,data,events}=run({[key]:consent,[draft]:'old'});events.storage({key,newValue:null});api.saveDraft({guests:80});assert(!data.has(draft));assert.equal(api.can('rememberSelections'),false);api.save({rememberSelections:true});api.saveDraft({guests:80});api.save({rememberSelections:false});assert(!data.has(draft));});
test('blocked storage keeps the page usable without persistence',()=>{const {api}=run({},true);assert.equal(api.get().storageAvailable,false);assert.doesNotThrow(()=>api.save({rememberSelections:true}));assert.doesNotThrow(()=>api.saveDraft({guests:65}));assert.equal(api.loadDraft(),null);});
