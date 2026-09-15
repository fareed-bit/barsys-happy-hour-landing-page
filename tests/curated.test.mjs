import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const box={window:{}};
for(const file of ['config.js','media.config.js'])vm.runInNewContext(readFileSync(resolve(root,file),'utf8'),box);
const C=box.window.BARSYS,M=box.window.BARSYS_MEDIA;
const html=readFileSync(resolve(root,'index.html'),'utf8');
test('V3.7: eight full films, with all four NYC uploads represented',()=>{
 assert.equal(Object.keys(M).length,8);
 for(const n of [1,2,3,4])assert.ok(Object.values(M).some(m=>m.sourceFiles.includes(`Barseys_NYC_Deliverable${n}.mp4`)));
});
test('V3.7: hero and experience source files do not overlap',()=>{
 const hero=new Set(['hero','office','gala'].flatMap(k=>M[k].sourceFiles));
 for(const m of Object.values(M).filter(m=>m.family==='experience'))for(const source of m.sourceFiles)assert.ok(!hero.has(source));
});
test('V3.7: inline loops and complete films are separate local assets',()=>{
 for(const [key,m] of Object.entries(M)){
  for(const name of ['src','poster'])assert.ok(existsSync(resolve(root,m[name])));
  if(key==='occasion')continue;
  assert.ok(m.previewSrc!==m.src);
  assert.ok(existsSync(resolve(root,m.previewSrc)));
 }
});
test('V3.7: media cases are labeled by their actual context',()=>{
 assert.ok(html.includes('BUZZFEED / OFFICE HAPPY HOUR'));
 assert.ok(html.includes('SCARSDALE LIBRARY / GALA'));
 assert.ok(!html.includes('PARK TERRACE / CITY MOMENT'),'the Park Terrace still left the hero on 2026-09-14; it stays in the photo lightbox via config.gallery');
 assert.ok(M.occasion.description.includes('not standard happy-hour package inclusions'));
 assert.equal(M.hero.sourceStatus,'curated-upload');
});
test('two hero scenes (NYC film, BuzzFeed office), four experience previews and six photo cards',()=>{
 assert.equal((html.match(/data-scene="\d"/g)||[]).length,2);
 assert.equal((html.match(/data-go-scene="\d"/g)||[]).length,2);
 assert.ok(html.includes('<span>/ 02</span>'));
 assert.equal((html.match(/data-experience-video=/g)||[]).length,4);
 assert.equal((html.match(/class="snapshot-card"/g)||[]).length,6);
});
test('V3.7: all lightbox photos have a matching local source',()=>{
 assert.equal(C.gallery.length,9);
 assert.equal(new Set(C.gallery.map(g=>g.image)).size,C.gallery.length);
 for(const item of C.gallery)assert.ok(existsSync(resolve(root,C.assets[item.image].local)));
 const skyline=C.gallery.findIndex(g=>g.image==='skylineToast');assert.ok(skyline>=0);
});
