import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(readFileSync('config.js','utf8'),context);const c=context.window.BARSYS;
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nav=[['packages','Packages'],['mixlists','Mixlists'],['technology','Technology'],['about','About'],['contact','Contact'],['faq','FAQ']];
const cards=items=>`<div class="cards">${items.join('')}</div>`;
const card=(title,body,url)=>`<article><h2>${esc(title)}</h2>${body}<a href="${url}">Explore <span aria-hidden="true">↗</span></a></article>`;
const pages=[];
const clip=(text,max=160)=>{text=String(text).replace(/\s+/g,' ').trim();if(text.length<=max)return text;const cut=text.slice(0,max);const stop=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('; '));return (stop>0?cut.slice(0,stop+1):cut.replace(/\s+\S*$/,'')).trim();};
const describe=(...parts)=>clip(parts.filter(Boolean).join(' '));
function page(slug,title,description,body,image=null,intro=description){pages.push({slug,title,description,...(image?{image}:{})});writeFileSync(`site/${slug}.html`,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} | Barsys Happy Hours</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(title)} | Barsys Happy Hours"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><link rel="icon" href="/assets/brand-mark.png"><meta name="theme-color" content="#ffffff"><link rel="stylesheet" href="/site/site.css"></head><body><a class="skip" href="#main">Skip to content</a><header><a href="/" aria-label="Barsys home"><img src="/assets/logos/Black_Horizontal.svg" width="156" height="30" alt="Barsys"></a><nav aria-label="Main navigation">${nav.map(([id,label])=>`<a href="/site/${id}.html" ${id===slug?'aria-current="page"':''}>${label}</a>`).join('')}</nav></header><main id="main" tabindex="-1"><p class="eyebrow">BARSYS / HAPPY HOURS / NEW YORK CITY</p><h1>${esc(title)}</h1><p class="intro">${esc(intro)}</p>${body}<section class="closing"><h2>Your next gathering starts here.</h2><a class="button" href="/#proposal">Plan my event ↗</a><p>An inquiry is not a booking.</p></section></main><footer><a href="/">Barsys Happy Hours</a><a href="/#privacy-policy">Privacy</a><a href="/#event-terms">Event terms</a><a href="/#accessibility-help">Accessibility</a><span>Barsys Inc. · New York City</span></footer></body></html>`);}
mkdirSync('site',{recursive:true});
page('packages','A package for your kind of gathering.','Compare the Classic, Signature and Reserve office happy-hour packages from Barsys: per-guest rates, a two-hour service baseline and what each package includes.',cards(Object.entries(c.packages).map(([id,p])=>card(p.name,`<p class="price">$${p.rate}<small> / guest</small></p><p>${esc(p.description)}</p>`,`/site/${id}.html`)))+'<p>Two-hour baseline. Tax and extras are confirmed in your proposal.</p>');
for(const [id,p] of Object.entries(c.packages))page(id,`${p.name} happy hours`,describe(p.description,p.detail,`From $${p.rate} per guest for New York City office events.`),`<section class="split"><div><p class="price">$${p.rate}<small> / guest</small></p><p>Two-hour baseline · ${c.minGuests}-guest minimum for standard planning</p><p>${esc(p.detail)}</p></div><div><h2>The details</h2><ul>${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><p>Up to ${p.menuLimit} menus. Tax, extra hours and unpriced requests are confirmed in your proposal.</p><a href="/#packages">Choose ${esc(p.name)} in the planner ↗</a></div></section>`,null,p.description);
page('mixlists','Find your first pour.','Explore the Barsys mixlist library for office happy hours in New York City. Package eligibility and final event menus are confirmed in the planner.',cards(c.menus.map(m=>card(m.name,`<p>${esc(m.description)}</p>`,`/site/mixlist-${m.id}.html`))));
for(const m of c.menus){const a=c.assets[m.image];page(`mixlist-${m.id}`,m.name,describe(m.description,m.detail||m.flavor,`A Barsys mixlist for office happy hours and events in New York City.`),`<section class="split">${a?.local?`<img class="cover" src="/${esc(a.local)}" alt="${esc(m.name)} collection cover" width="720" height="900">`:''}<div><h2>${esc(m.tag||'The collection')}</h2><p>${esc(((x)=>x&&x.startsWith(m.description)?x.slice(m.description.length).trim():x)([m.detail,m.flavor].find(x=>x&&x!==m.description))||'Final recipes and spirit brands are confirmed with your event team.')}</p>${m.examples?.length?`<h3>Featured drinks</h3><ul>${m.examples.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<p>Package eligibility is shown in the planner.</p><a href="/#menus">See package-eligible menus ↗</a></div></section>`,a?.local?`/${a.local}`:null,m.description);}
page('about','Good drinks. Better connections.','Barsys brings an interactive cocktail bar to office gatherings in New York City.',`<section class="split"><div><h2>The office, after hours.</h2><p>Barsys cocktail machines, bartenders, setup and cleanup, brought to your office.</p><p>From a team happy hour to a client gathering, start with the occasion, guest count and venue. We work out the menu and details with you.</p></div><div><h2>Plan with people.</h2><p>Contact Fareed at <a href="mailto:${c.email}">${c.email}</a>.</p><p>Barsys Inc.<br>44 W 37th St<br>New York, NY 10018</p></div></section>`);
page('contact','Tell us what you have in mind.','Planning an office happy hour, client gathering or milestone in New York City?',`<section><h2>Talk to Fareed.</h2><a href="mailto:${c.email}">${c.email}</a><p>Include the date, guest count and venue if you have them. We come back with availability and next steps.</p></section>`);
function techPage(){
const slug='technology',title='The bar we bring.',description='The Barsys 360 cocktail machine and the Shaker Pro smart shaker: what they are, how they pour, and how they work together at a Barsys happy hour.';
pages.push({slug,title,description,image:'/assets/tech/360-hero-hd.jpg'});
const landing=readFileSync('index.html','utf8');const si=landing.indexOf('<symbol id="i-arrow"');const sprite=landing.slice(landing.lastIndexOf('<svg',si),landing.indexOf('</svg>',si)+6);
const video=(name,alt,ratio='16/9')=>`<div class="tech-media" style="aspect-ratio:${ratio}"><img alt="${esc(alt)}" src="/assets/tech/${name}-poster.jpg" loading="lazy" width="1600" height="900"><video aria-hidden="true" data-tech-video data-src="/assets/tech/${name}.mp4" loop muted playsinline preload="none" tabindex="-1"></video></div>`;
const spec=(n,l)=>`<div class="spec"><strong>${n}</strong><span>${esc(l)}</span></div>`;
const step=(n,t,d)=>`<li><small>${n}</small><strong>${esc(t)}</strong><p>${esc(d)}</p></li>`;
const navLinks=`<a href="/#experience">Experience</a><a href="/#packages">Packages</a><a href="/#menus">Mixlists</a><a href="/#event-gallery">Real events</a><a aria-current="page" href="/site/technology.html">Technology</a>`;
writeFileSync(`site/${slug}.html`,`<!DOCTYPE html>
<html data-motion="on" lang="en">
<head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="noindex,nofollow" name="robots"/><meta content="#080808" name="theme-color"/>
<meta content="${esc(description)}" name="description"/>
<meta content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; frame-src 'none'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'" http-equiv="Content-Security-Policy"/>
<title>${esc(title)} | Barsys Happy Hours</title>
<meta property="og:title" content="${esc(title)} | Barsys Happy Hours"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:image" content="/assets/tech/360-hero-hd.jpg">
<link href="/assets/brand-mark.png" rel="icon"/><link href="/styles.css" rel="stylesheet"/><link href="/v3.css" rel="stylesheet"/><link href="/technology.css" rel="stylesheet"/>
<script defer src="/technology.js"></script>
</head>
<body class="tech-page">
${sprite}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
<div class="nav-wrap container">
<a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="39" src="/assets/logos/HappyHour.Logo.White.png" width="200"/></a>
<nav aria-label="Main navigation" class="desktop-nav">${navLinks}</nav>
<div class="nav-actions"><button aria-label="Pause motion" aria-pressed="false" class="motion-toggle" id="motion-toggle" type="button"><svg aria-hidden="true" class="icon"><use href="#i-pause"></use></svg><span>Motion on</span></button><a class="button button-small nav-cta" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><button aria-controls="mobile-nav" aria-expanded="false" aria-label="Open navigation" class="icon-button menu-toggle" type="button"><svg aria-hidden="true" class="icon"><use href="#i-menu"></use></svg></button></div>
</div>
<nav aria-label="Mobile navigation" class="mobile-nav container" hidden id="mobile-nav">${navLinks}<a href="/#proposal">Plan my event</a></nav>
</header>
<main id="main" tabindex="-1">
<section class="tech-hero" aria-labelledby="tech-title">
<div class="tech-hero-media"><img alt="" src="/assets/tech/sp-hero-poster.jpg" fetchpriority="high" width="1600" height="900"><video aria-hidden="true" data-tech-video data-src="/assets/tech/sp-hero.mp4" loop muted playsinline preload="none" tabindex="-1"></video></div>
<div class="tech-hero-shade" aria-hidden="true"></div>
<div class="container tech-hero-copy">
<p class="eyebrow">BARSYS / TECHNOLOGY</p>
<h1 id="tech-title">THE BAR<br>WE <em>BRING.</em></h1>
<p class="tech-lede">Two machines pour every drink to the measure. The Barsys team brings them, runs them and takes them home.</p>
<div class="tech-ctas"><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><a class="text-link" href="#barsys-360">See it pour <svg aria-hidden="true" class="icon"><use href="#i-down"></use></svg></a></div>
</div>
<ul class="tech-strip container" aria-label="At a glance"><li><strong>0.1 oz</strong><span>Pour calibration</span></li><li><strong>152 oz</strong><span>On board, six canisters</span></li><li><strong>6 h</strong><span>Cold, no refrigeration</span></li><li><strong>2,000+</strong><span>Recipes in the app</span></li></ul>
</section>

<section class="tech-split container" id="barsys-360" aria-labelledby="t360">
${video('360-load','A Barsys 360 being loaded: a hand pours spirit into one of the six canisters.')}
<div class="tech-copy">
<p class="eyebrow">BARSYS 360</p>
<h2 id="t360">The countertop cocktail machine.</h2>
<p>Six insulated 25 oz canisters hold spirits, fresh juice and mixers, cold for six hours without refrigeration. Every measure is calibrated to a tenth of an ounce, so the fortieth pour matches the first. Any standard glass, centered under the ring.</p>
<div class="spec-grid">${spec('6 × 25 oz','Insulated canisters, 152 oz on board')}${spec('1⁄10 oz','Calibrated measure, every pour')}${spec('BT 5.0','Pairs with the Barsys app, iOS and Android')}${spec('10 lbs','44 × 20 × 43 cm, one outlet, no plumbing')}</div>
<a class="text-link" href="https://360.barsys.com/" rel="noopener" target="_blank">More on the 360 <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a>
</div>
</section>

<section class="tech-steps container" aria-labelledby="tpour">
<div class="tech-steps-head"><p class="eyebrow">HOW IT POURS</p><h2 id="tpour">One evening. Four moves.</h2></div>
<ol class="steps">${step('01','Pair it.','Plug in and pair with the free Barsys app. No plumbing, no compressor.')}${step('02','Pick the drink.','Guests choose from the event menu on the tablet, or let Barbot, the Barsys AI, compose one.')}${step('03','Load the bar.','Spirits, juice and mixers go into the six canisters. Zero-proof menus run on the same machine.')}${step('04','It pours.','Every measure exact. The bartender garnishes and hands it over.')}</ol>
${video('360-app-pour','A guest picks a drink on the Barsys app and the 360 pours it.','21/9')}
</section>

<section class="tech-split reverse container" id="shaker-pro" aria-labelledby="tsp">
${video('sp-guided','The Shaker Pro on its illuminated base, ready for a light-guided pour.')}
<div class="tech-copy">
<p class="eyebrow">SHAKER PRO</p>
<h2 id="tsp">The shaker that lights the way.</h2>
<p>Pick a recipe in the Barsys AI app, pour until the light says stop, then shake and serve. Accurate to under a millilitre, about 1⁄30 oz. The tin lifts off and rinses like a classic shaker; the electronics stay dry.</p>
<div class="spec-grid">${spec('< 1 ml','Pour accuracy, about 1⁄30 oz')}${spec('3 cues','Light signals: start, slow, stop')}${spec('USB-C','Fast charge, balanced weight')}${spec('1,965','Crafted recipes, plus Barbot on demand')}</div>
<a class="text-link" href="https://shakerpro.barsys.com/" rel="noopener" target="_blank">More on the Shaker Pro <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a>
</div>
</section>

<section class="tech-band" aria-labelledby="tband">
<div class="tech-band-media"><img alt="" src="/assets/tech/sp-afterdark-poster.jpg" loading="lazy" width="1600" height="900"><video aria-hidden="true" data-tech-video data-src="/assets/tech/sp-afterdark.mp4" loop muted playsinline preload="none" tabindex="-1"></video></div>
<div class="tech-band-shade" aria-hidden="true"></div>
<div class="container tech-band-copy"><p class="eyebrow">SHAKER PRO / THE FILM</p><h2 id="tband">Drawn to pour.</h2><p>From the first sketches to the light-guided pour: the Shaker Pro film from shakerpro.barsys.com, in silent excerpt.</p></div>
</section>

<section class="tech-event container" id="at-your-event" aria-labelledby="tevent">
<div class="tech-steps-head"><p class="eyebrow">AT YOUR EVENT</p><h2 id="tevent">Machines pour. People host.</h2></div>
<div class="tech-trio">
<article><svg aria-hidden="true" class="icon"><use href="#i-glass"></use></svg><h3>360s on the bar</h3><p>Guests pick a drink on the tablet. The 360 pours it exactly, cocktail or zero-proof, from the same six canisters.</p></article>
<article><svg aria-hidden="true" class="icon"><use href="#i-spark"></use></svg><h3>Shaker Pro stations</h3><p>Bartenders shake, garnish and hand over. The light-guided pour keeps every drink to the recipe.</p></article>
<article><svg aria-hidden="true" class="icon"><use href="#i-check"></use></svg><h3>The Barsys team</h3><p>We bring, set up and take down everything: machines, tablets, ingredients, ice and glassware as agreed in your proposal.</p></article>
</div>
${video('360-serve','A finished drink lifted out of the Barsys 360 and handed to a guest.','21/9')}
</section>

<section class="tech-closing container"><h2>Your next gathering starts here.</h2><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><p>An inquiry is not a booking.</p></section>
</main>
<footer class="site-footer container"><a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="35" src="/assets/logos/HappyHour.Logo.White.png" width="180"/></a><p>GOOD DRINKS. BETTER CONNECTIONS.</p><a href="mailto:${esc(c.email)}">Talk to Fareed<svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><nav aria-label="Explore Barsys" class="footer-policies"><a href="/site/packages.html">Packages</a><a href="/site/mixlists.html">Mixlists</a><a aria-current="page" href="/site/technology.html">Technology</a><a href="/site/about.html">About</a><a href="/site/contact.html">Contact</a><a href="/site/faq.html">FAQ</a></nav><nav aria-label="Policies" class="footer-policies"><a href="/#privacy-policy">Privacy notice</a><a href="/#event-terms">Event service terms</a><a href="/#cancellations">Cancellations &amp; rescheduling</a><a href="/#cookies-storage">Cookies &amp; storage</a><a href="/#accessibility-help">Accessibility &amp; help</a></nav><p class="business-line">Barsys, Inc. · Event inquiries: ${esc(c.email)} · No online bookings or payments.</p><div class="footer-bottom"><span>© 2026 Barsys, Inc. · New York City</span><span>PRODUCT FILMS ARE FROM 360.BARSYS.COM AND SHAKERPRO.BARSYS.COM. SPECIFICATIONS AS PUBLISHED THERE.</span></div></footer>
</body></html>
`);}
techPage();
page('faq','Before the first cheers.','Answers to the essentials of planning a Barsys office happy hour: inclusions, menus, dates, custom events and cancellations.',[['What is included?','Packages use a two-hour service baseline. Review each package for inclusions; final scope is confirmed in your proposal.'],['Which menus can I choose?','Select your package in the planner to see current eligible mixlists. Final recipes and spirit brands require confirmation.'],['Does an inquiry hold my date?','No. Sending an inquiry does not reserve a date, sign an agreement or take payment.'],['Can you handle a custom event?','Submit your guest count, venue and requirements. Events outside the standard planning range are reviewed as custom quotes.'],['How do cancellations work?','Deposit, cancellation and rescheduling terms are confirmed in your event proposal and agreement.'],['Where do you operate?','This site focuses on New York City office gatherings. Ask the team to confirm availability for your exact venue.']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join(''));
writeFileSync('site/pages.json',JSON.stringify(pages,null,2)+'\n');
console.log(`Built ${pages.length} public content pages; indexing remains disabled.`);
