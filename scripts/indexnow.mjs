// Ping IndexNow (Bing, Yandex, Naver, Seznam; consumed by Bing-powered AI search) with every public URL.
// Usage: node scripts/indexnow.mjs https://events.barsys.com   (only after DNS is live and indexing is enabled)
import {readFileSync} from 'node:fs';
import {INDEXNOW_KEY} from '../backend/site-seo.mjs';
const origin=process.argv[2];
if(!origin||!/^https:\/\//.test(origin)){console.error('Usage: node scripts/indexnow.mjs https://<public-host>');process.exit(2);}
const pages=JSON.parse(readFileSync(new URL('../site/pages.json',import.meta.url),'utf8'));
const urlList=[origin+'/',...pages.map(p=>`${origin}/site/${p.slug}.html`)];
const body={host:new URL(origin).host,key:INDEXNOW_KEY,keyLocation:`${origin}/${INDEXNOW_KEY}.txt`,urlList};
const res=await fetch('https://api.indexnow.org/IndexNow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(body)});
console.log(`IndexNow ${res.status} for ${urlList.length} URLs on ${body.host}`);
if(res.status>=400){console.error(await res.text());process.exit(1);}
