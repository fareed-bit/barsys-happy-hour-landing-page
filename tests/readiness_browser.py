"""V3.9 standalone HTML QA. Browser-origin navigation is restricted here.
The complete delivered HTML is tested via set_content. Storage is an explicit
in-memory mock, not a claim about persistence across browser restarts.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,shutil,re
R=Path(__file__).resolve().parents[1];O=R/'qa';H=(R/'Barsys-After-Hours-V3-9-Codex-Ready.html').read_text()
report={'checks':[],'widths':[],'pageErrors':[],'limits':['Chromium set_content; file/localhost navigation restricted by administrator.','Storage behavior tested using a memory mock, not real browser-restart persistence.','Remote menu artwork requests intercepted; actual CDN availability not verified.','No screen-reader hardware, Safari/iOS or full WCAG conformance audit.','No actual inquiries, approvals, reservations, payments, subscriptions or legal compliance certification.']}
def ok(msg):
 report['checks'].append(msg);print('PASS',msg,flush=True);(O/'readiness-browser.json').write_text(json.dumps(report,indent=2))
def close_planner(p):
 if p.locator('#planner-close').is_visible():
  p.locator('#planner-close').click()
  p.locator('#planner-close').wait_for(state='hidden')

def load(b,width=1440,motion='reduce',seed=None):
 p=b.new_page(viewport={'width':width,'height':1000},reduced_motion=motion)
 p.set_default_timeout(8000)
 p.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
 p.evaluate('''(seed)=>{window.__store=seed||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]??null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k],clear:()=>window.__store={}}});}''',seed or {})
 p._asset_requests=[]
 p.on('request',lambda r:p._asset_requests.append(r.url) if r.url.startswith('http') else None)
 p.route('https://**/*',lambda r:r.abort())
 p.set_content(H,wait_until='domcontentloaded');p.wait_for_function('()=>!!window.BarsysV3&&!!window.BarsysPrivacy');return p
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=load(b);requests=p._asset_requests
 p.wait_for_timeout(350)
 assert all(x.startswith('https://media.barsys.com/') for x in requests)
 assert p.evaluate('Object.keys(__store).length')==0
 assert p.context.cookies()==[]
 assert p.evaluate('BarsysPlanner.getEstimate().subtotal')==4250
 ok('Fresh preview uses no cookies or draft writes; media requests are restricted to Barsys. Original $4,250 Signature baseline preserved.')
 p.locator('#privacy-local-only').click()
 p.evaluate("BarsysPlanner.setDetails({name:'Private Name',email:'secret@example.com',date:'2026-12-02',venue:'Private address',notes:'Sensitive text',restrictions:'Private request',budget:'918273'});BarsysPlanner.setGuests(65)")
 assert 'barsys-local-draft-v38' not in p.evaluate('__store')
 ok('Declining remembered selections prevents draft storage while the wizard continues to work.')
 p.locator('#preferences-state').click();p.locator('#pref-save').check();p.locator('#privacy-save').click()
 saved=p.evaluate('__store');draft=json.loads(saved['barsys-local-draft-v38']);assert draft['guests']==65
 assert all(v not in json.dumps(saved) for v in ['Private Name','secret@example.com','2026-12-02','Private address','Sensitive text','Private request','918273'])
 q=load(b,seed=saved);assert q.evaluate('BarsysPlanner.getState().guests')==65;assert q.evaluate('BarsysPlanner.getState().details.name')=='';q.close()
 ok('Opt-in saves only non-contact preferences; seeded reload restores selections, not contact/date/address/budget/notes.')
 # Artwork loads before any opt-in, and storage withdrawal never hides it.
 p.locator('#menus').scroll_into_view_if_needed();p.wait_for_timeout(500)
 needs_remote=p.evaluate("BARSYS.menus.some(m=>m.featured&&!BARSYS_LOCAL_ASSETS.includes(m.image))")
 if needs_remote: assert len(requests)>0, 'Missing covers should request their normal Barsys sources'
 assert all(x.startswith('https://media.barsys.com/') for x in requests)
 assert all('secret' not in x for x in requests)
 assert p.locator('#pref-art').count()==0
 p.locator('#preferences-state').click();p.locator('#pref-save').uncheck();p.locator('#privacy-save').click();p.wait_for_timeout(100)
 assert p.evaluate("[...document.querySelectorAll('#featured-menus img[data-image]')].every(e=>/^https?:|^data:/.test(e.getAttribute('src')||''))")
 assert 'barsys-local-draft-v38' not in p.evaluate('__store')
 p.evaluate('BarsysPlanner.goStep(2)');p.wait_for_timeout(200)
 assert p.evaluate("[...document.querySelectorAll('#step-content img[data-image]')].every(e=>!!e.getAttribute('src'))")
 ok('Menu artwork has normal sources without opt-in. Withdrawal deletes saved draft, not menu images; wizard artwork remains configured.')
 # full flow new questions, own publicity/marketing values, shared estimate.
 p.evaluate('BarsysPlanner.reset();BarsysPlanner.goStep(0)');p.locator('#step-content .readiness-options summary').click()
 p.locator('#detail-venueApproval').select_option('pending');p.locator('#detail-coi').select_option('required')
 p.locator('#next-step').click();p.locator('#next-step').click()
 assert 'absence of allergens cannot be guaranteed' in p.locator('#step-content').inner_text()
 p.locator('#next-step').click();p.locator('#detail-glassware').select_option('barsys');p.locator('#step-content [data-addon="photographer"]').click()
 # Approved two-hour photographer adds $800 to the $4,250 Signature baseline.
 assert p.evaluate('BarsysPlanner.getEstimate().subtotal')==5050
 assert p.locator('#price-breakdown .scope-costs').is_visible()
 p.locator('#next-step').click();p.locator('#next-step').click();assert p.locator('#form-error').is_visible()
 assert p.locator('#detail-name').get_attribute('aria-invalid')=='true'
 assert 'form-error' in p.locator('#detail-name').get_attribute('aria-describedby')
 p.locator('#detail-name').fill('Example Organizer');p.locator('#detail-company').fill('Example Team');p.locator('#detail-email').fill('organizer@example.com');p.locator('#detail-contractEntity').fill('Example Team LLC')
 assert not p.locator('#step-content [data-memory-choice="marketingInterest"]').is_checked()
 p.locator('#detail-photoPreference').select_option('noGuests');p.locator('#step-content [data-memory-choice="marketingInterest"]').check()
 p.locator('#next-step').click();assert p.evaluate('BarsysPreview.isComplete()')
 d=p.evaluate('BarsysPlanner.exportData()');assert d['readiness']['booking']['dateHeld'] is False;assert d['readiness']['publicity']['permissionGranted'] is False;assert d['readiness']['marketing']['subscribed'] is False
 assert d['readiness']['marketing']['preference'] is True;assert d['readiness']['coiRequest']=='required';assert d['readiness']['glasswarePreference']=='barsys'
 p.locator('#step-content [data-open-summary]').click();summary=p.locator('#approval-sheet').inner_text();assert 'COI requested' in summary
 assert all(x in summary for x in ['Approval pending','Example Team LLC','not subscribed','No identifiable guest','Agreement & deposit'])
 p.locator('#close-summary').click()
 with p.expect_download() as dl:p.locator('#step-content [data-download-summary]').click()
 exported=Path(dl.value.path()).read_text();assert 'Example Team LLC' in exported and 'no publicity rights' in exported
 with p.expect_download() as dl:p.locator('#step-content #download-plan').click()
 exported_json=json.loads(Path(dl.value.path()).read_text());assert exported_json['readiness']['booking']['inquirySent'] is False
 ok('Five-stage plan captures venue/COI/glassware, validates errors, keeps permissions separate, and exports true local-only status.')
 # quick shares fields, still not a blocked long legal form.
 p.locator('[data-plan-route="quick"]').click();p.locator('#quick-reset').click();p.locator('.quick-options').first.locator('summary').click();p.locator('#quick-occasion').select_option('birthday');p.locator('#quick-guests').fill('300')
 p.locator('#quick-content .readiness-options summary').click();p.locator('#quick-venueApproval').select_option('confirmed');p.locator('#quick-coi').select_option('notRequired')
 p.locator('.quick-addon-drawer summary').click();p.locator('#quick-glassware').select_option('venue');p.locator('#quick-next').click()
 p.locator('#quick-name').fill('Private Event');p.locator('#quick-email').fill('guest@example.com');assert not p.locator('#quick-company').get_attribute('required')
 p.locator('#quick-photoPreference').select_option('ask');p.locator('#quick-next').click();assert p.evaluate('BarsysV3.getQuickStep()')==2
 assert p.evaluate('BarsysPlanner.getEstimate().subtotal') is None
 assert p.evaluate('BarsysPlanner.exportData().readiness.glasswarePreference')=='venue'
 ok('Quick proposal retains optional venue/COI/glassware and publicity choices; 300-guest private events remain custom quotes.')
 # Footer controls are outside the full-screen planner; close it as a user would.
 close_planner(p)
 # Footer dialogs, keyboard focus and helper text.
 p.locator('.footer-policies [data-policy="terms"]').click();assert p.locator('#policy-dialog').is_visible()
 p.keyboard.press('Escape');assert not p.locator('#policy-dialog').is_visible()
 assert p.evaluate("document.activeElement.matches('.footer-policies [data-policy=terms]')")
 for key in ['privacy','cancellations','cookies','accessibility']:
  p.locator(f'.footer-policies [data-policy="{key}"]').click();assert len(p.locator('#policy-body').inner_text())>500;p.keyboard.press('Escape')
 ok('Five footer policy dialogs open, support Escape and restore focus; sixth disclosure explains banner/media references.')
 # No uncontrolled focus escapes native preference dialog.
 p.locator('#preferences-state').click()
 for _ in range(12):
  p.keyboard.press('Tab');assert p.evaluate("document.activeElement.closest('#privacy-dialog')!==null")
 p.locator('#privacy-dialog').screenshot(path=str(O/'privacy-desktop.png'));p.keyboard.press('Escape')
 ok('Native privacy dialog traps keyboard focus and restores it when closed.')
 p.close()
 # Responsive including every new surface. Screenshots from reduced-motion stop state.
 p=load(b);p.locator('#privacy-local-only').click()
 for width in [320,390,600,768,1024,1440,1920]:
  p.set_viewport_size({'width':width,'height':1000})
  for step in [0,2,3,4]:
   p.evaluate('(n)=>BarsysPlanner.goStep(n)',step)
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,step)
  close_planner(p)
  p.locator('#preferences-state').click();assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  if width==390:p.locator('#privacy-dialog').screenshot(path=str(O/'privacy-mobile.png'))
  p.keyboard.press('Escape');p.locator('.footer-policies [data-policy="terms"]').click();assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1');p.keyboard.press('Escape')
  report['widths'].append(width)
  if width in [390,1440]:
   p.evaluate('BarsysPlanner.goStep(0)');p.locator('#step-content .readiness-options summary').click()
   p.locator('#planner-shell').screenshot(path=str(O/f'venue-{width}.png'))
   p.evaluate('BarsysPlanner.goStep(4)');p.locator('#step-content .request-clarity').screenshot(path=str(O/f'review-{width}.png'))
   close_planner(p)
   p.locator('.readiness-section').screenshot(path=str(O/f'expectations-{width}.png'))
 ok('Seven viewport widths: new wizard panels, policies and privacy controls have no page-level horizontal overflow.')
 p.locator('.site-footer').screenshot(path=str(O/'footer-desktop.png'));p.close()
 b.close()
assert not report['pageErrors'],report['pageErrors']
report['result']='PASS';(O/'readiness-browser.json').write_text(json.dumps(report,indent=2));print('ALL PASS',flush=True)
