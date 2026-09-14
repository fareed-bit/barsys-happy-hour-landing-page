import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const sandbox={window:{}};
vm.runInNewContext(readFileSync(resolve(root,'config.js'),'utf8'),sandbox);
const c=sandbox.window.BARSYS;
test('Public single-event rates are preserved',()=>{
  assert.equal(c.packages.classic.rate,55);
  assert.equal(c.packages.signature.rate,85);
  assert.equal(c.packages.reserve.rate,225);
});
test('27 distinct collections and eight featured collections',()=>{
  assert.equal(c.menus.length,27);
  assert.equal(new Set(c.menus.map(x=>x.id)).size,27);
  assert.equal(c.menus.filter(x=>x.featured).length,8);
  for(const m of c.menus.filter(x=>x.image))assert.ok(c.assets[m.image]);
});
test('Guest limits and menu limits are internally consistent',()=>{
  assert.ok(c.defaultGuests>=c.minGuests && c.defaultGuests<=c.maxGuests);
  for(const p of Object.values(c.packages)){
    assert.ok(p.rate>0 && Number.isInteger(p.rate));
    assert.ok(p.menuLimit>0 && p.menuLimit<=c.menus.length);
  }
});
test('Tax rule is explicitly unconfirmed in V3.6',()=>{assert.equal(c.quoteRules.taxMode,'confirm');});
test('Artwork is either bundled or uses an official Barsys CDN URL',()=>{
  for(const asset of Object.values(c.assets)){
    if(asset.officialMixlist){assert.ok(asset.remote.startsWith('https://media.barsys.com/'));assert.ok(asset.sourcePage.startsWith('https://'));}else{assert.equal(asset.remote,asset.local);assert.ok(existsSync(resolve(root,asset.local)));}
    assert.ok(asset.local.startsWith('assets/'));
    assert.ok(asset.alt.length>15);
  }
});
test('Local-only security and no analytics or request code',()=>{
  const html=readFileSync(resolve(root,'index.html'),'utf8');
  const js=readFileSync(resolve(root,'app.js'),'utf8');
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.includes("form-action 'none'"));
  assert.ok(html.includes('noindex,nofollow'));
  assert.ok(!/googletagmanager|google-analytics|stripe\.com|zapier\.com/i.test(html));
  const codeWithoutComments=js.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  assert.ok(!/\bfetch\s*\(/.test(codeWithoutComments));
  assert.ok(!/sendBeacon|XMLHttpRequest|WebSocket/.test(codeWithoutComments));
});
test('Required source files are available',()=>{
  for(const file of ['index.html','styles.css','app.js','config.js','assets.available.js','scripts/server.mjs','events.css','media.config.js','motion.js','scripts/build-preview.mjs'])assert.ok(existsSync(resolve(root,file)));
});
