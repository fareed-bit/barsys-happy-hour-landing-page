import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchHTML,patchPrivacy,patchSEO,patchServer} from '../deploy/apex-analytics-20261022/patch.mjs';
test('production overlay preserves current HTML and narrows its additions to Apex',()=>{
 const html='<head><meta content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'" http-equiv="Content-Security-Policy"><script src="collins-panel.js"></script></head><body>guided-production-wizard</body>';
 const result=patchHTML(html);
 assert.ok(result.includes('guided-production-wizard'));
 assert.ok(result.includes('<script src="collins-panel.js"></script>'));
 assert.ok(result.includes("script-src 'self' 'unsafe-inline' https://apex.barsys.com"));
 assert.ok(result.includes('connect-src https://apex.barsys.com'));
 assert.ok(result.includes("form-action 'none'"));
 assert.equal(patchHTML(result),result);
 assert.throws(()=>patchHTML('<head></head>'));
});
test('production SEO overlay retains directory paths and remains idempotent',()=>{
 const old='const path=p=>`/site/${p.slug}.html`;';
 const patched=patchSEO(old);
 const path=Function(patched+'return path;')();
 assert.equal(path({slug:'blog/'}),'/site/blog/');
 assert.equal(path({slug:'events'}),'/site/events.html');
 assert.equal(patchSEO(patched),patched);
 assert.throws(()=>patchSEO('unreviewed source'));
});
test('production blog directory maps only to its public HTML file',()=>{
 const old="const relative=path==='/'?'index.html':path==='/admin'||path==='/admin/'?'admin/index.html':path.slice(1);";
 const patched=patchServer(old);
 const route=Function('path',patched+'return relative;');
 for(const [path,file] of [['/','index.html'],['/site/blog/','site/blog/index.html'],['/admin/','admin/index.html'],['/backend/server.mjs','backend/server.mjs']])assert.equal(route(path),file);
 assert.equal(patchServer(patched),patched);
 assert.throws(()=>patchServer('unknown mapping'));
});
test('production notice patch is idempotent and refuses an unreviewed notice',()=>{
 const old=readFileSync(new URL('../runtime-content.js',import.meta.url),'utf8');
 const patched=patchPrivacy(old);
 assert.equal(patchPrivacy(patched),patched);
 assert.ok(patched.includes('_apex_analytics_allowed'));
 assert.ok(patched.includes('Global Privacy Control'));
 assert.throws(()=>patchPrivacy('Different notice'));
});

test('reviewed old notice gains consent/storage text without removing surrounding policy',()=>{
 const old='BEFORE No analytics, advertising pixel, session replay or third-party event-video player is installed. Optional planner storage is separate; no analytics or advertising tags are installed. <p>Use <button class="policy-inline" type="button" data-open-privacy> AFTER';
 const result=patchPrivacy(old);
 assert.ok(result.startsWith('BEFORE '));assert.ok(result.endsWith(' AFTER'));
 for(const text of ['off by default','form field values','_apex_sid','Global Privacy Control'])assert.ok(result.includes(text));
 assert.ok(!result.includes('No analytics,'));
});
