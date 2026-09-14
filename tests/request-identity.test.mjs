import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress} from '../backend/request-identity.mjs';
const req=value=>({socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-for':value}});
test('forwarded identities require explicit trust and ignore spoofed prefixes',()=>{
 assert.equal(clientAddress(req('198.51.100.9')),'127.0.0.1');
 assert.equal(clientAddress(req('192.0.2.10, 198.51.100.9'),1),'198.51.100.9');
 assert.equal(clientAddress(req('192.0.2.11, 198.51.100.9'),1),'198.51.100.9');
 assert.equal(clientAddress(req('192.0.2.10, 198.51.100.9, 203.0.113.1'),2),'198.51.100.9');
 assert.equal(clientAddress(req('bad, 198.51.100.9'),1),'127.0.0.1');
 assert.equal(clientAddress(req('198.51.100.9'),2),'127.0.0.1');
 assert.throws(()=>clientAddress(req(''),-1));
});
