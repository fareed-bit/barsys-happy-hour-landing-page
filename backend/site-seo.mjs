import {readFileSync} from 'node:fs';
export const sitePages=JSON.parse(readFileSync(new URL('../site/pages.json',import.meta.url),'utf8'));
export const sitePaths=new Set(['/',...sitePages.map(p=>`/site/${p.slug}.html`)]);
export const INDEXNOW_KEY='e8c5f80a972e0c805c6ebf2c17dae006';
export const ORG_ID='https://barsys.com/#organization';
export const SAME_AS=['https://barsys.com/','https://happyhours.barsys.com/','https://360.barsys.com/','https://shakerpro.barsys.com/','https://g.co/kgs/barsys','https://www.instagram.com/barsys.inc/','https://www.linkedin.com/company/barsys-llc/','https://www.tiktok.com/@thebarsys','https://www.youtube.com/@TheBarsys','https://x.com/barsyscocktail'];
const AI_BOTS=['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-SearchBot','anthropic-ai','PerplexityBot','Perplexity-User','Google-Extended','Applebot','Applebot-Extended','Bingbot','DuckAssistBot','Amazonbot','meta-externalagent','CCBot','YouBot'];
export function robotsText(settings){if(!settings.enabled)return 'User-agent: *\nDisallow: /\n';const rule=ua=>`User-agent: ${ua}\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n`;return rule('*')+'\n# AI search and answer engines, explicitly allowed\n'+AI_BOTS.map(rule).join('\n')+`\nSitemap: ${settings.origin}/sitemap.xml\n`;}
export function llmsText(settings){const o=settings.origin;const pages=sitePages.filter(p=>!/^mixlist-/.test(p.slug)).map(p=>`- [${p.title}](${o}/site/${p.slug}.html): ${p.description}`).join('\n');return `# Barsys Events\n\n> Event bar service in New York City from Barsys, Inc.: Barsys 360 cocktail machines and Shaker Pro stations, run by the Barsys team, for corporate events, brand activations, holiday parties, private celebrations and zero-proof events.\n\n## Key facts\n- Company: Barsys, Inc., 44 W 37th St, New York, NY 10018. Event inquiries: fareed@barsys.com.\n- Service area: New York City.\n- Packages: Classic $55 per guest (2 curated cocktail menus), Signature $85 per guest (3 menus), Reserve $225 per guest (5 menus, dedicated event lead). Two-hour service baseline; 20-guest minimum for standard planning; additional service hours $500 each on request.\n- Included: Barsys machines, tablets, bartending service, setup and cleanup as agreed in the proposal. Tax, extra hours and unpriced requests are confirmed in the proposal.\n- Menus: 27 curated mixlists, including zero-proof mixlists (Fluid Code, A Summer Mocktail Mixlist, Boisson Non-Alcoholic Agave Lover’s).\n- Equipment: Barsys 360 (six insulated canisters, pours calibrated to a tenth of an ounce, Bluetooth, 2,000+ recipes) and Shaker Pro (light-guided pour, accurate to under a millilitre).\n- Formats outside the standard planner (large activations, non-standard venues) are quoted individually.\n- An inquiry is not a booking. No online bookings or payments.\n\n## Pages\n- [Home](${o}/): plan an event and send an inquiry.\n${pages}\n\n## Related Barsys sites\n- https://happyhours.barsys.com/ (corporate happy hours in NYC)\n- https://barsys.com/ (company), https://360.barsys.com/ (Barsys 360), https://shakerpro.barsys.com/ (Shaker Pro)\n`;}

const xml=s=>s.replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
export function seoSettings({origin,indexing,staging,local}){
 const url=new URL(origin);return {origin:url.origin,enabled:indexing==='1'&&!staging&&!local&&url.protocol==='https:'};
}
export function sitemap(settings){return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${settings.enabled?[...sitePaths].map(p=>`<url><loc>${xml(settings.origin+p)}</loc></url>`).join(''):''}</urlset>`;}
export function decorate(html,path,settings){
 const url=settings.origin+path;
 const page=sitePages.find(p=>`/site/${p.slug}.html`===path);
 const pick=re=>(html.match(re)||[,''])[1];
 const title=page?`${page.title} | Barsys`:pick(/<title[^>]*>([^<]*)<\/title>/i).replace(/&amp;/g,'&');
 const description=page?page.description:pick(/<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']*)["']/i);
 const image=settings.origin+(page?.image||'/assets/lineup.jpg');
 const has=name=>new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'])`,'i').test(html);
 const meta=[['og:url',url],['og:type','website'],['og:site_name','Barsys'],['og:locale','en_US'],['og:title',title],['og:description',description],['og:image',image],['og:image:alt',page?`${page.title} — Barsys Happy Hours`:'Barsys cocktail machines and glassware lined up for an event'],['twitter:card','summary_large_image'],['twitter:title',title],['twitter:description',description],['twitter:image',image]];
 if(!page?.image)meta.push(['og:image:width','1920'],['og:image:height','899']);
 const tags=meta.filter(([name,value])=>value&&!has(name)).map(([name,value])=>`<meta ${name.startsWith('twitter:')?'name':'property'}="${name}" content="${xml(value)}">`).join('');
 const org={'@type':'Organization','@id':ORG_ID,name:'Barsys Inc.',alternateName:'Barsys',url:settings.origin,email:'fareed@barsys.com',logo:settings.origin+'/assets/barsys-logo.png',image,sameAs:SAME_AS,address:{'@type':'PostalAddress',streetAddress:'44 W 37th St',addressLocality:'New York',addressRegion:'NY',postalCode:'10018',addressCountry:'US'},areaServed:{'@type':'City',name:'New York City'}};
 const graph=[org];
 if(path==='/')graph.push({'@type':'WebSite','@id':settings.origin+'/#website',name:'Barsys Events',url:settings.origin,publisher:{'@id':ORG_ID}});
 else graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:settings.origin+'/'},{'@type':'ListItem',position:2,name:page?.title||title,item:url}]});
 if(page?.faq?.length)graph.push({'@type':'FAQPage',mainEntity:page.faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))});
 if(page?.service)graph.push({'@type':'Service','@id':url+'#service',name:page.service.name,serviceType:page.service.type,description:page.description,url,provider:{'@id':ORG_ID},areaServed:{'@type':'City',name:'New York City'},audience:{'@type':'Audience',audienceType:page.service.audience||'Companies and teams in New York City'},hasOfferCatalog:{'@type':'OfferCatalog',name:'Barsys event packages',itemListElement:[['Classic',55],['Signature',85],['Reserve',225]].map(([n,pr])=>({'@type':'Offer',name:n+' package',priceSpecification:{'@type':'UnitPriceSpecification',price:pr,priceCurrency:'USD',unitText:'per guest, two-hour baseline'},url:settings.origin+'/site/'+n.toLowerCase()+'.html'}))}});
 const schema={'@context':'https://schema.org','@graph':graph};
 if(settings.enabled)html=html.replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/i,'<meta name="robots" content="index,follow">');
 return html.replace('</head>',`<link rel="canonical" href="${xml(url)}">${tags}<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
}
