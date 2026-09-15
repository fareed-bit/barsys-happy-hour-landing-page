import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(readFileSync('config.js','utf8'),context);const c=context.window.BARSYS;
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nav=[['events','Events'],['packages','Packages'],['mixlists','Mixlists'],['technology','Technology'],['about','About'],['contact','Contact'],['faq','FAQ']];
const extras={};
const faqHtml=items=>`<section class="faq" aria-label="Questions">${items.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
const cards=items=>`<div class="cards">${items.join('')}</div>`;
const card=(title,body,url)=>`<article><h2>${esc(title)}</h2>${body}<a href="${url}">Explore <span aria-hidden="true">↗</span></a></article>`;
const pages=[];
const clip=(text,max=160)=>{text=String(text).replace(/\s+/g,' ').trim();if(text.length<=max)return text;const cut=text.slice(0,max);const stop=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('; '));return (stop>0?cut.slice(0,stop+1):cut.replace(/\s+\S*$/,'')).trim();};
const describe=(...parts)=>clip(parts.filter(Boolean).join(' '));

// Landing shell resources loaded once
const landing=readFileSync('index.html','utf8');
const spriteIdx=landing.indexOf('<symbol id="i-arrow"');
const sprite=landing.slice(landing.lastIndexOf('<svg',spriteIdx),landing.indexOf('</svg>',spriteIdx)+6);

// Default hero image per category (only used when page() is called without one)
const DEFAULT_HERO='/assets/lineup.jpg';

function page(slug,title,description,body,image=null,intro=description){
  pages.push({slug,title,description,...(image?{image}:{})});
  const heroImg=image||DEFAULT_HERO;
  const navLinks=nav.map(([id,label])=>`<a href="/site/${id}.html"${id===slug?' aria-current="page"':''}>${label}</a>`).join('');
  const html=`<!DOCTYPE html>
<html data-motion="on" lang="en">
<head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="noindex,nofollow" name="robots"/><meta content="#080808" name="theme-color"/>
<meta content="${esc(description)}" name="description"/>
<meta content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; frame-src 'none'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'" http-equiv="Content-Security-Policy"/>
<title>${esc(title)} | Barsys</title>
<meta property="og:title" content="${esc(title)} | Barsys"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(heroImg)}">
<link href="/assets/brand-mark.png" rel="icon"/>
<link href="/styles.css" rel="stylesheet"/>
<link href="/v3.css" rel="stylesheet"/>
<link href="/site/site.css" rel="stylesheet"/>
</head>
<body class="sub-page">
${sprite}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
<div class="nav-wrap container">
<a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="39" src="/assets/logos/HappyHour.Logo.White.png" width="200"/></a>
<nav aria-label="Main navigation" class="desktop-nav">${navLinks}</nav>
<div class="nav-actions"><a class="button button-small nav-cta" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><button aria-controls="mobile-nav" aria-expanded="false" aria-label="Open navigation" class="icon-button menu-toggle" type="button"><svg aria-hidden="true" class="icon"><use href="#i-menu"></use></svg></button></div>
</div>
<nav aria-label="Mobile navigation" class="mobile-nav container" hidden id="mobile-nav">${navLinks}<a href="/#proposal">Plan my event</a></nav>
</header>
<main id="main" tabindex="-1">
<section class="sub-hero" aria-labelledby="sub-title">
<div class="sub-hero-media"><img alt="" src="${esc(heroImg)}" fetchpriority="high" width="1600" height="900"></div>
<div class="sub-hero-shade" aria-hidden="true"></div>
<div class="container sub-hero-copy">
<p class="eyebrow">BARSYS / NEW YORK CITY</p>
<h1 id="sub-title">${esc(title)}</h1>
<p class="sub-lede">${esc(intro)}</p>
<div class="sub-ctas"><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a></div>
</div>
</section>
<div class="sub-body container">${body}</div>
<section class="sub-closing container"><h2>Your next gathering starts here.</h2><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><p>An inquiry is not a booking.</p></section>
</main>
<footer class="site-footer container"><a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="35" src="/assets/logos/HappyHour.Logo.White.png" width="180"/></a><p>GOOD DRINKS. BETTER CONNECTIONS.</p><a href="mailto:${esc(c.email)}">Talk to Fareed<svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><nav aria-label="Explore Barsys" class="footer-policies">${nav.map(([id,label])=>`<a href="/site/${id}.html"${id===slug?' aria-current="page"':''}>${label}</a>`).join('')}</nav><nav aria-label="Policies" class="footer-policies"><a href="/#privacy-policy">Privacy notice</a><a href="/#event-terms">Event service terms</a><a href="/#cancellations">Cancellations &amp; rescheduling</a><a href="/#cookies-storage">Cookies &amp; storage</a><a href="/#accessibility-help">Accessibility &amp; help</a></nav><p class="business-line">Barsys, Inc. · Event inquiries: ${esc(c.email)} · No online bookings or payments.</p><div class="footer-bottom"><span>© 2026 Barsys, Inc. · New York City</span><span>FILMS AND PHOTOS ARE FROM REAL BARSYS EVENTS. MENUS AND SCOPE ARE CONFIRMED IN YOUR PROPOSAL.</span></div></footer>
</body></html>
`;
  writeFileSync(`site/${slug}.html`,html);
}
mkdirSync('site',{recursive:true});
page('packages','A package for your kind of gathering.','Compare the Classic, Signature and Reserve office happy-hour packages from Barsys: per-guest rates, a two-hour service baseline and what each package includes.',cards(Object.entries(c.packages).map(([id,p])=>card(p.name,`<p class="price">$${p.rate}<small> / guest</small></p><p>${esc(p.description)}</p>`,`/site/${id}.html`)))+'<p>Two-hour baseline. Tax and extras are confirmed in your proposal.</p>','/assets/tech/360-hero-hd.jpg');
for(const [id,p] of Object.entries(c.packages))page(id,`${p.name} happy hours`,describe(p.description,p.detail,`From $${p.rate} per guest for New York City office events.`),`<section class="split"><div><p class="price">$${p.rate}<small> / guest</small></p><p>Two-hour baseline · ${c.minGuests}-guest minimum for standard planning</p><p>${esc(p.detail)}</p></div><div><h2>The details</h2><ul>${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><p>Up to ${p.menuLimit} menus. Tax, extra hours and unpriced requests are confirmed in your proposal.</p><a href="/#packages">Choose ${esc(p.name)} in the planner ↗</a></div></section>`,'/assets/tech/360-hero-hd.jpg',p.description);
page('mixlists','Find your first pour.','Explore the Barsys mixlist library for office happy hours in New York City. Package eligibility and final event menus are confirmed in the planner.',cards(c.menus.map(m=>card(m.name,`<p>${esc(m.description)}</p>`,`/site/mixlist-${m.id}.html`))),'/assets/lineup.jpg');
for(const m of c.menus){const a=c.assets[m.image];page(`mixlist-${m.id}`,m.name,describe(m.description,m.detail||m.flavor,`A Barsys mixlist for office happy hours and events in New York City.`),`<section class="split">${a?.local?`<img class="cover" src="/${esc(a.local)}" alt="${esc(m.name)} collection cover" width="720" height="900">`:''}<div><h2>${esc(m.tag||'The collection')}</h2><p>${esc(((x)=>x&&x.startsWith(m.description)?x.slice(m.description.length).trim():x)([m.detail,m.flavor].find(x=>x&&x!==m.description))||'Final recipes and spirit brands are confirmed with your event team.')}</p>${m.examples?.length?`<h3>Featured drinks</h3><ul>${m.examples.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<p>Package eligibility is shown in the planner.</p><a href="/#menus">See package-eligible menus ↗</a></div></section>`,a?.local?`/${a.local}`:'/assets/lineup.jpg',m.description);}
page('about','Good drinks. Better connections.','Barsys brings an interactive cocktail bar to office gatherings in New York City.',`<section class="split"><div><h2>The office, after hours.</h2><p>Barsys cocktail machines, bartenders, setup and cleanup, brought to your office.</p><p>From a team happy hour to a client gathering, start with the occasion, guest count and venue. We work out the menu and details with you.</p></div><div><h2>Plan with people.</h2><p>Contact Fareed at <a href="mailto:${c.email}">${c.email}</a>.</p><p>Barsys Inc.<br>44 W 37th St<br>New York, NY 10018</p></div></section>`,'/assets/lineup.jpg');
page('contact','Tell us what you have in mind.','Planning an office happy hour, client gathering or milestone in New York City?',`<section><h2>Talk to Fareed.</h2><a href="mailto:${c.email}">${c.email}</a><p>Include the date, guest count and venue if you have them. We come back with availability and next steps.</p></section>`,'/assets/lineup.jpg');
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
<title>${esc(title)} | Barsys</title>
<meta property="og:title" content="${esc(title)} | Barsys"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:image" content="/assets/tech/360-hero-hd.jpg">
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

const EVENTS_FAQ=[['What kinds of events does Barsys serve in New York City?','Corporate events (company celebrations, executive and client events, recruiting nights), brand activations and product launches, holiday parties, private celebrations and zero-proof events. Office happy hours are covered at happyhours.barsys.com.'],['What is included in the per-guest price?','Barsys 360 cocktail machines, tablets, bartending service, the curated mixlists for your package, standard mixers, and setup and cleanup as agreed in your proposal. Tax, extra hours and unpriced requests are confirmed in the proposal.'],['How many guests can an event have?','Standard planning starts at twenty guests. Larger events add machines and staff; formats outside the standard planner are quoted individually.'],['Does sending an inquiry book the date?','No. An inquiry does not hold a date, sign an agreement or take payment. We confirm availability, menus and scope by reply.']];
const CORP_FAQ=[['Can one event serve both cocktails and zero-proof drinks?','Yes. A zero-proof mixlist can take one of your menu slots, and it runs on the same machines with the same service.'],['Do you bring everything to our office?','The Barsys team brings, sets up and takes down machines, tablets, ingredients, ice and glassware as agreed in your proposal. The 360 needs one outlet and no plumbing.'],['How long is the service?','Packages use a two-hour service baseline. Additional service hours are available on request at $500 per hour and are confirmed in the proposal.'],['Which package suits a client or executive event?','Signature adds a signature cocktail program and premium mixers and garnishes; Reserve adds five curated menus, a dedicated event lead and premium bar presentation.']];
const ACTIVATION_FAQ=[['How are brand activations priced?','Individually. Duration, footfall, number of machines, staffing and any custom menu work are quoted for the format. Standard per-guest packages apply where the event runs as a hosted bar for a known guest list.'],['Can the menu carry our brand?','Reserve includes up to five curated mixlists, which can be named for the launch or campaign. Recipes and spirit brands are confirmed with Barsys.'],['Can the machines run zero-proof for a daytime activation?','Yes. Three of the mixlists are zero-proof and run on the same machines.'],['What do you need from the venue?','One outlet per machine and a bar surface. The Barsys 360 has no plumbing or compressor.']];
const HOLIDAY_FAQ=[['When should we book a December holiday party?','As soon as the date is set. December dates go first. Sending an inquiry does not hold a date; we confirm availability by reply.'],['Do you have seasonal menus?','You choose from 27 curated mixlists; Signature and Reserve add premium mixers and dry garnishes. Final recipes and spirit brands are confirmed with Barsys.'],['Is there a zero-proof option for guests who are not drinking?','Yes. A zero-proof mixlist can take one of your menu slots and runs on the same machines.'],['What does a holiday party cost?','Classic $55, Signature $85 or Reserve $225 per guest with a two-hour service baseline and a twenty-guest minimum for standard planning. Tax and extras are confirmed in the proposal.']];
const PRIVATE_FAQ=[['Do you do private celebrations, not just companies?','Yes. Milestones, engagements, birthdays and galas. Standard planning starts at twenty guests; smaller gatherings are quoted individually.'],['Can the bar run in a home or a rented loft?','Yes. The Barsys 360 needs one outlet and no plumbing, so it runs in homes, lofts, rooftops and ballrooms.'],['Who serves the drinks?','Barsys bartenders. Guests pick on the tablet, the 360 pours, and the bartender shakes, garnishes and hands it over.'],['What does a private event cost?','Classic $55, Signature $85 or Reserve $225 per guest with a two-hour service baseline. Formats outside the standard planner are quoted individually.']];
const ZERO_FAQ=[['Which zero-proof mixlists do you offer?','Fluid Code, A Summer Mocktail Mixlist and Boisson Non-Alcoholic Agave Lover\u2019s, three of the 27 Barsys mixlists.'],['Is a zero-proof event cheaper?','No. The machines, bartenders and service are the same, so the per-guest packages are the same.'],['Can we mix zero-proof and cocktail menus at one event?','Yes. A zero-proof mixlist can take one of the menu slots in any package.'],['Do the machines pour zero-proof drinks the same way?','Yes. Guests pick on the tablet and the 360 pours to the same measure; bartenders garnish and serve.']];

// ---- Events territory: corporate events, activations, holiday, private, zero-proof (events.barsys.com) ----
const planner=`<a class="button" href="/#proposal">Plan my event ↗</a>`;
const packagesLine=`<p>Standard event pricing is per guest with a two-hour service baseline: <a href="/site/classic.html">Classic $55</a>, <a href="/site/signature.html">Signature $85</a>, <a href="/site/reserve.html">Reserve $225</a>. Twenty guests is the minimum for standard planning; additional service hours are $500 each on request. Tax, extra hours and unpriced requests are confirmed in your proposal.</p>`;
const hubCards=cards([
 card('Corporate events','<p>Company celebrations, executive and client events, recruiting nights. The bar your team will actually talk about.</p>','/site/corporate-events.html'),
 card('Brand activations','<p>Product launches, pop-ups and sponsored bars where the pour is the moment. Quoted for the format.</p>','/site/brand-activations.html'),
 card('Holiday parties','<p>Seasonal menus, two machines pouring, bartenders shaking. Book the date early.</p>','/site/holiday-parties.html'),
 card('Private celebrations','<p>Milestones, engagements, birthdays and galas with the Barsys bar at the center.</p>','/site/private-events.html'),
 card('Zero-proof events','<p>Three zero-proof mixlists on the same machines, so the whole team is included.</p>','/site/zero-proof-events.html'),
]);
page('events','Event bar service in New York City.','Barsys brings its cocktail machines, Shaker Pro stations and bartenders to corporate events, brand activations, holiday parties, private celebrations and zero-proof events across New York City.',
`${hubCards}<section class="split"><div><h2>How it works.</h2><p>Guests pick a drink on the tablet. The Barsys 360 pours it to the measure. Bartenders shake, garnish and hand it over. The Barsys team brings, sets up and takes down everything agreed in your proposal: machines, tablets, ingredients, ice and glassware.</p>${packagesLine}</div><div><h2>Real rooms.</h2><p>An office happy hour in a media company\u2019s newsroom, a gala for a library foundation, a US Open watch night on a Midtown rooftop terrace, a mocktail bar inside a fitness studio, a pop-up in a downtown boutique. The films and photos on this site are from real Barsys events.</p><a href="/site/technology.html">The machines we bring ↗</a></div></section>`+faqHtml(EVENTS_FAQ),'/assets/tech/360-hero-hd.jpg','Corporate events, brand activations, holiday parties, private celebrations and zero-proof events in New York City, with the Barsys bar at the center.');
extras.events={faq:EVENTS_FAQ,service:{name:'Barsys event bar service',type:'Event bar service',audience:'Companies, brands and hosts in New York City'}};
page('corporate-events','Corporate event bar service in NYC.','Bar service for company celebrations, executive and client events and recruiting nights in New York City: Barsys 360 cocktail machines, Shaker Pro stations and bartenders, priced per guest.',
`<section class="split"><div><h2>Celebrations, client events, recruiting nights.</h2><p>The same Barsys bar that runs office happy hours scales to the events that matter more: a company milestone for 250, an executive dinner for 150, a client evening for 35, a recruiting night for 30. Guests choose from your event menu on the tablet; the 360 pours each drink to a tenth of an ounce; the team garnishes and serves.</p><ul><li><strong>Company celebrations.</strong> Two or more machines on the bar, a curated menu named for the occasion, bartenders working the room.</li><li><strong>Executive and client events.</strong> Signature or Reserve menus, premium mixers and garnishes, a dedicated event lead on Reserve.</li><li><strong>Recruiting and team nights.</strong> Classic package, two menus, a bar that gives people something to gather around.</li></ul></div><div><h2>What it costs.</h2>${packagesLine}<p>Zero-proof mixlists run on the same machines at no extra menu cost, so every guest is included.</p>${planner}</div></section>`+faqHtml(CORP_FAQ),'/assets/tech/360-dsc5986.jpg','Company celebrations, executive and client events and recruiting nights in New York City, with the Barsys bar priced per guest.');
extras['corporate-events']={faq:CORP_FAQ,service:{name:'Corporate event bar service',type:'Corporate event bar service',audience:'Companies and teams in New York City'}};
page('brand-activations','Brand activations and product launch bars in NYC.','Barsys builds the bar into brand activations, product launches, pop-ups and sponsored events in New York City: the Barsys 360 pouring on camera, Shaker Pro stations and bartenders, quoted for the format.',
`<section class="split"><div><h2>The pour is the moment.</h2><p>A Barsys 360 pouring a drink is the thing people film. For a launch, a pop-up or a sponsored bar, that gives the brand a moment guests share without being asked. We have run the bar inside a fitness studio as a zero-proof mocktail counter, in a downtown boutique for a shopping event, and on a rooftop terrace for a US Open watch night.</p><ul><li><strong>Menus built for the brand.</strong> Up to five curated mixlists on Reserve, named for the launch or the campaign.</li><li><strong>Machines on camera.</strong> The 360 lights the pour and centers the glass; it photographs and films cleanly.</li><li><strong>Setup and teardown by the Barsys team.</strong> Machines, tablets, ingredients, ice and glassware as agreed.</li></ul></div><div><h2>Quoted for the format.</h2><p>Activations rarely fit a two-hour, per-guest format, so they are quoted individually: duration, footfall, number of machines, staffing and any custom menu work. Standard packages (${'Classic $55, Signature $85, Reserve $225 per guest'}) apply where the event runs as a hosted bar for a known guest list.</p><p>Send the brief through the planner and pick the custom-quote path, or email <a href="mailto:${c.email}">${c.email}</a>.</p>${planner}</div></section>`+faqHtml(ACTIVATION_FAQ),'/assets/tech/sp-served-light.jpg','Product launches, pop-ups and sponsored bars in New York City with the Barsys 360 pouring on camera, quoted for the format.');
extras['brand-activations']={faq:ACTIVATION_FAQ,service:{name:'Brand activation bar service',type:'Brand activation and product launch bar service',audience:'Brands, agencies and event producers in New York City'}};
page('holiday-parties','Holiday party bar service in NYC.','Holiday party bar service in New York City: Barsys 360 cocktail machines and Shaker Pro stations with seasonal mixlists, bartenders, setup and cleanup, priced per guest.',
`<section class="split"><div><h2>The office holiday party, with a real bar.</h2><p>Two machines on the bar, a seasonal menu, bartenders shaking and garnishing, and a zero-proof list for everyone who is driving or not drinking. The Barsys team arrives, sets up, runs the bar for the service window and clears out.</p><ul><li><strong>Seasonal mixlists.</strong> Choose from 27 curated collections; Signature and Reserve add premium mixers and dry garnishes.</li><li><strong>Everyone pours.</strong> Guests pick on the tablet and watch the 360 pour. It is the part of the party people photograph.</li><li><strong>Book the date early.</strong> December dates go first. Send the inquiry as soon as the date is set; an inquiry does not hold a date or take payment, and we confirm availability by reply.</li></ul></div><div><h2>Pricing.</h2>${packagesLine}${planner}</div></section>`+faqHtml(HOLIDAY_FAQ),'/assets/curated/posters/galentines.jpg','Seasonal mixlists, two machines pouring and bartenders shaking at your office holiday party in New York City.');
extras['holiday-parties']={faq:HOLIDAY_FAQ,service:{name:'Holiday party bar service',type:'Holiday party bar service',audience:'Companies and teams in New York City'}};
page('private-events','Private event bar service in NYC.','Bar service for private celebrations in New York City: milestones, engagements, birthdays and galas with Barsys 360 cocktail machines, Shaker Pro stations and bartenders.',
`<section class="split"><div><h2>Milestones, engagements, galas.</h2><p>The Barsys bar has poured at a library foundation gala and at a rooftop US Open night. For a private celebration it works the same way: a curated menu, machines that pour every drink to the measure, bartenders who shake and serve, and the setup and cleanup handled by the Barsys team.</p><ul><li><strong>Twenty guests and up.</strong> Standard planning starts at twenty guests; smaller gatherings are quoted individually.</li><li><strong>Your menu.</strong> Two, three or five mixlists depending on package, including zero-proof options.</li><li><strong>Your venue.</strong> The 360 needs one outlet and no plumbing, so it runs in a home, a loft, a rooftop or a ballroom.</li></ul></div><div><h2>Pricing.</h2>${packagesLine}<p>Private celebrations outside the standard planner format are quoted individually.</p>${planner}</div></section>`+faqHtml(PRIVATE_FAQ),'/assets/curated/posters/rooftop-sunset.jpg','Milestones, engagements, birthdays and galas in New York City with the Barsys bar at the center.');
extras['private-events']={faq:PRIVATE_FAQ,service:{name:'Private event bar service',type:'Private event bar service',audience:'Hosts and families in New York City'}};
page('zero-proof-events','Zero-proof and mocktail events in NYC.','Zero-proof event bar service in New York City: three zero-proof mixlists poured by Barsys 360 machines and Shaker Pro stations, so every guest gets a made drink.',
`<section class="split"><div><h2>Same bar. No proof.</h2><p>Three of the 27 Barsys mixlists are zero-proof: <a href="/site/mixlist-fluid.html">Fluid Code</a>, A Summer Mocktail Mixlist and Boisson Non-Alcoholic Agave Lover\u2019s. They run on the same 360 machines and Shaker Pro stations as the cocktail menus, poured to the same measure, garnished by the same bartenders. That makes a fully zero-proof event possible, and it makes every mixed event inclusive.</p><ul><li><strong>Fully zero-proof.</strong> Wellness events, daytime activations, teams that do not drink. We have run a mocktail bar inside a fitness studio.</li><li><strong>Mixed menus.</strong> Add a zero-proof mixlist to any package as one of your menu slots.</li><li><strong>Same theatre.</strong> Guests still pick on the tablet and watch the pour.</li></ul></div><div><h2>Pricing.</h2>${packagesLine}<p>Zero-proof menus are priced the same as cocktail menus; the service, machines and staffing are the same.</p>${planner}</div></section>`+faqHtml(ZERO_FAQ),'/assets/tech/sp-instrument-light.jpg','Three zero-proof mixlists on the same Barsys machines, so every guest gets a made drink.');
extras['zero-proof-events']={faq:ZERO_FAQ,service:{name:'Zero-proof event bar service',type:'Zero-proof and mocktail event bar service',audience:'Companies, brands and hosts in New York City'}};
page('faq','Before the first cheers.','Answers to the essentials of planning a Barsys office happy hour: inclusions, menus, dates, custom events and cancellations.',[['What is included?','Packages use a two-hour service baseline. Review each package for inclusions; final scope is confirmed in your proposal.'],['Which menus can I choose?','Select your package in the planner to see current eligible mixlists. Final recipes and spirit brands require confirmation.'],['Does an inquiry hold my date?','No. Sending an inquiry does not reserve a date, sign an agreement or take payment.'],['Can you handle a custom event?','Submit your guest count, venue and requirements. Events outside the standard planning range are reviewed as custom quotes.'],['How do cancellations work?','Deposit, cancellation and rescheduling terms are confirmed in your event proposal and agreement.'],['Where do you operate?','This site focuses on New York City office gatherings. Ask the team to confirm availability for your exact venue.']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join(''),'/assets/lineup.jpg');
for(const p of pages)Object.assign(p,extras[p.slug]||{});
writeFileSync('site/pages.json',JSON.stringify(pages,null,2)+'\n');
console.log(`Built ${pages.length} public content pages; indexing remains disabled.`);
