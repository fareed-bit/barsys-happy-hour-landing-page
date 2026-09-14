import {readFileSync} from 'node:fs';
export const sitePages=JSON.parse(readFileSync(new URL('../site/pages.json',import.meta.url),'utf8'));
export const sitePaths=new Set(['/',...sitePages.map(p=>`/site/${p.slug}.html`)]);
const xml=s=>s.replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
export function seoSettings({origin,indexing,staging,local}){
 const url=new URL(origin);return {origin:url.origin,enabled:indexing==='1'&&!staging&&!local&&url.protocol==='https:'};
}
export function sitemap(settings){return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${settings.enabled?[...sitePaths].map(p=>`<url><loc>${xml(settings.origin+p)}</loc></url>`).join(''):''}</urlset>`;}
export function decorate(html,path,settings){
 const url=settings.origin+path;
 const page=sitePages.find(p=>`/site/${p.slug}.html`===path);
 const pick=re=>(html.match(re)||[,''])[1];
 const title=page?`${page.title} | Barsys Happy Hours`:pick(/<title[^>]*>([^<]*)<\/title>/i).replace(/&amp;/g,'&');
 const description=page?page.description:pick(/<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']*)["']/i);
 const image=settings.origin+(page?.image||'/assets/lineup.jpg');
 const has=name=>new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'])`,'i').test(html);
 const meta=[['og:url',url],['og:type','website'],['og:site_name','Barsys Happy Hours'],['og:locale','en_US'],['og:title',title],['og:description',description],['og:image',image],['og:image:alt',page?`${page.title} — Barsys Happy Hours`:'Barsys cocktail machines and glassware lined up for an office happy hour'],['twitter:card','summary_large_image'],['twitter:title',title],['twitter:description',description],['twitter:image',image]];
 if(!page?.image)meta.push(['og:image:width','1920'],['og:image:height','899']);
 const tags=meta.filter(([name,value])=>value&&!has(name)).map(([name,value])=>`<meta ${name.startsWith('twitter:')?'name':'property'}="${name}" content="${xml(value)}">`).join('');
 const schema={'@context':'https://schema.org','@type':'Organization',name:'Barsys Inc.',url:settings.origin,email:'fareed@barsys.com',logo:settings.origin+'/assets/barsys-logo.png',image,address:{'@type':'PostalAddress',streetAddress:'44 W 37th St',addressLocality:'New York',addressRegion:'NY',postalCode:'10018',addressCountry:'US'},areaServed:'New York City'};
 if(settings.enabled)html=html.replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/i,'<meta name="robots" content="index,follow">');
 return html.replace('</head>',`<link rel="canonical" href="${xml(url)}">${tags}<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
}
