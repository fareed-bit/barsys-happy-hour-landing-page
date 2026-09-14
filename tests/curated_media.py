"""V3.7 media integration QA. No live requests, no mocked video, no autoplay bypass.
The browser forbids file:// URLs in this environment, so the complete standalone
HTML is loaded with set_content. External mixlist artwork is deliberately blocked.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil, json
P=Path(__file__).resolve().parents[1];O=P/'qa';O.mkdir(exist_ok=True)
H=(P/'Barsys-After-Hours-V3-9-Codex-Ready.html').read_text()
report={'checks':[], 'widths':[], 'pageErrors':[], 'limits':['Chromium only; no Safari/iOS hardware test.','file:// navigation is blocked by browser administration; complete HTML tested via set_content.','External mixlist artwork deliberately blocked. No CDN availability claim.','No live submissions or analytics.']}
def ok(s):
 report['checks'].append(s);print('PASS',s,flush=True);(O/'curated-media-report.json').write_text(json.dumps(report,indent=2))
def load(p):
 p.route('https://**/*',lambda route:route.abort());p.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
 p.set_content(H,wait_until='domcontentloaded',timeout=45000);p.wait_for_function('() => window.BarsysHero && window.BarsysPlanner && window.BarsysExperience');p.set_default_timeout(10000)
 p.evaluate("document.documentElement.style.scrollBehavior='auto'")
def top(p):p.evaluate('window.scrollTo({top:0,behavior:"instant"})');p.wait_for_timeout(100)
def center(p,selector):p.evaluate('(s)=>document.querySelector(s).scrollIntoView({block:"center",behavior:"instant"})',selector);p.wait_for_timeout(200)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1440,'height':1080},reduced_motion='no-preference');load(p)
 p.wait_for_function("() => document.getElementById('hero-video').currentTime > .15",timeout=15000)
 assert p.locator('[data-scene]').count()==4 and p.locator('[data-carousel-video]').count()==3
 assert p.locator('[data-experience-video]').count()==4 and p.locator('.snapshot-card').count()==6
 assert p.evaluate("document.getElementById('hero-video').muted && document.getElementById('hero-video').src === BARSYS_MEDIA.hero.previewSrc")
 assert p.evaluate("Math.abs(document.getElementById('hero-video').duration - 6.5) < .15")
 ok('Hero autoplays the 6.5-second edited NYC cut, with no opening, dining insert or logo tail.')
 for idx,key in [(1,'office'),(3,'gala')]:
  top(p);p.locator(f'[data-go-scene="{idx}"]').click();p.wait_for_function('(key)=>{const v=document.querySelector(`[data-carousel-video="${key}"]`);return !v.paused && v.currentTime>.15}',arg=key)
  assert p.evaluate("[...document.querySelectorAll('[data-carousel-video]')].filter(v=>!v.paused).length")==1
  assert not p.evaluate('BarsysHero.state().rotating')
 ok('Office and gala videos autoplay after manual selection; only the active hero film plays and rotation stops.')
 top(p);p.locator('[data-go-scene="2"]').click();p.locator('#hero-open-photo').click()
 assert p.locator('#photo-dialog').is_visible();assert p.locator('#photo-dialog-title').inner_text()=='Cheers to the city.'
 assert p.locator('#lightbox-photo').evaluate('(im)=>im.complete && im.naturalWidth>0')
 p.locator('#close-photo').click();assert p.evaluate('document.activeElement.id')=='hero-open-photo'
 ok('Skyline photo opens the correct full photograph; dialog returns keyboard focus to its trigger.')
 # Each modal opens its full film, not the shortened inline preview.
 for idx,key in [(0,'hero'),(1,'office'),(3,'gala')]:
  top(p);p.locator(f'[data-go-scene="{idx}"]').click();p.locator('#hero-open-film').click();p.wait_for_function('() => document.querySelector("#film-player video")?.currentTime > .1')
  assert p.evaluate('(key)=>document.querySelector("#film-player video").src===BARSYS_MEDIA[key].src',key)
  assert p.evaluate("[...document.querySelectorAll('[data-carousel-video]')].every(v=>v.paused)")
  p.locator('#close-film').click()
 ok('All three hero dialogs open complete films and pause the background carousel.')
 center(p,'#experience-reel-rail');p.wait_for_function('() => BarsysExperience.state().clips.filter(c=>!c.paused && c.time>.1).length===4',timeout=15000)
 assert p.evaluate("[...document.querySelectorAll('[data-experience-video]')].every(v=>v.src===BARSYS_MEDIA[v.dataset.experienceVideo].previewSrc && v.muted && v.loop && v.playsInline)")
 assert p.evaluate("[...document.querySelectorAll('[data-carousel-video]')].every(v=>v.paused)")
 keys=['experienceSelect','experiencePour','experienceFinish','experienceCheers']
 for key in keys:
  p.locator(f'[data-reel-pause="{key}"]').click();p.wait_for_timeout(100);assert p.locator(f'[data-experience-video="{key}"]').evaluate('(v)=>v.paused')
  p.locator(f'[data-reel-pause="{key}"]').click();p.wait_for_timeout(100)
  p.locator(f'#event-gallery [data-open-film="{key}"]').click();p.wait_for_function('() => document.querySelector("#film-player video")?.readyState >= 2')
  assert p.evaluate('(k)=>document.querySelector("#film-player video").src === BARSYS_MEDIA[k].src',key)
  assert all(c['paused'] for c in p.evaluate('BarsysExperience.state().clips'))
  p.locator('#close-film').click()
 ok('Four independent experience loops, individual controls and all full-film dialogs work; no hero source reused.')
 p.locator('#experience-preview-toggle').click();p.wait_for_timeout(100);assert all(c['paused'] for c in p.evaluate('BarsysExperience.state().clips'))
 p.locator('#experience-preview-toggle').click();p.wait_for_function('() => BarsysExperience.state().clips.filter(c=>!c.paused).length===4')
 p.locator('#motion-toggle').click();p.wait_for_timeout(100);assert p.evaluate("[...document.querySelectorAll('video')].every(v=>v.paused)")
 ok('Section pause/resume and global motion-off stop and restart the expected media.')
 center(p,'#snapshot-rail');p.locator('[data-snapshot-scroll="1"]').click();p.wait_for_timeout(300)
 assert p.locator('#snapshot-rail').evaluate('(r)=>r.scrollLeft>50');assert p.locator('#snapshot-count').inner_text().startswith('4')
 p.locator('#snapshot-rail').focus();p.keyboard.press('Home');p.wait_for_timeout(100);assert p.locator('#snapshot-rail').evaluate('(r)=>r.scrollLeft<2')
 for i in range(6):
  button=p.locator('.snapshot-card [data-open-photo]').nth(i);button.click();assert p.locator('#photo-dialog').is_visible()
  assert p.locator('#lightbox-photo').evaluate('(im)=>im.complete && im.naturalWidth>0')
  p.keyboard.press('ArrowRight');p.locator('#close-photo').click()
 p.locator('.occasion-feature .text-link').click();p.wait_for_function('() => document.querySelector("#film-player video")?.currentTime>.1')
 assert p.evaluate('BarsysMotion.getFilm()')=='occasion'
 assert p.locator('#film-description').inner_text()==p.evaluate('BARSYS_MEDIA.occasion.description')
 assert 'hosted dinner' in p.locator('#film-description').inner_text()
 assert p.evaluate("document.querySelector('#film-player video').src===new URL(BARSYS_MEDIA.occasion.src,document.baseURI).href")
 p.locator('#close-film').click()
 ok('Six-photo carousel, arrows, keyboard navigation, all lightbox triggers and the fourth NYC film work.')
 center(p,'#experience');p.locator('.taste-play').click();assert p.evaluate('BarsysMotion.getFilm()')=='experienceSelect';p.locator('#close-film').click()
 ok('Choose. Pour. Cheers. opens the dedicated selection film instead of the hero.')
 p.close()
 # Layout-only scene setup is programmatic because mobile intentionally hides scene tabs.
 # This does not assert that hidden tabs are interactive on mobile.
 # Responsive visual pass. Reduced motion gives deterministic source posters.
 q=b.new_page(viewport={'width':1440,'height':1080},reduced_motion='reduce');load(q)
 for width in [320,390,600,768,1024,1440,1920]:
  q.set_viewport_size({'width':width,'height':1080})
  for idx in range(4):
   top(q);q.evaluate('(i)=>document.querySelector(`[data-go-scene="${i}"]`).click()',idx);q.wait_for_timeout(30)
   assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('hero-overflow',width,idx)
   r=q.locator('.hero-scene.is-active .scene-main').bounding_box();assert r['width']>100 and r['height']>200
  for selector in ['#event-gallery','#event-photos']:
   center(q,selector);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,selector)
  report['widths'].append(width)
  if width in [390,1440]:
   top(q);q.evaluate('(i)=>document.querySelector(`[data-go-scene="${i}"]`).click()',0);top(q);q.wait_for_timeout(300);q.screenshot(path=str(O/f'hero-{width}.png'),full_page=False)
   for idx,slug in [(1,'office'),(2,'skyline'),(3,'gala')]:
    top(q);q.evaluate('(i)=>document.querySelector(`[data-go-scene="${i}"]`).click()',idx);q.locator('#hero-carousel').screenshot(path=str(O/f'hero-{slug}-{width}.png'),style='.site-header,.mobile-book,.skip-link{visibility:hidden!important}')
   q.locator('#event-gallery').screenshot(path=str(O/f'experience-{width}.png'),style='.site-header,.mobile-book,.skip-link{visibility:hidden!important}')
   q.locator('#snapshot-rail').evaluate('(r)=>r.scrollLeft=0');q.locator('#event-photos').screenshot(path=str(O/f'photos-{width}.png'),style='.site-header,.mobile-book,.skip-link{visibility:hidden!important}')
 ok('All four scenes and both carousels fit seven widths from 320 to 1920 without page overflow.')
 # All bundled photographs load; failures permitted only for unbundled official covers.
 missing=q.evaluate("[...document.querySelectorAll('img[src]')].filter(im=>im.src.startsWith('data:') && im.complete && !im.naturalWidth).map(im=>im.className)")
 assert not missing,missing
 assert not report['pageErrors'],report['pageErrors']
 ok('No page JavaScript errors; no broken requested bundled photographs.')
 q.close();b.close()
report['result']='PASS';(O/'curated-media-report.json').write_text(json.dumps(report,indent=2))
print('ALL PASS',flush=True)
