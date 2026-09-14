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
 const schema={'@context':'https://schema.org','@type':'Organization',name:'Barsys Inc.',url:settings.origin,email:'fareed@barsys.com',logo:settings.origin+'/assets/logos/Black_Horizontal.svg'};
 if(settings.enabled)html=html.replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/i,'<meta name="robots" content="index,follow">');
 return html.replace('</head>',`<link rel="canonical" href="${xml(url)}"><meta property="og:url" content="${xml(url)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
}
