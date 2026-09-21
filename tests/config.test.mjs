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
  for(const [id,p] of Object.entries(c.packages)){
    assert.ok(p.rate>0 && Number.isInteger(p.rate),`${id} needs a whole-dollar per-guest rate`);
    if(p.bringsOwnBar){
      assert.equal(p.menuLimit,0,`${id} brings its own bar, so it carries no Barsys menus`);
      assert.ok(Array.isArray(p.addonIds)&&p.addonIds.every(x=>c.addons.some(a=>a.id===x)),`${id} offers an unknown add-on`);
      assert.ok(Number.isInteger(p.guestsPerStation)&&p.guestsPerStation>0,`${id} needs a guests-per-station ratio`);
      assert.ok(typeof p.howItWorks==='string'&&p.howItWorks.length>0,`${id} needs a howItWorks line`);
      assert.ok(typeof p.badge==='string'&&p.badge.length>0,`${id} renders as a banner and needs a badge`);
      assert.ok(typeof p.tagline==='string'&&p.tagline.length>0,`${id} renders as a banner and needs a tagline`);
      assert.ok(p.tagline.length<=200,`${id}'s banner tagline must stay short enough to keep the banner to two lines`);
    } else {
      assert.ok(p.menuLimit>0 && p.menuLimit<=c.menus.length);
    }
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

// An add-on that is included with a package renders includedNotes[tier] instead of its
// description. collins shipped with includedIn but no includedNotes, which threw
// "Cannot read properties of undefined" for every Reserve plan the moment the add-ons
// were rendered in the deck rather than only in the Customize sheet.
test('every add-on included with a package explains the inclusion for that package',()=>{
  for(const a of c.addons)
    for(const tier of a.includedIn||[]){
      assert.ok(Object.hasOwn(c.packages,tier),`${a.id} is included in unknown package ${tier}`);
      assert.equal(typeof a.includedNotes?.[tier],'string',`${a.id} has no includedNotes for ${tier}`);
      assert.ok(a.includedNotes[tier].trim().length>0,`${a.id} has an empty includedNote for ${tier}`);
    }
});

// Add-on cards render includes[] as a bullet list; an add-on without one silently falls
// back to its description paragraph, which is the layout this replaced.
test('every add-on lists what it includes',()=>{
  for(const a of c.addons){
    assert.ok(Array.isArray(a.includes)&&a.includes.length>=2,`${a.id} has no includes list`);
    for(const item of a.includes){
      assert.equal(typeof item,'string');
      assert.ok(item.trim().length>0,`${a.id} has an empty include`);
      assert.ok(!item.trim().endsWith('.'),`${a.id} include should not end in a period: ${item}`);
    }
  }
});

// setHours and setAddon find the hourly by the extendsService flag, so each package needs
// exactly one: none and the service-time dropdown charges nothing, two and they fight.
test('every package offers exactly one add-on that extends service time',()=>{
  const offered=tier=>c.addons.filter(a=>{
    const p=c.packages[tier];
    return (!p.addonIds||p.addonIds.includes(a.id))&&(!a.packageIds||a.packageIds.includes(tier));
  });
  for(const tier of Object.keys(c.packages)){
    const hourly=offered(tier).filter(a=>a.extendsService);
    assert.equal(hourly.length,1,`${tier} offers ${hourly.length} service-time add-ons: ${hourly.map(a=>a.id)}`);
    assert.equal(hourly[0].unit,'hour',`${tier}'s service-time add-on must be priced by the hour`);
  }
  for(const a of c.addons)
    for(const tier of a.packageIds||[])
      assert.ok(Object.hasOwn(c.packages,tier),`${a.id} names unknown package ${tier}`);
});

// A minimum only means anything below the headcount where the rate overtakes it, and it must
// sit inside the range the planner can quote, or it is either dead or always on.
test('a package minimum fee bites below a real headcount inside the quotable range',()=>{
  for(const [id,p] of Object.entries(c.packages)){
    if(!Number.isFinite(p.minimumFee))continue;
    assert.ok(p.minimumFee>0&&Number.isInteger(p.minimumFee),`${id} minimumFee must be whole dollars`);
    const breakEven=p.minimumFee/p.rate;
    assert.ok(breakEven>c.minGuests,`${id}'s minimum never applies: ${p.rate}/guest clears it by ${c.minGuests} guests`);
    assert.ok(breakEven<c.maxGuests,`${id}'s minimum applies at every quotable size, so it is the price, not a floor`);
  }
});
