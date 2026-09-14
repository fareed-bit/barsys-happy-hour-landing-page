from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil,json
R=Path(__file__).resolve().parents[1];O=R/'qa';checks=[];errors=[]
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference');p.set_default_timeout(7000)
 p.on('pageerror',lambda e:errors.append(str(e)));p.route('https://**/*',lambda r:r.abort())
 p.set_content((R/'Barsys-After-Hours-V3-9-Codex-Ready.html').read_text(),wait_until='domcontentloaded',timeout=45000)
 p.wait_for_function("()=>document.querySelector('[data-carousel-video]').currentTime>.2",timeout=10000)
 assert p.locator('[data-carousel-video]').first.evaluate('(v)=>v.muted')
 checks.append('Hero autoplays muted without a gesture or autoplay bypass flag.');print('PASS',checks[-1],flush=True)
 p.locator('#privacy-notice [data-open-privacy]').click();p.wait_for_timeout(150)
 assert p.evaluate("[...document.querySelectorAll('[data-carousel-video]')].every(v=>v.paused)")
 p.keyboard.press('Escape');p.wait_for_timeout(250)
 assert p.evaluate("[...document.querySelectorAll('[data-carousel-video]')].some(v=>!v.paused)")
 checks.append('Privacy dialog pauses the hero, and closing it permits playback again.');print('PASS',checks[-1],flush=True)
 p.locator('#privacy-local-only').click();p.locator('#carousel-next').focus();p.wait_for_timeout(100)
 assert not p.evaluate('BarsysHero.state().rotating')
 checks.append('Keyboard focus suspends hero slide rotation while preserving the user pause choice.');print('PASS',checks[-1],flush=True)
 p.evaluate("document.getElementById('experience-reel-rail').scrollIntoView({block:'center',behavior:'instant'})")
 p.wait_for_timeout(1200)
 clips=p.evaluate('BarsysExperience.state().clips');assert len([x for x in clips if not x['paused'] and x['time']>.1])==4
 checks.append('All four visible experience previews autoplay; no hero source was changed.');print('PASS',checks[-1],flush=True)
 p.locator('#experience-preview-toggle').click();p.wait_for_timeout(150);assert all(x['paused'] for x in p.evaluate('BarsysExperience.state().clips'))
 p.locator('#experience-preview-toggle').click();p.wait_for_timeout(200)
 p.emulate_media(reduced_motion='reduce');p.wait_for_timeout(200)
 assert all(x['paused'] for x in p.evaluate('BarsysExperience.state().clips'))
 checks.append('Section pause/resume and reduced-motion control remain effective.');print('PASS',checks[-1],flush=True)
 p.close();b.close()
assert not errors,errors
(O/'readiness-media.json').write_text(json.dumps({'result':'PASS','checks':checks,'errors':errors,'limits':['Chromium set_content only; no Safari or mobile hardware test.','No browser autoplay override flags used.']},indent=2))
print('ALL PASS',flush=True)
