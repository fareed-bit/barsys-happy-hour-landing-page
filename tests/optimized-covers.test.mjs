import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
test('optimized covers retain exact originals, source mappings and verified working bytes',()=>{
 const records=JSON.parse(read('reference/cover-optimization.json'));const s={window:{}};vm.runInNewContext(read('config.js').toString(),s);
 assert.equal(records.length,8);
 for(const r of records){
 assert.equal(r.source,s.window.BARSYS.assets[r.key].remote);
 for(const [path,hash] of [[r.path,r.workingSha256],[r.original,r.originalSha256]])assert.equal(crypto.createHash('sha256').update(read(path)).digest('hex'),hash,path);
 assert(r.workingBytes<=r.originalBytes);assert(r.dimensions.every(n=>n>0&&n<=960));
 }
});
