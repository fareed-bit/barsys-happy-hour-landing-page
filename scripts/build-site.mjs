import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(readFileSync('config.js','utf8'),context);const c=context.window.BARSYS;
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nav=[['events','Events'],['packages','Packages'],['mixlists','Mixlists'],['technology','Technology'],['blog','Blog'],['about','About'],['contact','Contact'],['faq','FAQ']];
const extras={};
const faqHtml=items=>`<section class="faq" aria-label="Questions">${items.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
const cards=items=>`<div class="cards">${items.join('')}</div>`;
const cards4=items=>`<div class="cards cards-4">${items.join('')}</div>`;
const money=n=>'$'+n.toLocaleString('en-US');
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

// SEO description overrides for pages whose meta description needs to differ
// from the data-driven or hand-authored default. Keyed by slug.
const SEO_DESCRIPTIONS={
  'reserve':'Reserve happy hours: five curated cocktail menus, a dedicated event lead and Barsys 360 machines for clients, milestones and executive occasions.',
  'mixlist-silk':'Smooth pear with a bright citrus edge. A vodka-and-pear collection; requires event-team confirmation for Barsys 360 service.',
  'events':'Barsys brings its cocktail machines, Shaker Pro stations and bartenders to corporate, brand, holiday, private and zero-proof events across NYC.',
  'corporate-events':'Bar service for company celebrations, executive and client events and recruiting nights in NYC: Barsys 360 machines and bartenders, priced per guest.',
  'brand-activations':'Bar service for brand activations, product launches, pop-ups and sponsored events in NYC: Barsys 360 pouring on camera, Shaker Pro and bartenders.',
  'holiday-parties':'Holiday party bar service in NYC: Barsys 360 cocktail machines and Shaker Pro stations with seasonal mixlists, bartenders, setup and cleanup.',
  'private-events':'Bar service for private celebrations in NYC: milestones, engagements, birthdays and galas with Barsys 360 machines and Shaker Pro stations.',
  'zero-proof-events':'Zero-proof event bar service in NYC: three zero-proof mixlists poured by Barsys 360 machines and Shaker Pro so every guest gets a made drink.'
};

function page(slug,title,description,body,image=null,intro=description){
  if(SEO_DESCRIPTIONS[slug])description=SEO_DESCRIPTIONS[slug];
  pages.push({slug,title,description,...(image?{image}:{})});
  const heroImg=image||DEFAULT_HERO;
  const navLinks=nav.map(([id,label])=>{const href=id==='blog'?'/site/blog/':`/site/${id}.html`;return `<a href="${href}"${id===slug?' aria-current="page"':''}>${label}</a>`;}).join('');
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
<script defer src="/site/site-nav.js"></script>
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
<footer class="site-footer container"><a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="35" src="/assets/logos/HappyHour.Logo.White.png" width="180"/></a><p>GOOD DRINKS. BETTER CONNECTIONS.</p><a href="mailto:${esc(c.email)}">Talk to Fareed<svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><nav aria-label="Explore Barsys" class="footer-policies">${nav.map(([id,label])=>{const href=id==='blog'?'/site/blog/':`/site/${id}.html`;return `<a href="${href}"${id===slug?' aria-current="page"':''}>${label}</a>`;}).join('')}</nav><nav aria-label="Policies" class="footer-policies"><a href="/#privacy-policy">Privacy notice</a><a href="/#event-terms">Event service terms</a><a href="/#cancellations">Cancellations &amp; rescheduling</a><a href="/#cookies-storage">Cookies &amp; storage</a><a href="/#accessibility-help">Accessibility &amp; help</a></nav><p class="business-line">Barsys, Inc. · Event inquiries: ${esc(c.email)} · No online bookings or payments.</p><div class="footer-bottom"><span>© 2026 Barsys, Inc. · New York City</span><span>FILMS AND PHOTOS ARE FROM REAL BARSYS EVENTS. MENUS AND SCOPE ARE CONFIRMED IN YOUR PROPOSAL.</span></div></footer>
</body></html>
`;
  writeFileSync(`site/${slug}.html`,html);
}
mkdirSync('site',{recursive:true});
// Collins: flat-fee interactive bartender. It is a fourth card in the packages grid and is named
// as an add-on on each tier card, because that is exactly what it is in the planner - an add-on,
// included with Reserve. The add-on price is read from config.js so the page cannot drift from
// what the quote engine charges. Standalone has no config entry (the planner is package-first and
// cannot sell it), so that one figure is a literal and lives mainly on the detail page.
const COLLINS=c.addons.find(a=>a.id==='collins');
const COLLINS_FROM=COLLINS.variantPrices.s.price;
const COLLINS_STANDALONE_FROM=2250;
const collinsNote=id=>(COLLINS.includedIn||[]).includes(id)
  ?'<p class="card-note">Collins included, at every size.</p>'
  :`<p class="card-note">Add Collins from ${money(COLLINS_FROM)}, flat per event.</p>`;
const COLLINS_CARD=card('Collins',`<p class="price">${money(COLLINS_FROM)}<small> flat, per event</small></p><p>A bartender your guests can talk to, held to the drinks you are actually pouring. iPads, stands, our team on site, your menu and your branding are included, not add-ons.</p><p class="card-note">A flat fee per event, not per guest &mdash; larger rooms get more stations, not a higher rate per head. Included with Reserve. On your own bar from ${money(COLLINS_STANDALONE_FROM)}.</p>`,'/site/collins.html');
const COLLINS_BODY='<section class="split"><div><p class="price">$950<small> flat, per event</small></p><p>Two-hour baseline &middot; added to Classic or Signature &middot; included with Reserve</p><p>Guests walk up and ask for a drink the way they would ask a bartender. Collins answers in its own voice, and it is held to the menu you are actually pouring &mdash; name five drinks and it recommends those five. Ask it for something else and it steers you back.</p><p>Your team sets the menu on the night. Photograph the bottles and Collins reads the shelf, you confirm what is there, and it locks to what that bar can genuinely make.</p></div><div><h2>Included, not extra</h2><ul><li>Three iPads and stands</li><li>One to two of our team on site</li><li>Your menu, locked &mdash; nothing outside it is recommended</li><li>Interface themed to your brand</li><li>Setup and breakdown</li></ul><p>Extra hours, menu changes after lock, events outside Manhattan and additional iPads are confirmed in your proposal.</p><a href="/#packages">Add Collins in the planner &#8599;</a></div></section><section class="split"><div><h2>Bigger rooms, more stations</h2><p>One station serves roughly 25 to 30 guests comfortably. Past that the room queues at exactly the moment it is busiest, so the deployment grows rather than the rate per head.</p><ul><li>Up to 75 guests &mdash; 3 stations, 2 of our team. Added: $950. On your bar: $2,250.</li><li>76 to 150 &mdash; 5 stations, 3 of our team. Added: $1,450. On your bar: $3,250.</li><li>151 to 250 &mdash; 8 stations, 4 of our team. Added: $1,950. On your bar: $4,500.</li><li>Above 250 &mdash; quoted with your proposal.</li></ul><p>Included with Reserve at every size. Additional service time on a standalone booking is $250 an hour up to 75 guests, $375 to 150 and $500 to 250.</p></div><div><h2>Collins on your bar</h2><p class="price">$2,250<small> flat, per event</small></p><p>For venues and offices that already pour their own drinks. Everything above, brought to your bar rather than ours &mdash; we do not pour, we run the experience alongside whoever does.</p><h2>What it is not</h2><p>Collins does not pour. It recommends, explains and keeps a room moving &mdash; your bar, your bartenders and your spirits stay yours. Spirits are sourced through our liquor store partner, who invoices you directly, exactly as on every other package.</p><a href="/#proposal">Talk it through &#8599;</a></div></section>';
page('packages','A package for your kind of gathering.','Compare the Classic, Signature and Reserve office happy-hour packages from Barsys: per-guest rates, a two-hour service baseline and what each package includes.',cards4(Object.entries(c.packages).map(([id,p])=>card(p.name,`<p class="price">$${p.rate}<small> / guest</small></p><p>${esc(p.description)}</p>${collinsNote(id)}`,`/site/${id}.html`)).concat(COLLINS_CARD))+'<p>Two-hour baseline. Tax and extras are confirmed in your proposal. Collins is priced per event rather than per guest.</p>','/assets/tech/360-hero-hd.jpg');
for(const [id,p] of Object.entries(c.packages))page(id,`${p.name} happy hours`,describe(p.description,p.detail,`From $${p.rate} per guest for New York City office events.`),`<section class="split"><div><p class="price">$${p.rate}<small> / guest</small></p><p>Two-hour baseline · ${c.minGuests}-guest minimum for standard planning</p><p>${esc(p.detail)}</p></div><div><h2>The details</h2><ul>${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><p>Up to ${p.menuLimit} menus. Tax, extra hours and unpriced requests are confirmed in your proposal.</p><a href="/#packages">Choose ${esc(p.name)} in the planner ↗</a></div></section>`,'/assets/tech/360-hero-hd.jpg',p.description);
page('collins','Collins','Collins is the Barsys interactive bartender for New York City events: a flat fee per event rather than per guest, held to the menu you are pouring, with iPads, stands, staff on site and your branding included.',COLLINS_BODY,'/assets/tech/360-hero-hd.jpg','A bartender your guests can talk to.');
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
<article><svg aria-hidden="true" class="icon"><use href="#i-check"></use></svg><h3>The Barsys team</h3><p>We bring, set up and take down everything: machines, tablets, mixers, ice and glassware as agreed in your proposal. Spirits are sourced through our liquor store partner, who invoices you directly.</p></article>
</div>
${video('360-serve','A finished drink lifted out of the Barsys 360 and handed to a guest.','21/9')}
</section>

<section class="tech-closing container"><h2>Your next gathering starts here.</h2><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><p>An inquiry is not a booking.</p></section>
</main>
<footer class="site-footer container"><a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="35" src="/assets/logos/HappyHour.Logo.White.png" width="180"/></a><p>GOOD DRINKS. BETTER CONNECTIONS.</p><a href="mailto:${esc(c.email)}">Talk to Fareed<svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><nav aria-label="Explore Barsys" class="footer-policies"><a href="/site/packages.html">Packages</a><a href="/site/mixlists.html">Mixlists</a><a aria-current="page" href="/site/technology.html">Technology</a><a href="/site/about.html">About</a><a href="/site/contact.html">Contact</a><a href="/site/faq.html">FAQ</a></nav><nav aria-label="Policies" class="footer-policies"><a href="/#privacy-policy">Privacy notice</a><a href="/#event-terms">Event service terms</a><a href="/#cancellations">Cancellations &amp; rescheduling</a><a href="/#cookies-storage">Cookies &amp; storage</a><a href="/#accessibility-help">Accessibility &amp; help</a></nav><p class="business-line">Barsys, Inc. · Event inquiries: ${esc(c.email)} · No online bookings or payments.</p><div class="footer-bottom"><span>© 2026 Barsys, Inc. · New York City</span><span>PRODUCT FILMS ARE FROM 360.BARSYS.COM AND SHAKERPRO.BARSYS.COM. SPECIFICATIONS AS PUBLISHED THERE.</span></div></footer>
</body></html>
`);}
techPage();

const ALCOHOL_FAQ_ENTRY=['Who provides the alcohol?','Barsys isn’t a licensed liquor retailer, so spirits are ordered through our liquor store partner on your behalf. They confirm your purchase and send the invoice directly to you, separate from your Barsys package.'];
const EVENTS_FAQ=[['What kinds of events does Barsys serve in New York City?','Corporate events (company celebrations, executive and client events, recruiting nights), brand activations and product launches, holiday parties, private celebrations and zero-proof events. Office happy hours are covered at happyhours.barsys.com.'],['What is included in the per-guest price?','Barsys 360 cocktail machines, tablets, bartending service, the curated mixlists for your package, standard mixers, and setup and cleanup as agreed in your proposal. Spirits are sourced through our liquor store partner, not included in this price. Tax, extra hours and unpriced requests are confirmed in the proposal.'],ALCOHOL_FAQ_ENTRY,['How many guests can an event have?','Standard planning starts at twenty guests. Larger events add machines and staff; formats outside the standard planner are quoted individually.'],['Does sending an inquiry book the date?','No. An inquiry does not hold a date, sign an agreement or take payment. We confirm availability, menus and scope by reply.']];
const CORP_FAQ=[['Can one event serve both cocktails and zero-proof drinks?','Yes. A zero-proof mixlist can take one of your menu slots, and it runs on the same machines with the same service.'],['Do you bring everything to our office?','The Barsys team brings, sets up and takes down machines, tablets, mixers, ice and glassware as agreed in your proposal. The 360 needs one outlet and no plumbing. Spirits are sourced through our liquor store partner, who invoices you directly.'],ALCOHOL_FAQ_ENTRY,['How long is the service?','Packages use a two-hour service baseline. Additional service hours are available on request at $500 per hour and are confirmed in the proposal.'],['Which package suits a client or executive event?','Signature adds a signature cocktail program and premium mixers and garnishes; Reserve adds five curated menus, a dedicated event lead and premium bar presentation.']];
const ACTIVATION_FAQ=[['How are brand activations priced?','Individually. Duration, footfall, number of machines, staffing and any custom menu work are quoted for the format. Standard per-guest packages apply where the event runs as a hosted bar for a known guest list.'],['Can the menu carry our brand?','Reserve includes up to five curated mixlists, which can be named for the launch or campaign. Recipes are confirmed with Barsys; spirit brands are confirmed with our liquor store partner.'],ALCOHOL_FAQ_ENTRY,['Can the machines run zero-proof for a daytime activation?','Yes. Three of the mixlists are zero-proof and run on the same machines.'],['What do you need from the venue?','One outlet per machine and a bar surface. The Barsys 360 has no plumbing or compressor.']];
const HOLIDAY_FAQ=[['When should we book a December holiday party?','As soon as the date is set. December dates go first. Sending an inquiry does not hold a date; we confirm availability by reply.'],['Do you have seasonal menus?','You choose from 27 curated mixlists; Signature and Reserve add premium mixers and dry garnishes. Final recipes are confirmed with Barsys; spirit brands are confirmed with our liquor store partner.'],ALCOHOL_FAQ_ENTRY,['Is there a zero-proof option for guests who are not drinking?','Yes. A zero-proof mixlist can take one of your menu slots and runs on the same machines.'],['What does a holiday party cost?','Classic $55, Signature $85 or Reserve $225 per guest with a two-hour service baseline and a twenty-guest minimum for standard planning. Tax and extras are confirmed in the proposal.']];
const PRIVATE_FAQ=[['Do you do private celebrations, not just companies?','Yes. Milestones, engagements, birthdays and galas. Standard planning starts at twenty guests; smaller gatherings are quoted individually.'],['Can the bar run in a home or a rented loft?','Yes. The Barsys 360 needs one outlet and no plumbing, so it runs in homes, lofts, rooftops and ballrooms.'],['Who serves the drinks?','Barsys bartenders. Guests pick on the tablet, the 360 pours, and the bartender shakes, garnishes and hands it over. Spirits are sourced through our liquor store partner, not purchased by Barsys.'],ALCOHOL_FAQ_ENTRY,['What does a private event cost?','Classic $55, Signature $85 or Reserve $225 per guest with a two-hour service baseline. Formats outside the standard planner are quoted individually.']];
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
`${hubCards}<section class="split"><div><h2>How it works.</h2><p>Guests pick a drink on the tablet. The Barsys 360 pours it to the measure. Bartenders shake, garnish and hand it over. The Barsys team brings, sets up and takes down everything agreed in your proposal: machines, tablets, mixers, ice and glassware. Spirits are sourced through our liquor store partner, who invoices you directly.</p>${packagesLine}</div><div><h2>Real rooms.</h2><p>An office happy hour in a media company\u2019s newsroom, a gala for a library foundation, a US Open watch night on a Midtown rooftop terrace, a mocktail bar inside a fitness studio, a pop-up in a downtown boutique. The films and photos on this site are from real Barsys events.</p><a href="/site/technology.html">The machines we bring ↗</a></div></section>`+faqHtml(EVENTS_FAQ),'/assets/tech/360-hero-hd.jpg','Corporate events, brand activations, holiday parties, private celebrations and zero-proof events in New York City, with the Barsys bar at the center.');
extras.events={faq:EVENTS_FAQ,service:{name:'Barsys event bar service',type:'Event bar service',audience:'Companies, brands and hosts in New York City'}};
page('corporate-events','Corporate event bar service in NYC.','Bar service for company celebrations, executive and client events and recruiting nights in New York City: Barsys 360 cocktail machines, Shaker Pro stations and bartenders, priced per guest.',
`<section class="split"><div><h2>Celebrations, client events, recruiting nights.</h2><p>The same Barsys bar that runs office happy hours scales to the events that matter more: a company milestone for 250, an executive dinner for 150, a client evening for 35, a recruiting night for 30. Guests choose from your event menu on the tablet; the 360 pours each drink to a tenth of an ounce; the team garnishes and serves.</p><ul><li><strong>Company celebrations.</strong> Two or more machines on the bar, a curated menu named for the occasion, bartenders working the room.</li><li><strong>Executive and client events.</strong> Signature or Reserve menus, premium mixers and garnishes, a dedicated event lead on Reserve.</li><li><strong>Recruiting and team nights.</strong> Classic package, two menus, a bar that gives people something to gather around.</li></ul></div><div><h2>What it costs.</h2>${packagesLine}<p>Zero-proof mixlists run on the same machines at no extra menu cost, so every guest is included.</p>${planner}</div></section>`+faqHtml(CORP_FAQ),'/assets/tech/360-dsc5986.jpg','Company celebrations, executive and client events and recruiting nights in New York City, with the Barsys bar priced per guest.');
extras['corporate-events']={faq:CORP_FAQ,service:{name:'Corporate event bar service',type:'Corporate event bar service',audience:'Companies and teams in New York City'}};
page('brand-activations','Brand activations and product launch bars in NYC.','Barsys builds the bar into brand activations, product launches, pop-ups and sponsored events in New York City: the Barsys 360 pouring on camera, Shaker Pro stations and bartenders, quoted for the format.',
`<section class="split"><div><h2>The pour is the moment.</h2><p>A Barsys 360 pouring a drink is the thing people film. For a launch, a pop-up or a sponsored bar, that gives the brand a moment guests share without being asked. We have run the bar inside a fitness studio as a zero-proof mocktail counter, in a downtown boutique for a shopping event, and on a rooftop terrace for a US Open watch night.</p><ul><li><strong>Menus built for the brand.</strong> Up to five curated mixlists on Reserve, named for the launch or the campaign.</li><li><strong>Machines on camera.</strong> The 360 lights the pour and centers the glass; it photographs and films cleanly.</li><li><strong>Setup and teardown by the Barsys team.</strong> Machines, tablets, mixers, ice and glassware as agreed. Spirits are sourced through our liquor store partner, who invoices you directly.</li></ul></div><div><h2>Quoted for the format.</h2><p>Activations rarely fit a two-hour, per-guest format, so they are quoted individually: duration, footfall, number of machines, staffing and any custom menu work. Standard packages (${'Classic $55, Signature $85, Reserve $225 per guest'}) apply where the event runs as a hosted bar for a known guest list.</p><p>Send the brief through the planner and pick the custom-quote path, or email <a href="mailto:${c.email}">${c.email}</a>.</p>${planner}</div></section>`+faqHtml(ACTIVATION_FAQ),'/assets/tech/sp-served-light.jpg','Product launches, pop-ups and sponsored bars in New York City with the Barsys 360 pouring on camera, quoted for the format.');
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
page('faq','Before the first cheers.','Answers to the essentials of planning a Barsys office happy hour: inclusions, menus, dates, custom events and cancellations.',[['What is included?','Packages use a two-hour service baseline: machines, bartenders, mixers, ice, menus, setup and cleanup. Spirits are sourced through our liquor store partner, not included in the package price. Review each package for full inclusions; final scope is confirmed in your proposal.'],['Who provides the alcohol?','Barsys isn’t a licensed liquor retailer, so spirits are ordered through our liquor store partner on your behalf. They confirm your purchase and send the invoice directly to you, separate from your Barsys package.'],['Which menus can I choose?','Select your package in the planner to see current eligible mixlists. Final recipes are confirmed with Barsys; spirit brands are confirmed with our liquor store partner.'],['Does an inquiry hold my date?','No. Sending an inquiry does not reserve a date, sign an agreement, take payment or confirm a liquor order.'],['Can you handle a custom event?','Submit your guest count, venue and requirements. Events outside the standard planning range are reviewed as custom quotes.'],['How do cancellations work?','Deposit, cancellation and rescheduling terms are confirmed in your event proposal and agreement.'],['Where do you operate?','This site focuses on New York City office gatherings. Ask the team to confirm availability for your exact venue.']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join(''),'/assets/lineup.jpg');

// ============================================================

// ============================================================
// Blog system — appended by scaffold task 2026-09-16
// Uses same page shell (sprite, header, footer) but writes to
// site/blog/<slug>.html so URLs are /site/blog/<slug>.html.
// All asset paths in the shared shell are absolute, so depth
// does not matter.
// ============================================================
mkdirSync('site/blog',{recursive:true});

const blogPosts=[];

function blogPost(slug,title,description,body,image,publishedDate){
  const fullSlug='blog/'+slug;
  pages.push({slug:fullSlug,title,description,image,publishedDate});
  blogPosts.push({slug,title,description,image,publishedDate,body});
  const navLinks=nav.map(([id,label])=>{
    const href=id==='blog'?'/site/blog/':`/site/${id}.html`;
    const cur=id==='blog'?' aria-current="page"':'';
    return `<a href="${href}"${cur}>${label}</a>`;
  }).join('');
  const dateStr=new Date(publishedDate+'T12:00:00Z').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
  const html=`<!DOCTYPE html>
<html data-motion="on" lang="en">
<head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="index,follow" name="robots"/><meta content="#080808" name="theme-color"/>
<meta content="${esc(description)}" name="description"/>
<meta content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; frame-src 'none'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'" http-equiv="Content-Security-Policy"/>
<title>${esc(title)} | Barsys</title>
<meta property="og:title" content="${esc(title)} | Barsys"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="article"><meta property="og:image" content="${esc(image)}"><meta property="article:published_time" content="${esc(publishedDate)}">
<link href="/assets/brand-mark.png" rel="icon"/>
<link href="/styles.css" rel="stylesheet"/>
<link href="/v3.css" rel="stylesheet"/>
<link href="/site/site.css" rel="stylesheet"/>
<script defer src="/site/site-nav.js"></script>
</head>
<body class="sub-page blog-post">
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
<div class="sub-hero-media"><img alt="" src="${esc(image)}" fetchpriority="high" width="1600" height="900"></div>
<div class="sub-hero-shade" aria-hidden="true"></div>
<div class="container sub-hero-copy">
<p class="eyebrow">BARSYS / BLOG · ${esc(dateStr)}</p>
<h1 id="sub-title">${esc(title)}</h1>
<p class="sub-lede">${esc(description)}</p>
<div class="sub-ctas"><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a></div>
</div>
</section>
<article class="sub-body container blog-body">${body}</article>
<section class="sub-closing container"><h2>Your next gathering starts here.</h2><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><p>An inquiry is not a booking.</p></section>
<nav class="container blog-back" aria-label="Blog"><a href="/site/blog/">← All posts</a></nav>
</main>
<footer class="site-footer container"><a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="35" src="/assets/logos/HappyHour.Logo.White.png" width="180"/></a><p>GOOD DRINKS. BETTER CONNECTIONS.</p><a href="mailto:${esc(c.email)}">Talk to Fareed<svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><nav aria-label="Explore Barsys" class="footer-policies">${nav.map(([id,label])=>{const href=id==='blog'?'/site/blog/':`/site/${id}.html`;return `<a href="${href}">${label}</a>`;}).join('')}</nav><nav aria-label="Policies" class="footer-policies"><a href="/#privacy-policy">Privacy notice</a><a href="/#event-terms">Event service terms</a><a href="/#cancellations">Cancellations &amp; rescheduling</a><a href="/#cookies-storage">Cookies &amp; storage</a><a href="/#accessibility-help">Accessibility &amp; help</a></nav><p class="business-line">Barsys, Inc. · Event inquiries: ${esc(c.email)} · No online bookings or payments.</p><div class="footer-bottom"><span>© 2026 Barsys, Inc. · New York City</span><span>FILMS AND PHOTOS ARE FROM REAL BARSYS EVENTS. MENUS AND SCOPE ARE CONFIRMED IN YOUR PROPOSAL.</span></div></footer>
</body></html>
`;
  writeFileSync(`site/blog/${slug}.html`,html);
}

// ------------------- POST BODIES -------------------

const POST1_BODY=`
<section class="split"><div>
<h2>Book the date before the calendar closes.</h2>
<p>December runs on a first-come calendar in New York City. Popular Thursdays and Fridays go three to six weeks before they are held; the last two weeks of December sell out earliest. Send the inquiry the day the date is signed off internally. An inquiry does not hold the date or take payment — we reply with availability and the next step.</p>
<p>If you can, send two candidate dates in the inquiry. That doubles the chance of landing the venue window and the bar team you want.</p>
<p>December compresses into a three-week window between the first Monday of December and the last Friday before offices close. That window has to absorb every corporate holiday event in the city; venues, caterers, bar teams and event staff are all quoting against the same handful of Thursdays and Fridays. The week after Thanksgiving is the latest reasonable moment to send the inquiry; the week of is possible but leaves less room to negotiate the mixlist or the venue window.</p>
</div><div>
<h2>Do the guest-count math first.</h2>
<p>The <a href="/site/packages.html">standard packages</a> assume a two-hour service window with a 20-guest minimum. For guest counts above 120, we add a second Barsys 360 machine so the queue at the bar never sits longer than a couple of drinks. Above 200, plan for two machines plus a Shaker Pro station and two bartenders, or a three-hour service window with the extra hour billed at $500.</p>
</div></section>

<section>
<h2>Pick the package the party actually wants.</h2>
<p>Three tiers, priced per guest. Two-hour baseline included; extra hours are $500 each.</p>
<ul>
<li><strong>Classic — $55 per guest.</strong> One curated mixlist, one Barsys 360, one bartender, glassware and garnish. The right choice for a team-only holiday drinks night up to about 60 people, or a low-key client thank-you.</li>
<li><strong>Signature — $85 per guest.</strong> Two or three mixlists, premium mixers, dry garnishes, a second bartender for larger rooms. This is where most office holiday parties land: enough menu variety for a mixed room, still one flat per-guest number.</li>
<li><strong>Reserve — $225 per guest.</strong> Up to five curated mixlists, a dedicated event lead, glass-forward garnishes. The choice for client-facing evenings, executive dinners and milestone celebrations.</li>
</ul>
<p>See the tier comparison on the <a href="/site/packages.html">packages page</a>. Two-hour baseline. Tax and extras are confirmed in the proposal.</p>
</section>

<section class="split"><div>
<h2>Do not skip the zero-proof list.</h2>
<p>Three of the 27 mixlists are zero-proof. They pour on the same Barsys 360 machines, garnished by the same bartenders, priced the same. For a December party this matters: there are always people driving, on medication, pregnant, or simply not drinking that night, and a zero-proof list on the tablet means every guest gets a made drink.</p>
<p>More on the machines and menus at <a href="/site/zero-proof-events.html">zero-proof events</a>.</p>
</div><div>
<h2>Prep the venue.</h2>
<p>The Barsys 360 needs one outlet and no plumbing. It weighs 10 lbs and sits on a 44 x 20 x 43 cm footprint — a two-foot stretch of any bar or credenza. The insulated canisters hold cold for six hours without refrigeration, so a boardroom or a rooftop works equally well. Confirm with building management: after-hours access, a passenger elevator for the equipment, and a cleared bar surface.</p>
</div></div></section>

<section>
<h2>A timeline that actually works.</h2>
<ul>
<li><strong>Six weeks out.</strong> Send the inquiry with date, guest count and venue. We reply with availability and a proposal.</li>
<li><strong>Four weeks out.</strong> Confirm the package tier and pick the mixlists from the library of 27. Signature and Reserve include tastings on request.</li>
<li><strong>Two weeks out.</strong> Lock the guest count and finalize the menu. This is when the bartender scheduling and ingredient orders go in.</li>
<li><strong>Week of.</strong> Share the venue access details, service start time and any custom garnish or brand asks.</li>
<li><strong>Day of.</strong> The Barsys team arrives one hour before service. Setup, service, cleanup are handled.</li>
</ul>
</section>

<section>
<h2>Menu decisions for a December room.</h2>
<p>A December bar reads differently than an April one. The mixlist library has 27 collections; a handful land better at a holiday party than the rest. Warm-toned spirits — bourbon, rye, mezcal — pull ahead of gin and vodka. Cranberry, pomegranate and citrus zest garnishes photograph better against a room in evening lighting. And the zero-proof list matters more in December than any other month: office holiday parties are the events people bring family to, drive to, or attend at the end of a long week when they do not want to overdo it.</p>
<p>On Signature ($85 per guest), the two- or three-mixlist format usually reads: one cocktail-forward menu with a signature bourbon or rye drink, one lighter menu with a gin or vodka drink for the room, and a zero-proof menu on the same 360. On Reserve ($225 per guest), five mixlists gives room for a champagne cocktail, a bespoke drink named for the company, and a full non-alcoholic tier. See <a href="/site/holiday-parties.html">holiday parties</a> for the full format.</p>
</section>

<section class="split"><div>
<h2>What actually happens on the night.</h2>
<p>The Barsys team arrives an hour before service. Two people carry in a 360 and a Shaker Pro station — the 360 is 10 lbs and the whole footprint is 44 x 20 x 43 cm, so this is a two-person job, not a truck job. Canisters get loaded with the mixlist ingredients. The tablet gets paired over Bluetooth 5.0. The garnish tray gets set. Ten minutes before service, the room is a working bar.</p>
<p>Guests walk up, look at the tablet, tap the drink they want, and watch the machine pour. The bartender shakes, strains and garnishes. Peak throughput on one 360 sits at about 30 drinks an hour with a bartender, comfortable for a 60-guest room over two hours. Above that count, we add a second machine or extend the service window with the $500-per-hour add.</p>
</div><div>
<h2>What is not in the per-guest number.</h2>
<p>The per-guest rate covers the bar service, the machines, the ingredients on the chosen mixlists, the bartenders, setup and cleanup. Tax lands on the invoice. Additional service hours are $500 each. A custom-branded garnish program (company logo on ice, printed cocktail napkins, a bespoke recipe named for the occasion) is an itemized line. Venue-imposed charges — freight elevator fees, corkage on outside beer and wine, security minimums for after-hours access — sit with the venue and appear on the proposal for transparency.</p>
<p>There are no online bookings and no online payments. The proposal goes out by email; it is signed off, deposit and terms agreed, before the date is held.</p>
</div></section>

<section>
<h2>Common questions before the inquiry.</h2>
<ul>
<li><strong>Can we run the bar alongside a catered dinner?</strong> Yes. The 360 sits on a two-foot stretch of counter and does not need plumbing, so it works as a stationed bar in a room that is also plated.</li>
<li><strong>Do you handle beer and wine too?</strong> The bar service is cocktail-forward, but we can staff the beer and wine service alongside the 360 on Signature and Reserve if the venue allows outside beverage. If the venue has an in-house beverage program, we integrate with theirs.</li>
<li><strong>What if guest count changes?</strong> The proposal is signed against an estimated count; a final count is locked two weeks before the date. Small deltas (under 10 percent) do not change the tier.</li>
<li><strong>Is a deposit required?</strong> Yes. Deposit, cancellation and rescheduling terms are on the proposal. An inquiry does not take payment; the proposal does.</li>
</ul>
</section>

<section class="split"><div>
<h2>Talk to the team.</h2>
<p>Email <a href="mailto:contact@barsys.com">contact@barsys.com</a> or call +1 315-304-3820. Barsys, Inc., 44 W 37th St, New York, NY 10018.</p>
</div><div>
<h2>Send two dates.</h2>
<p>December calendars are tight. Include a first-choice and a fallback date in the inquiry; the team will come back with availability against both and a proposal for the tier and mixlists that fit the guest count.</p>
</div></section>
`;

const POST2_BODY=`
<section class="split"><div>
<h2>The machine in one paragraph.</h2>
<p>The Barsys 360 is a countertop cocktail machine with six insulated 25-ounce canisters (152 ounces of total liquid capacity), a pour head calibrated to one-tenth of an ounce, and a tablet interface running the Barsys app. It pairs over Bluetooth 5.0 with any iPad or Android tablet. It weighs 10 lbs. It measures 44 x 20 x 43 cm. It needs one outlet and no plumbing. The canisters hold temperature for six hours without a compressor, so nothing needs to be plugged into a refrigerator and nothing sweats onto the bar.</p>
</div><div>
<h2>What actually gets poured.</h2>
<p>Cocktails from the mixlist you picked. The pour is measured to a tenth of an ounce, which is the tolerance a bartender aims for and rarely hits under time pressure. Each of the six canisters is loaded with one ingredient — a spirit, a juice, a syrup, a bitter. When a guest picks a drink on the tablet, the head dispenses each ingredient in sequence to the recipe. The bartender takes it from the head, shakes it if the recipe calls for shaking, and finishes it with the garnish.</p>
</div></section>

<section>
<h2>Four steps, in order.</h2>
<ul>
<li><strong>Pair.</strong> Plug the 360 into one outlet. Open the Barsys app on the tablet (iOS or Android; 2,000+ recipes in the library). Bluetooth 5.0 connects in a few seconds.</li>
<li><strong>Pick.</strong> Guests browse the mixlist on the tablet and tap the drink they want. Or the Barbot AI mode composes something from what is loaded, if you want the party to lean on suggestions.</li>
<li><strong>Load.</strong> Spirits, juices, mixers and syrups go into the six canisters. For a two-menu evening on the Signature package, that is usually three spirits and three modifiers per menu window.</li>
<li><strong>Pour.</strong> The head measures to one-tenth of an ounce. The bartender shakes, strains, garnishes and hands over the glass.</li>
</ul>
</section>

<section class="split"><div>
<h2>The bartender's job did not go away.</h2>
<p>The machine does the measuring and the theatre. The bartender does everything the machine cannot: reading the room, adjusting the queue, shaking properly cold, choosing the garnish, handing the drink over with a name and a smile. On a well-staffed evening, a bartender at the 360 is faster and more consistent than a bartender at a well stocked with the same six bottles — the pour is exact and never spills.</p>
</div><div>
<h2>Where the Shaker Pro fits.</h2>
<p>Alongside the 360, the Shaker Pro is a smart shaker for the drinks that want individual attention. It pours to about one-thirtieth of an ounce (roughly 1 mL) and gives the bartender three light cues — start, close, stop — for the shake. On Signature and Reserve events, the Shaker Pro handles the two or three signature drinks that the room orders most, so the 360 stays free for everyone else.</p>
</div></section>

<section>
<h2>Three events, three uses of the machine.</h2>
<ul>
<li><strong>250-person company milestone.</strong> Two 360 machines on the main bar, one Shaker Pro station on a satellite table. Signature package. Four mixlists loaded across the two machines. Two bartenders on the 360s, one on the Shaker Pro. Peak throughput held at under two minutes from tap to glass.</li>
<li><strong>150-person executive dinner.</strong> One 360 and one Shaker Pro. Reserve package. Five curated mixlists, a dedicated event lead. The pour was on camera for a room that wanted the machine to be part of the moment.</li>
<li><strong>35-person client evening.</strong> One 360, one bartender, Classic package. Two-hour service. One curated mixlist plus a zero-proof list, so every guest in the room had something they wanted.</li>
</ul>
<p>Details on packages at <a href="/site/packages.html">Classic, Signature and Reserve</a>. Details on the equipment at <a href="/site/technology.html">technology</a>. More on the corporate format at <a href="/site/corporate-events.html">corporate events</a>.</p>
</section>

<section class="split"><div>
<h2>Why a tenth of an ounce matters.</h2>
<p>A well-poured cocktail is a balance of a spirit and a modifier. The classic Manhattan is two ounces of rye to one ounce of vermouth. Miss the pour by a quarter-ounce on the vermouth and the drink is bitter or flabby. A one-tenth calibration means the 90th drink of the night tastes like the first, which is the whole point of asking a machine to help.</p>
</div><div>
<h2>Why no plumbing matters.</h2>
<p>The machine runs in a boardroom, a loft, a rooftop, a residential kitchen and a photo studio. That has translated into events in places without a bar sink: a fitness studio hosting a mocktail evening, a downtown boutique for a shopping night, a rooftop terrace for a US Open watch party. One outlet and a two-foot stretch of counter is the whole footprint.</p>
</div></section>

<section>
<h2>What guests see, tap-by-tap.</h2>
<p>The tablet interface is the guest-facing surface of the whole system. When a guest walks up, they see the mixlist for the evening — one, two, three or five collections depending on the package — with a card for each drink: name, a one-line description, and the visual signature. They tap the card. The machine begins pouring in about a second. The pour takes eight to twelve seconds depending on ingredient count. The bartender takes the glass off the head, shakes over ice if the recipe wants it, strains, garnishes, and passes it across. The whole flow, from tap to glass in hand, is about 90 seconds.</p>
<p>There is a Barbot AI mode on the tablet that composes a drink from what is loaded into the six canisters — useful when a guest wants something outside the mixlist. The recipe engine draws from the Barsys app library of 2,000+ recipes. On a Reserve event, the event lead can build a custom recipe into the mixlist ahead of the night, so the bespoke drink shows up in the same tablet flow.</p>
</section>

<section class="split"><div>
<h2>The queue problem, solved by measurement.</h2>
<p>The reason a home bar backs up at a party is not that the host is slow; it is that free pouring is inconsistent. A generous pour on drink four means less spirit for drink eight, which means an apology and a second attempt, which means a queue. The 360 does not have that failure mode. Every pour is the same to a tenth of an ounce, so throughput is a function of ingredient count and bartender speed on garnish, not of pour accuracy.</p>
<p>For a 150-person room over two hours on Signature, one 360 with a bartender and one Shaker Pro station with a second bartender clears the queue. For a 250-person room, two 360s with two bartenders and one Shaker Pro station with a third bartender does the same. The math scales linearly, which is the whole point.</p>
</div><div>
<h2>Setup and load-out.</h2>
<p>Setup runs about 45 minutes: unload the machines, plug in, pair over Bluetooth 5.0, load the six canisters per machine, cut and prep garnish, set glassware, calibrate the tablet mixlists. Load-out runs about 30 minutes: canisters back into the case, machines back on the cart, garnish and glassware into the crates. The Barsys team handles both. Nothing left behind; nothing for the venue to deal with in the morning.</p>
</div></section>

<section>
<h2>The specs, one more time, for search.</h2>
<ul>
<li>Six 25-ounce insulated canisters (152 ounces of total liquid capacity per machine)</li>
<li>One-tenth-ounce pour calibration on every ingredient</li>
<li>Six hours of cold with no refrigeration required</li>
<li>Bluetooth 5.0 pairing with iOS or Android tablets</li>
<li>10 lbs total weight; 44 x 20 x 43 cm footprint</li>
<li>One outlet; no plumbing; no drain</li>
<li>Barsys app pairing with 2,000+ recipes in the library</li>
<li>Shaker Pro companion: pour to about one-thirtieth of an ounce (roughly 1 mL); three light cues for start, close and stop of the shake</li>
</ul>
<p>More on the equipment at <a href="/site/technology.html">technology</a>. More on the corporate format at <a href="/site/corporate-events.html">corporate events</a>.</p>
</section>
`;

const POST3_BODY=`
<section class="split"><div>
<h2>The three prices, in one line.</h2>
<p>Classic $55 per guest. Signature $85 per guest. Reserve $225 per guest. Two-hour service baseline. Twenty-guest minimum for standard planning. Additional service hours are $500 each.</p>
</div><div>
<h2>What "per guest" actually includes.</h2>
<p>The per-guest number is the flat rate for the bar service: the Barsys 360 cocktail machine, the ingredients on the chosen mixlists, the bartender or bartenders, glassware, garnish, setup and cleanup. It does not vary by drink count. A guest who has one drink and a guest who has four pay the same because you are not counting drinks — you are booking the service.</p>
</div></section>

<section>
<h2>What each tier gets you.</h2>
<ul>
<li><strong><a href="/site/classic.html">Classic — $55 per guest.</a></strong> One curated mixlist from the library of 27. One Barsys 360 machine. One bartender. Setup and cleanup. The choice for a team-only evening, a low-key thank-you, or a bar that runs alongside a food menu that is doing most of the work.</li>
<li><strong><a href="/site/signature.html">Signature — $85 per guest.</a></strong> Two or three mixlists, premium mixers, dry garnishes, a second bartender for larger rooms, and a Shaker Pro station for the signature drink of the evening. Most office happy hours and holiday parties land here.</li>
<li><strong><a href="/site/reserve.html">Reserve — $225 per guest.</a></strong> Up to five curated mixlists, a dedicated event lead running the room, glass-forward garnishes, and the option of a custom drink named for the occasion. Client dinners, executive gatherings, milestone celebrations.</li>
</ul>
<p>See the tier-by-tier comparison on <a href="/site/packages.html">packages</a>.</p>
</section>

<section class="split"><div>
<h2>What is confirmed in the proposal.</h2>
<p>Tax lands on the invoice. Additional service hours are $500 each — a three-hour evening is the two-hour rate plus $500, a four-hour evening is plus $1,000. Freight elevator fees, after-hours building access, corkage on any beer or wine you bring in yourselves, and any custom garnish or branded ingredient work are itemized in the proposal. There are no online bookings and no online payments; the proposal goes out by email and is signed off before the date is held.</p>
</div><div>
<h2>How it compares to hiring a bartender.</h2>
<p>A freelance bartender in New York City runs roughly $75 to $150 an hour with a three- to four-hour minimum, plus a bar rental, plus every bottle and mixer and garnish sourced separately by whoever is hosting. Add the two or three trips to the liquor store, the borrowed shaker, the ice you forgot, and the last guest asking for a drink that requires the ingredient you did not buy. The per-guest number closes all of that in advance.</p>
</div></section>

<section>
<h2>Hidden costs to watch for elsewhere.</h2>
<ul>
<li><strong>Bar rental.</strong> Portable bars run $200 to $600 for the evening if the venue does not have one. The Barsys 360 sits on any two-foot counter — no bar rental is needed.</li>
<li><strong>Ingredient over-buy.</strong> Hosts consistently buy 20 to 40 percent more spirit than a room drinks. In a per-guest model, that risk sits with us, not with you.</li>
<li><strong>Ice and glassware.</strong> Rental glassware is $0.50 to $2 per piece plus a delivery fee. Included at every tier here.</li>
<li><strong>Cleanup labor.</strong> A separate line on many bar-service quotes. Included here.</li>
<li><strong>Corkage.</strong> If the venue has an in-house bar and you bring in your own service, corkage on outside beer or wine can be $10 to $25 a bottle. That is on the venue, not on us — worth asking before the venue is signed.</li>
</ul>
</section>

<section>
<h2>Why per-guest is the right unit.</h2>
<p>Two questions decide bar-service cost: how many people are drinking, and for how long. Per-guest pricing collapses the first question into a single flat rate and lets the room size the room. It also removes the incentive for the bar team to under-pour or run short on ingredients, which is the failure mode most hosts fear about hosted-bar service. When the number is per guest and not per drink, the bar team wants every guest to have three or four drinks over two hours — that is the healthy service window.</p>
<p>Per-hour bartender pricing pushes the opposite direction: fewer drinks per hour means more overtime, so the bar goes slow. Per-consumption pricing means the host is doing running math all night. Per-guest, priced against a fixed service window, is the model that lets everyone in the room forget the bar is a line item.</p>
</section>

<section>
<h2>How the two-hour baseline compares to reality.</h2>
<p>Two hours is the modal length of a hosted-bar corporate event in New York City. It fits a 5-to-7 or 6-to-8 window on a weeknight without pushing venues past their standard access hours. It covers the peak of drink orders, which lands in the first 40 minutes and the last 30 minutes of any bar service — the arrival rush and the &quot;one more before we go&quot; rush. And it stays inside the alcohol-service liability window most companies have signed off on internally.</p>
<p>When the event wants to push longer, the $500-per-hour add is the right call. Three hours reads as an event with a real conversation window. Four hours reads as a full evening and usually only makes sense if food service overlaps meaningfully. The additional-hour cost is flat regardless of guest count, so it gets cheaper per head as the room grows — $500 across 150 guests is $3.33 per head.</p>
</section>

<section>
<h2>Sample budgets for real event sizes.</h2>
<ul>
<li><strong>35-person client evening, Classic, two hours.</strong> 35 × $55 = $1,925. One 360, one bartender, one curated mixlist. Add tax and any venue charges in the proposal.</li>
<li><strong>60-person team happy hour, Signature, two hours.</strong> 60 × $85 = $5,100. One 360, two bartenders, two mixlists plus a zero-proof list, Shaker Pro station for the signature drink.</li>
<li><strong>150-person executive dinner, Reserve, three hours.</strong> 150 × $225 = $33,750, plus $500 for the third hour, for $34,250. Two 360s, one Shaker Pro, a dedicated event lead, up to five curated mixlists, glass-forward garnishes.</li>
<li><strong>250-person company milestone, Signature, three hours.</strong> 250 × $85 = $21,250, plus $500 for the third hour, for $21,750. Two 360s, two bartenders on the machines, one on the Shaker Pro station, three or four mixlists including a zero-proof list.</li>
</ul>
<p>Each budget is the bar service line. Tax and venue-imposed charges go in the proposal.</p>
</section>

<section class="split"><div>
<h2>How to choose between tiers.</h2>
<p>The tier decision is a function of two things: what the event is for, and how much menu variety the room wants. If the event is a working team happy hour and everyone knows each other, one mixlist and one bartender on Classic is enough. If the event is a client dinner or a milestone celebration and the guest list is heterogeneous, two or three mixlists on Signature reads better. If the event is client-facing, executive-attended or a moment the company wants to remember, five mixlists on Reserve gives room for a champagne toast, a bespoke drink named for the occasion, and a proper zero-proof tier.</p>
</div><div>
<h2>Small events and custom formats.</h2>
<p>Standard planning starts at 20 guests. Below that, or for anything outside the two-hour hosted-bar format — a full-day activation, a multi-station brand launch, a two-city tour — the pricing is quoted individually against duration, footfall, number of machines and staffing. Send the brief through the planner and pick the custom-quote path.</p>
</div></section>

<section>
<h2>What to send in the inquiry to get a number back fast.</h2>
<p>The team can turn a proposal around inside a business day if the inquiry has the four facts we need: date (or two candidate dates), guest count (best estimate is fine), venue address in New York City, and the tier the host has in mind. If the venue is not confirmed yet, that is fine — mention the neighborhood and floor type, and we can price against a typical footprint.</p>
<p>What the inquiry does not need: exact final guest count, final mixlist selection, or a signed venue contract. Those are all locked in the proposal-and-planning phase, after the date is held.</p>
</section>

<section class="split"><div>
<h2>The tech included in every tier.</h2>
<p>Every tier ships the Barsys 360 — same 152 ounces of canister capacity, same one-tenth-ounce pour, same six hours of cold without a refrigerator. Larger rooms on Signature and Reserve add a second 360 and a Shaker Pro station. Nothing about the machines changes tier to tier; what changes is the number of mixlists, the number of bartenders, the level of event leadership, and the depth of the garnish and glassware program. See <a href="/site/technology.html">technology</a> for the equipment detail.</p>
</div><div>
<h2>Talk numbers with the team.</h2>
<p>Email <a href="mailto:contact@barsys.com">contact@barsys.com</a> or call +1 315-304-3820. Barsys, Inc., 44 W 37th St, New York, NY 10018. Include the date, guest count and venue if you have them, and the team replies with availability and a proposal against the numbers above.</p>
</div></section>
`;

const POST4_BODY=`
<section class="split"><div>
<h2>Three zero-proof mixlists, one bar.</h2>
<p>Of the 27 curated mixlists in the library, three are zero-proof: <strong>Fluid Code</strong>, <strong>A Summer Mocktail Mixlist</strong> and <strong>Boisson Non-Alcoholic Agave Lover's</strong>. Any of the three runs on the same Barsys 360 cocktail machines and the same Shaker Pro stations as the alcoholic mixlists. Same six 25-ounce canisters, same one-tenth-ounce pour, same bartenders behind the bar shaking and garnishing. The only thing that changes is what goes in the canisters.</p>
</div><div>
<h2>What is in each mixlist.</h2>
<p><strong>Fluid Code</strong> leans on non-alcoholic bitters, botanicals and citrus — the drink is complex and dry, closer to a stirred cocktail than a soft drink. <strong>A Summer Mocktail Mixlist</strong> reads brighter and more juice-forward for daytime events and warm rooms. <strong>Boisson Non-Alcoholic Agave Lover's</strong> is the mixlist for anyone who would order a mezcal or a tequila cocktail if they were drinking — smoky, savory, worked around Boisson's non-alcoholic agave spirits.</p>
</div></section>

<section>
<h2>The case for a zero-proof bar at an office event.</h2>
<ul>
<li><strong>Wellness events.</strong> A launch tied to a training, a health-benefits day, a mindfulness workshop. Guests notice when the bar reads the room instead of trying to change it.</li>
<li><strong>Daytime activations.</strong> Morning demos, lunchtime brand launches, mid-afternoon offsites. A zero-proof menu keeps the energy honest and lets people go back to work.</li>
<li><strong>Mixed teams.</strong> Every guest list in New York City includes people who do not drink — new parents, people in recovery, guests on medication, colleagues who are driving, colleagues who are fasting. A zero-proof list on the tablet is the answer that does not single anyone out.</li>
<li><strong>Client-facing evenings.</strong> A prospect who is not drinking should not be handed a soda in a plastic cup while the rest of the room drinks cocktails. On the same machine, in the same glass, that problem disappears.</li>
</ul>
<p>More on the format at <a href="/site/zero-proof-events.html">zero-proof events</a>.</p>
</section>

<section class="split"><div>
<h2>Same equipment, same theatre.</h2>
<p>The Barsys 360 pours a Fluid Code drink the same way it pours a Manhattan: the guest picks on the tablet, the six canisters dispense each ingredient to a tenth of an ounce, the bartender shakes or stirs to the recipe and finishes the glass with the garnish. The pour is what people photograph, and the pour is identical. That matters because the point of the machine at an event is that every guest gets a made drink, and the made drink looks the same whether or not it has proof in it.</p>
</div><div>
<h2>The tech, briefly.</h2>
<p>Barsys 360: six 25-ounce insulated canisters (152 ounces total), one-tenth-ounce pour calibration, six hours of cold with no refrigeration, Bluetooth 5.0, 10 lbs, 44 x 20 x 43 cm footprint, one outlet, no plumbing. Pairs with the Barsys app on iOS and Android. See <a href="/site/technology.html">technology</a> for the longer read.</p>
</div></section>

<section>
<h2>Priced the same as the cocktail menus.</h2>
<p>A zero-proof mixlist counts as a menu slot in your <a href="/site/packages.html">package</a>. The per-guest rate is unchanged: Classic $55, Signature $85, Reserve $225. Two-hour service baseline. Twenty-guest minimum. Additional service hours $500 each. On Signature and Reserve, a zero-proof menu can be one of the two, three or five slots — alongside cocktail menus — or the entire lineup can be zero-proof if that is what the event is about.</p>
<p>We have run a fully zero-proof mocktail bar inside a fitness studio for a launch. We have run a Signature evening for a 150-person team dinner where one of three menus was Fluid Code and drink orders split roughly evenly across the three. Both are the same service format.</p>
</section>

<section>
<h2>How a zero-proof menu changes the guest flow.</h2>
<p>At a mixed event with a zero-proof menu on the tablet alongside two cocktail menus, the split usually lands around 20 to 30 percent zero-proof orders. That is higher than most hosts expect. Part of it is the room being honest — a guest who was going to nurse one glass of wine all night orders a Fluid Code instead. Part of it is the machine being the machine — the pour is the same, the garnish is the same, the moment is the same, so no one signals to the room that they are the person not drinking.</p>
<p>The practical consequence is that a zero-proof menu takes weight off the cocktail queue. On a 150-person Signature evening, adding a zero-proof menu as the third mixlist shifts roughly 30 to 45 drinks to the zero-proof column, which shortens the wait for everyone else too.</p>
</section>

<section class="split"><div>
<h2>Menu construction for a fully zero-proof evening.</h2>
<p>A fully zero-proof evening on Classic is one of the three mixlists loaded across the machine. On Signature, it is two or three of the mixlists — usually one dry and stirred (Fluid Code), one bright and citrusy (A Summer Mocktail Mixlist), and one savory and complex (Boisson Non-Alcoholic Agave Lover&#39;s). On Reserve, all five slots can be zero-proof, which gives room for a bespoke non-alcoholic recipe named for the event alongside the three curated collections.</p>
<p>The garnish program is unchanged: dry-cut citrus, brûléed rosemary, black-pepper rims, edible flowers on the summer menu. That matters because a mocktail that looks like a mocktail — a lime wedge on the rim of a highball with a splash of soda — reads as a compromise. A drink that comes off the 360 with a proper stir, a proper glass and a proper garnish does not read as a compromise. It reads as the drink.</p>
</div><div>
<h2>Format examples from real events.</h2>
<p>A fitness studio in downtown Manhattan booked a fully zero-proof activation as the closing party for a training weekend. One 360, two mixlists (A Summer Mocktail Mixlist and Boisson Non-Alcoholic Agave Lover&#39;s), one bartender, two-hour service, Classic package for a 30-person room.</p>
<p>A 150-person executive dinner ran on Signature with three mixlists — a bourbon-forward cocktail menu, a gin-forward cocktail menu, and Fluid Code as the zero-proof list. About 40 of the 150 orders came off the Fluid Code menu, without the host having to point anyone to it.</p>
<p>A 30-person recruiting night on Classic used a single zero-proof mixlist (A Summer Mocktail Mixlist) because the event ran at 5 pm on a Tuesday and the host did not want to send candidates back to the subway a drink in.</p>
</div></section>

<section>
<h2>Why the same machine matters.</h2>
<p>Two things fail when a zero-proof program runs on separate equipment. First, the bar splits visually — one station is the &quot;real&quot; bar with the interesting machine, and another is the mocktail table with a pitcher and a stack of napkins. Guests read that split instantly. Second, the operations split — the alcoholic queue and the zero-proof queue move at different speeds, and the room notices which one is longer. Neither happens when Fluid Code pours off the same 360 as the Manhattan, at the same speed, with the same measurement, to the same glass.</p>
<p>This is the argument for zero-proof-as-a-menu-slot rather than zero-proof-as-an-afterthought. The <a href="/site/zero-proof-events.html">zero-proof events page</a> covers the full format.</p>
</section>

<section class="split"><div>
<h2>Browse the mixlist library.</h2>
<p>See the full library at <a href="/site/mixlists.html">mixlists</a>. Fluid Code, A Summer Mocktail Mixlist and Boisson Non-Alcoholic Agave Lover&#39;s are all listed alongside the cocktail mixlists. Package eligibility is shown against each mixlist in the planner; final recipes and any spirit-brand asks are confirmed with your event team.</p>
</div><div>
<h2>Talk to the team.</h2>
<p>Email <a href="mailto:contact@barsys.com">contact@barsys.com</a> or call +1 315-304-3820. Barsys, Inc., 44 W 37th St, New York, NY 10018. Include the date, guest count and venue if you have them, and mention if you want a fully zero-proof evening or a zero-proof menu alongside cocktails.</p>
</div></section>
`;

blogPost('how-to-plan-nyc-office-holiday-party-bar',
  'How to Plan an NYC Office Holiday Party Bar (2026 Guide)',
  'A step-by-step guide to booking bar service for your NYC office holiday party — timing, guest counts, package selection, and what to expect.',
  POST1_BODY,
  '/assets/curated/posters/galentines.jpg',
  '2026-09-16');

blogPost('barsys-360-what-it-pours-at-corporate-event',
  'What a Barsys 360 Actually Pours at a Corporate Event',
  'The Barsys 360 pours cocktails to 1/10th of an ounce from 6 insulated canisters — here\u2019s how it works at a real NYC corporate event.',
  POST2_BODY,
  '/assets/tech/360-hero-hd.jpg',
  '2026-09-16');

blogPost('corporate-open-bar-pricing-nyc',
  'Corporate Open Bar Pricing in NYC — What to Actually Expect',
  'Per-guest pricing for corporate open bar in NYC: Classic $55, Signature $85, Reserve $225. What\u2019s included, what\u2019s extra, and how to budget.',
  POST3_BODY,
  '/assets/tech/360-hero-hd.jpg',
  '2026-09-16');

blogPost('zero-proof-mocktail-bar-office-event',
  'Zero-Proof and Mocktail Bar for the Modern Office Event',
  'Three zero-proof mixlists on the same Barsys 360 machines \u2014 Fluid Code, Summer Mocktails, Boisson NA Agave. Same theatre, no proof, priced the same.',
  POST4_BODY,
  '/assets/tech/sp-instrument-light.jpg',
  '2026-09-16');

// ------------------- BLOG INDEX -------------------
{
  const navLinks=nav.map(([id,label])=>{
    const href=id==='blog'?'/site/blog/':`/site/${id}.html`;
    const cur=id==='blog'?' aria-current="page"':'';
    return `<a href="${href}"${cur}>${label}</a>`;
  }).join('');
  const cardsHtml=blogPosts.map(p=>{
    const dateStr=new Date(p.publishedDate+'T12:00:00Z').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
    return `<article class="blog-card"><a href="/site/blog/${p.slug}.html"><img src="${esc(p.image)}" alt="" width="720" height="405" loading="lazy"><p class="eyebrow">${esc(dateStr)}</p><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><span class="blog-more">Read <span aria-hidden="true">↗</span></span></a></article>`;
  }).join('');
  const indexTitle='The Barsys blog.';
  const indexDesc='Field notes from Barsys on bar service in New York City: planning, pricing, the machines and zero-proof menus.';
  const heroImg='/assets/lineup.jpg';
  const html=`<!DOCTYPE html>
<html data-motion="on" lang="en">
<head>
<meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="index,follow" name="robots"/><meta content="#080808" name="theme-color"/>
<meta content="${esc(indexDesc)}" name="description"/>
<meta content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; frame-src 'none'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'" http-equiv="Content-Security-Policy"/>
<title>${esc(indexTitle)} | Barsys</title>
<meta property="og:title" content="${esc(indexTitle)} | Barsys"><meta property="og:description" content="${esc(indexDesc)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(heroImg)}">
<link href="/assets/brand-mark.png" rel="icon"/>
<link href="/styles.css" rel="stylesheet"/>
<link href="/v3.css" rel="stylesheet"/>
<link href="/site/site.css" rel="stylesheet"/>
<style>
.blog-index-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:2rem;margin:2rem 0}
.blog-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;transition:transform .2s,border-color .2s}
.blog-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.2)}
.blog-card a{color:inherit;text-decoration:none;display:block}
.blog-card img{width:100%;height:auto;display:block;aspect-ratio:16/9;object-fit:cover}
.blog-card .eyebrow{padding:1rem 1.25rem 0;margin:0;font-size:.75rem;letter-spacing:.08em;opacity:.6}
.blog-card h2{padding:.5rem 1.25rem 0;margin:0;font-size:1.25rem;line-height:1.3}
.blog-card p{padding:.5rem 1.25rem;margin:0;opacity:.75;font-size:.95rem;line-height:1.5}
.blog-card .blog-more{display:inline-block;padding:.5rem 1.25rem 1.25rem;font-weight:500}
.blog-body h2{margin-top:2.5rem}
.blog-body ul{line-height:1.7}
.blog-back{padding:2rem 0;opacity:.7}
</style>
<script defer src="/site/site-nav.js"></script>
</head>
<body class="sub-page blog-index">
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
<h1 id="sub-title">${esc(indexTitle)}</h1>
<p class="sub-lede">${esc(indexDesc)}</p>
</div>
</section>
<div class="sub-body container">
<div class="blog-index-grid">${cardsHtml}</div>
</div>
<section class="sub-closing container"><h2>Your next gathering starts here.</h2><a class="button" href="/#proposal">Plan my event <svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><p>An inquiry is not a booking.</p></section>
</main>
<footer class="site-footer container"><a aria-label="Happy Hour by Barsys, home" class="brand brand-happyhour" href="/"><img alt="HappyHour by Barsys" height="35" src="/assets/logos/HappyHour.Logo.White.png" width="180"/></a><p>GOOD DRINKS. BETTER CONNECTIONS.</p><a href="mailto:${esc(c.email)}">Talk to Fareed<svg aria-hidden="true" class="icon"><use href="#i-up-right"></use></svg></a><nav aria-label="Explore Barsys" class="footer-policies">${nav.map(([id,label])=>{const href=id==='blog'?'/site/blog/':`/site/${id}.html`;return `<a href="${href}">${label}</a>`;}).join('')}</nav><nav aria-label="Policies" class="footer-policies"><a href="/#privacy-policy">Privacy notice</a><a href="/#event-terms">Event service terms</a><a href="/#cancellations">Cancellations &amp; rescheduling</a><a href="/#cookies-storage">Cookies &amp; storage</a><a href="/#accessibility-help">Accessibility &amp; help</a></nav><p class="business-line">Barsys, Inc. · Event inquiries: ${esc(c.email)} · No online bookings or payments.</p><div class="footer-bottom"><span>© 2026 Barsys, Inc. · New York City</span><span>FILMS AND PHOTOS ARE FROM REAL BARSYS EVENTS. MENUS AND SCOPE ARE CONFIRMED IN YOUR PROPOSAL.</span></div></footer>
</body></html>
`;
  writeFileSync('site/blog/index.html',html);
  // Also register blog index in pages.json so it flows into sitemap
  pages.push({slug:'blog/',title:indexTitle,description:indexDesc,image:heroImg});
}
console.log(`Built ${blogPosts.length} blog posts + blog index at site/blog/`);
for(const p of pages)Object.assign(p,extras[p.slug]||{});
writeFileSync('site/pages.json',JSON.stringify(pages,null,2)+'\n');
console.log(`Built ${pages.length} public content pages; indexing remains disabled.`);
