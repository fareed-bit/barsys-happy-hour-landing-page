import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seoSettings,robotsText,llmsText,decorate,sitePages,INDEXNOW_KEY} from '../backend/site-seo.mjs';
const on=seoSettings({origin:'https://events.barsys.com',indexing:'1',local:false,staging:false});
const off=seoSettings({origin:'https://events.barsys.com',indexing:'0',local:false,staging:false});
test('robots allows Google and the AI crawlers only when indexing is enabled',()=>{
 assert.equal(robotsText(off),'User-agent: *\nDisallow: /\n');
 const r=robotsText(on);
 for(const ua of ['GPTBot','OAI-SearchBot','ClaudeBot','PerplexityBot','Google-Extended','Applebot-Extended','Bingbot'])assert.ok(r.includes(`User-agent: ${ua}\nAllow: /`),ua);
 assert.ok(r.includes('Disallow: /admin/')&&r.includes('Disallow: /api/')&&r.includes('Sitemap: https://events.barsys.com/sitemap.xml'));
});
test('llms.txt states the fixed facts and links the related Barsys sites',()=>{
 const t=llmsText(on);
 for(const s of ['Classic $55','Signature $85','Reserve $225','Two-hour service baseline','20-guest minimum','fareed@barsys.com','https://happyhours.barsys.com/','An inquiry is not a booking','/site/brand-activations.html'])assert.ok(t.includes(s),s);
 assert.ok(!/review|rating|Netflix|TikTok/i.test(t),'no unverifiable claims');
});
test('event pages carry FAQPage and Service schema with the three fixed offers; the Organization links both sites',()=>{
 for(const slug of ['events','corporate-events','brand-activations','holiday-parties','private-events','zero-proof-events']){
  const page=sitePages.find(p=>p.slug===slug);assert.ok(page,slug);assert.ok(page.faq.length>=4&&page.service.name,slug);
  const html=decorate(readFileSync(new URL(`../site/${slug}.html`,import.meta.url),'utf8'),`/site/${slug}.html`,on);
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1].replace(/\\u003c/g,'<'))['@graph'];
  const types=graph.map(g=>g['@type']);
  for(const t of ['Organization','BreadcrumbList','FAQPage','Service'])assert.ok(types.includes(t),`${slug} ${t}`);
  const org=graph.find(g=>g['@type']==='Organization');assert.ok(org.sameAs.includes('https://happyhours.barsys.com/')&&org.sameAs.includes('https://barsys.com/'));
  const offers=graph.find(g=>g['@type']==='Service').hasOfferCatalog.itemListElement.map(o=>o.priceSpecification.price);assert.deepEqual(offers,[55,85,225]);
  assert.equal(graph.find(g=>g['@type']==='FAQPage').mainEntity.length,page.faq.length);
  assert.ok(html.includes('<meta name="robots" content="index,follow">'));
  assert.ok(/<details><summary>/.test(html),'FAQ rendered on page');
 }
});
test('IndexNow key is a 32-hex constant served at the root',()=>{assert.match(INDEXNOW_KEY,/^[0-9a-f]{32}$/);const server=readFileSync(new URL('../backend/server.mjs',import.meta.url),'utf8');assert.ok(server.includes("'/'+INDEXNOW_KEY+'.txt'"));assert.ok(server.includes("'/llms.txt'"));});
