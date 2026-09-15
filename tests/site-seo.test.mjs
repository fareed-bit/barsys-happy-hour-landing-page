import test from 'node:test';import assert from 'node:assert/strict';
import {seoSettings,sitemap,decorate,sitePaths} from '../backend/site-seo.mjs';
test('indexing fails closed in local and staging; sitemap excludes private routes',()=>{
 for(const options of [{local:true},{staging:true},{indexing:'0'}]){const s=seoSettings({origin:'https://example.com',indexing:'1',local:false,staging:false,...options});assert.equal(s.enabled,false);assert.ok(!sitemap(s).includes('<loc>'));}
 const s=seoSettings({origin:'https://example.com',indexing:'1',local:false,staging:false});assert.ok(sitemap(s).includes('https://example.com/site/classic.html'));assert.ok(!sitemap(s).includes('/admin'));assert.equal(sitePaths.size,37);
});
test('canonical and schema use configured origin; robots only changed when explicitly enabled',()=>{
 const html='<head><meta name="robots" content="noindex,nofollow"></head>';
 assert.match(decorate(html,'/site/about.html',{origin:'https://example.com',enabled:false}),/noindex/);
 const out=decorate(html,'/site/about.html',{origin:'https://example.com',enabled:true});assert.match(out,/content="index,follow"/);assert.match(out,/href="https:\/\/example.com\/site\/about.html"/);assert.match(out,/application\/ld\+json/);
});
