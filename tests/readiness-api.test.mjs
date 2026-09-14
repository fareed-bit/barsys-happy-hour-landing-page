import test from 'node:test';
import assert from 'node:assert/strict';
import {createAPI} from '../backend/api.mjs';
import {startFixture} from './lifecycle-fixture.mjs';

test('readiness checks the database without requiring a login or returning event data',async t=>{
 const f=await startFixture();t.after(f.close);
 const result=await f.request('/api/ready',{anonymous:true});
 assert.equal(result.status,200);assert.deepEqual(result.body,{ready:true});
});
test('readiness returns unavailable without leaking database failure details',async()=>{
 const api=createAPI({store:{async checkHealth(){throw Error('private database address and credentials');}},auth:{},origin:'http://localhost'});
 let status,body,headers;
 const handled=await api({url:'/api/ready',method:'GET',headers:{}},{writeHead(s,h){status=s;headers=h;},end(v){body=JSON.parse(v);}});
 assert.equal(handled,true);assert.equal(status,503);assert.deepEqual(body,{ready:false});assert.equal(headers['Cache-Control'],'no-store');
});
