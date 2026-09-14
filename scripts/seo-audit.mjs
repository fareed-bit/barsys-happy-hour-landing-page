// One-off SEO audit: enumerates every path in sitePaths, decorates each,
// and reports title/meta/canonical/OG/schema/heading coverage.
import {seoSettings, sitemap, sitePaths, decorate} from '../backend/site-seo.mjs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const ORIGIN = 'https://happyhours.barsys.com';
const seo = seoSettings({origin: ORIGIN, indexing: '1', staging: false, local: false});

const root = resolve(process.cwd());
const rows = [];
const titles = new Map(), descriptions = new Map();

for (const path of [...sitePaths].sort()) {
  const file = path === '/' ? 'index.html' : path.replace(/^\//, '');
  let html;
  try { html = await readFile(resolve(root, file), 'utf8'); }
  catch (e) { rows.push({path, error: 'file missing: ' + file}); continue; }

  const decorated = decorate(html, path, seo);

  // Extract signals
  const title = (decorated.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1].trim();
  const desc  = (decorated.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const robots = (decorated.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const canonical = (decorated.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [,''])[1];
  const ogTitle = (decorated.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const ogDesc  = (decorated.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const ogImage = (decorated.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const ogUrl   = (decorated.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const ogType  = (decorated.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
  const twitter = /name=["']twitter:card["']/i.test(decorated);
  const schemaBlocks = [...decorated.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean);
  const h1Count = (decorated.match(/<h1[\s>]/gi) || []).length;
  const imgs = [...decorated.matchAll(/<img\b([^>]*)>/gi)].map(m => m[1]);
  const imgsNoAlt = imgs.filter(a => !/\balt\s*=/i.test(a)).length;

  // Track duplicates
  if (title) titles.set(title, (titles.get(title) || 0) + 1);
  if (desc)  descriptions.set(desc, (descriptions.get(desc) || 0) + 1);

  rows.push({
    path, title, titleLen: title.length,
    desc, descLen: desc.length,
    robots, canonical,
    ogTitle: !!ogTitle, ogDesc: !!ogDesc, ogImage: !!ogImage, ogUrl, ogType,
    twitter,
    schemas: schemaBlocks.map(s => s['@type'] || 'unknown'),
    h1Count, imgTotal: imgs.length, imgsNoAlt
  });
}

// Pretty print
console.log('# SEO audit — ' + rows.length + ' paths\n');
console.log('| Path | Title (len) | Desc len | Canonical | og:image | og:type | Schema | H1 | imgs (no alt) |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  if (r.error) { console.log(`| ${r.path} | ERROR: ${r.error} | | | | | | | |`); continue; }
  const canonOk = r.canonical === `${ORIGIN}${r.path === '/' ? '/' : r.path}`;
  console.log(`| ${r.path} | ${r.title.substring(0,60)} (${r.titleLen}) | ${r.descLen} | ${canonOk?'✓':'✗ '+r.canonical} | ${r.ogImage?'✓':'✗'} | ${r.ogType||'✗'} | ${r.schemas.join(',')||'✗'} | ${r.h1Count} | ${r.imgTotal} (${r.imgsNoAlt}) |`);
}

// Duplicate report
console.log('\n## Duplicate titles');
const dupTitles = [...titles.entries()].filter(([,c]) => c > 1);
if (dupTitles.length === 0) console.log('None.');
else dupTitles.forEach(([t,c]) => console.log(`- (${c}×) ${t}`));

console.log('\n## Duplicate descriptions');
const dupDescs = [...descriptions.entries()].filter(([,c]) => c > 1);
if (dupDescs.length === 0) console.log('None.');
else dupDescs.forEach(([d,c]) => console.log(`- (${c}×) ${d.substring(0,80)}...`));

// Aggregate issues
console.log('\n## Issues summary');
const issues = [];
rows.forEach(r => {
  if (r.error) issues.push([r.path, 'file missing']);
  if (r.titleLen === 0) issues.push([r.path, 'missing title']);
  else if (r.titleLen < 20) issues.push([r.path, `title too short (${r.titleLen} chars)`]);
  else if (r.titleLen > 65) issues.push([r.path, `title too long (${r.titleLen} chars)`]);
  if (r.descLen === 0) issues.push([r.path, 'missing description']);
  else if (r.descLen < 70) issues.push([r.path, `description too short (${r.descLen} chars)`]);
  else if (r.descLen > 165) issues.push([r.path, `description too long (${r.descLen} chars)`]);
  if (!r.canonical) issues.push([r.path, 'no canonical']);
  if (!r.ogImage) issues.push([r.path, 'no og:image']);
  if (!r.ogType) issues.push([r.path, 'no og:type']);
  if (r.h1Count !== 1) issues.push([r.path, `h1 count = ${r.h1Count} (want 1)`]);
  if (r.imgsNoAlt > 0) issues.push([r.path, `${r.imgsNoAlt}/${r.imgTotal} images missing alt`]);
});
if (issues.length === 0) console.log('None.');
else issues.forEach(([p, m]) => console.log(`- ${p}: ${m}`));

console.log('\n## Runtime robots.txt (under production SEO)');
console.log('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ' + ORIGIN + '/sitemap.xml');

console.log('\n## Sitemap URL count');
console.log((sitemap(seo).match(/<loc>/g) || []).length + ' URLs');
