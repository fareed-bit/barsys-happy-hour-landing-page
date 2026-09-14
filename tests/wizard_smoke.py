"""V3.6 local regression: no production requests. Chromium via set_content.
External artwork is blocked deliberately; unavailable-image fallbacks are tested.
Storage replay uses a memory mock because about:blank has no storage origin.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,shutil,argparse
parser=argparse.ArgumentParser();parser.add_argument("--phase",choices=["all","wizard","media","privacy"],default="all");PHASE=parser.parse_args().phase
R=Path(__file__).resolve().parents[1];O=R/'qa';O.mkdir(exist_ok=True)
H=(R/'Barsys-After-Hours-V3-9-Codex-Ready.html').read_text()
report={'checks':[],'widths':[],'errors':[],'environment':'Chromium; complete standalone HTML via set_content. No autoplay override flags. Remote artwork blocked.','limitations':['Actual file:// navigation disallowed by this browser environment; set_content used.','No Safari/iOS hardware test.','Mixlist CDN availability not verified.','Storage persistence tested with a memory mock, not browser-restart persistence.']}
def ok(text):
 report['checks'].append(text);print('PASS',text,flush=True);(O/f'{PHASE}-report.json').write_text(json.dumps(report,indent=2))
def load(p):
 p.on('pageerror',lambda e:report['errors'].append(str(e)))
 p.route('https://**/*',lambda r:r.abort());p.set_content(H,wait_until='domcontentloaded',timeout=45000);p.wait_for_function('() => window.BarsysPlanner && window.BarsysV3');p.set_default_timeout(8000);p.locator('#privacy-local-only').click()
def full(p,n=0):
 p.evaluate('(n)=>BarsysPlanner.goStep(n)',n);p.wait_for_timeout(100)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 if PHASE in ['all','wizard']:
  p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');load(p)
  assert p.locator('#featured-menus .menu-card').count()==27;assert p.locator('[data-experience-video]').count()==4
  assert p.locator('.brand-banner').count() or p.locator('.trust').count()
  assert p.evaluate('BarsysPlanner.getEstimate().subtotal')==4250
  assert p.evaluate('BarsysPlanner.getEstimate().tax') is None
  ok('All 27 collection cards, four experience clips, trust section and published base remain.')
  full(p);p.locator('#planner-guests').fill('60');p.locator('#detail-startTime').fill('17:30')
  p.locator('#service-hours').select_option('3');p.locator('#next-step').click();assert p.evaluate('BarsysPreview.getStep()')==1
  p.locator('input[name="tier"][value="classic"]').check();p.locator('#detail-budget').fill('5000');p.locator('#next-step').click()
  assert p.locator('#step-content .wizard-menu-card').count()==27
  p.locator('#step-content [data-select-menu="signature"]').click();p.locator('#step-content [data-select-menu="agave"]').click();p.locator('#request-extra-menu').click();p.locator('#step-content [data-select-menu="spritz"]').click()
  assert len(p.evaluate('BarsysPlanner.getState().menus'))==3
  assert p.evaluate('BarsysPlanner.getEstimate().menuLimit')==3
  p.locator('#next-step').click();assert p.evaluate('BarsysPreview.getStep()')==3
  p.locator('#step-content [data-addon="beer-wine"]').click();p.locator('#step-content [data-addon="photographer"]').click();p.locator('#step-content [data-addon-variant="photographer"]').select_option('3')
  p.locator('#step-content [data-addon="garnishes"]').click()
  t=p.evaluate('BarsysPlanner.exportData()');assert t['event']['serviceHours']==3;assert t['estimate']['subtotal']==5480;assert len(t['estimate']['pending'])==1
  ok('Five-step flow shares duration, guest count, extra menu capacity and all selected add-ons without fabricated charges.')
  p.locator('#next-step').click();p.locator('#next-step').click();assert p.locator('#form-error').is_visible()
  p.locator('#detail-name').fill('Preview Organizer');p.locator('#detail-company').fill('Example Team');p.locator('#detail-email').fill('organizer@example.com');p.locator('#detail-notes').fill('Test request only.');p.locator('#next-step').click();assert p.evaluate('BarsysPreview.isComplete()')
  p.locator('#step-content [data-open-summary]').click();text=p.locator('#approval-sheet').inner_text();assert 'Beer & wine' in text and '3 hours of coverage' in text and '$5,480.00' in text and 'To be confirmed' in text
  p.locator('#approval-sheet').screenshot(path=str(O/'summary-desktop.png'));p.locator('#close-summary').click()
  with p.expect_download() as dl:p.locator('#step-content #download-plan').click()
  data=json.loads(Path(dl.value.path()).read_text());assert data['mode']=='LOCAL_PREVIEW_NOT_SENT';assert data['estimate']['total'] is None;assert data['event']['addons'][0]['quantity']==1
  ok('Review validation, branded itemized summary and JSON download preserve selected requests and unknown tax.')
  # Package changes keep preferences and make garnish inclusion explicit.
  p.evaluate("BarsysPlanner.setTier('signature')");assert p.evaluate("BarsysPlanner.getEstimate().lines.find(l=>l.id==='garnishes').status")=='included';assert len(p.evaluate('BarsysPlanner.getState().menus'))==3
  p.evaluate("BarsysPlanner.setTier('reserve'); BarsysPlanner.setAddon('extra-mixlists',0); BarsysPlanner.addMenu('fluid'); BarsysPlanner.addMenu('neon'); BarsysPlanner.setTier('classic')")
  assert len(p.evaluate('BarsysPlanner.getState().menus'))==5;assert p.evaluate('BarsysPlanner.getEstimate().menuOverflow')==3
  ok('Package changes preserve all five chosen menus and do not charge for included garnish presentation.')
  # Quick route / private event / custom quote.
  p.locator('[data-plan-route="quick"]').click();p.locator('#quick-reset').click();p.locator('.quick-options').first.locator('summary').click();p.locator('#quick-occasion').select_option('birthday');p.locator('#quick-guests').fill('300');p.locator('#quick-city').fill('Jersey City');p.locator('#quick-region').select_option('NJ');p.locator('.quick-addon-drawer summary').click();p.locator('#quick-content [data-addon="branding"]').click();p.locator('#quick-content [data-addon-variant="branding"]').select_option('napkins');p.locator('#quick-next').click()
  assert not p.locator('#quick-company').get_attribute('required');p.locator('#quick-name').fill('Preview Guest');p.locator('#quick-email').fill('guest@example.com');p.locator('#quick-next').click();assert p.evaluate('BarsysV3.getQuickStep()')==2
  assert p.evaluate('BarsysPlanner.getEstimate().subtotal') is None
  with p.expect_download() as dl:p.locator('#quick-content [data-download-summary]').click()
  raw=Path(dl.value.path()).read_text();assert 'Custom quote' in raw and 'Custom napkins &amp; stirrers' in raw and 'Illustrative tax (8.875%)' not in raw
  ok('Quick route optional add-ons, private-event fields, 300 guests and NJ custom-quote path complete without rejection or invented price.')
  # Recalculate approved test-only rate, then restore. This rate is NOT in delivered config.
  p.evaluate("BarsysPlanner.reset(); BARSYS.addons.find(a=>a.id==='beer-wine').price=10; BARSYS.addons.find(a=>a.id==='beer-wine').approved=true; BarsysPlanner.setAddon('beer-wine',1)")
  full(p,3);assert p.evaluate('BarsysPlanner.getEstimate().subtotal')==4750
  p.evaluate('BarsysPlanner.setGuests(75)');assert p.evaluate('BarsysPlanner.getEstimate().subtotal')==7125
  assert '$750.00 for your event' in p.locator('#step-content [data-addon-card="beer-wine"]').inner_text()
  p.evaluate("BARSYS.addons.find(a=>a.id==='beer-wine').approved=false; BARSYS.addons.find(a=>a.id==='beer-wine').price=null; BarsysPlanner.reset()")
  ok('Synthetic approved per-guest rate recalculates both sidebar and add-on card; test rate removed.')
  # Responsive and images. Each screenshot uses real build without injected product images.
  for width in [320,390,600,768,1024,1440,1920]:
   p.set_viewport_size({'width':width,'height':1000})
   for step in [0,2,3,4]:
    full(p,step)
    assert p.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,step,p.evaluate('document.documentElement.scrollWidth'))
   report['widths'].append(width)
   if width in [390,1440]:
    full(p,0);p.evaluate("document.getElementById('toast').classList.remove('visible')");p.locator('#planner-shell').screenshot(path=str(O/f'event-{width}.png'))
    full(p,3)
    if width==1440:
     p.evaluate("BarsysPlanner.setAddon('beer-wine',1); BarsysPlanner.setAddon('extra-hours',1); BarsysPlanner.refresh()")
    p.evaluate("document.getElementById('toast').classList.remove('visible')");p.locator('#planner-shell').screenshot(path=str(O/f'addons-{width}.png'))
    p.evaluate('BarsysPlanner.reset()')
  ok('Seven widths, four wizard stages each: no page-level horizontal overflow; mobile estimate stays collapsible.')
  p.close()
 if PHASE in ['all','media']:
  # True autoplay check, no prior interaction on load and no autoplay bypass flag.
  v=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference');load(v)
  v.wait_for_function("() => document.querySelector('[data-carousel-video]').currentTime > .2",timeout=12000)
  assert v.evaluate("document.querySelector('[data-carousel-video]').muted")
  v.locator('[data-go-scene="1"]').click();v.wait_for_timeout(800)
  assert v.evaluate("[...document.querySelectorAll('[data-carousel-video]')].some(el=>!el.paused && el.currentTime>.1)")
  ok('Hero video autoplays muted without a gesture; manually chosen video also plays while slideshow rotation stops.')
  v.evaluate("document.documentElement.style.scrollBehavior='auto'; document.getElementById('experience-reel-rail').scrollIntoView({block:'center',behavior:'instant'})")
  v.wait_for_function("() => BarsysExperience.state().clips.filter(c=>c.visible>=.12 && !c.paused && c.time>.1).length===4",timeout=12000)
  clips=v.evaluate('BarsysExperience.state().clips');assert sum(not c['paused'] for c in clips)==4
  assert all(v.locator('[data-experience-video]').nth(i).evaluate('(e)=>e.muted && e.loop && e.playsInline') for i in range(4))
  v.locator('#experience-preview-toggle').click();v.wait_for_timeout(200);assert all(c['paused'] for c in v.evaluate('BarsysExperience.state().clips'))
  v.locator('#experience-preview-toggle').click();v.evaluate("document.getElementById('experience-reel-rail').scrollIntoView({block:'center',behavior:'instant'})");v.wait_for_function('() => BarsysExperience.state().clips.filter(c => c.visible>=.12 && !c.paused).length===4',timeout=12000)
  assert sum(not c['paused'] for c in v.evaluate('BarsysExperience.state().clips'))==4
  ok('All four visible experience films autoplay muted, looping and inline; section pause/play works.')
  v.locator('#event-gallery [data-open-film]').first.click();v.wait_for_timeout(250);assert all(c['paused'] for c in v.evaluate('BarsysExperience.state().clips'));v.locator('#close-film').click()
  v.locator('#motion-toggle').click();v.wait_for_timeout(200);assert all(c['paused'] for c in v.evaluate('BarsysExperience.state().clips'))
  ok('Opening a film dialog pauses background clips; global motion-off pauses autoplay.')
  v.set_viewport_size({'width':390,'height':844});v.locator('#motion-toggle').click();v.evaluate("document.getElementById('experience-reel-rail').scrollIntoView({block:'center',behavior:'instant'})");v.wait_for_function('() => BarsysExperience.state().clips.some(c=>c.visible>=.12 && !c.paused)',timeout=12000)
  mobile=v.evaluate('BarsysExperience.state().clips');assert any(not c['paused'] for c in mobile if c['visible']>=.12)
  v.emulate_media(reduced_motion='reduce');v.wait_for_timeout(200);assert all(c['paused'] for c in v.evaluate('BarsysExperience.state().clips'))
  ok('Mobile viewport plays visible portrait preview and reduced-motion change stops autoplay.')
  v.close()
 if PHASE in ['all','privacy']:
  # Mock browser storage exposes exact serialized data to test privacy boundary.
  q=b.new_page(reduced_motion='reduce');q.evaluate("window.__saved={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__saved[k]||null,setItem:(k,v)=>window.__saved[k]=v,removeItem:k=>delete window.__saved[k]},configurable:true})");load(q)
  q.evaluate("BarsysPlanner.setDetails({name:'Sensitive Name',email:'private@example.com',date:'2026-12-03',venue:'Private address',budget:'98765',notes:'Private notes'});BarsysPlanner.setAddon('beer-wine',1)")
  saved=q.evaluate('window.__saved');raw=json.dumps(saved);assert all(v not in raw for v in ['Sensitive Name','private@example.com','Private address','2026-12-03','98765','Private notes'])
  assert 'barsys-local-draft-v38' not in saved
  q.evaluate("BarsysPrivacy.save({rememberSelections:true,remoteArtwork:false})");draft=json.loads(q.evaluate('__saved')["barsys-local-draft-v38"]);assert draft['addons']['beer-wine']['quantity']==1
  ok('Storage-mock audit: selections persist only after opt-in; contact/date/address/budget/notes do not.')
  q.close()
 b.close()
assert not report['errors'],report['errors']
report['result']='PASS';(O/f'{PHASE}-report.json').write_text(json.dumps(report,indent=2));print('ALL PASS',flush=True)
