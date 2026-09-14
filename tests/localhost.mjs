/* Optional real-browser regression suite. Requires Node Playwright + Chromium.
 * Run against npm start. No backend writes. Synthetic data in an isolated context.
 * Defaults to a visible browser. BARSYS_TEST_URL overrides the local URL.
 */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
let chromium;
try { ({chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')); }
catch { console.error('Node Playwright is unavailable. Install it in your test environment; no app dependency is required.');process.exit(1); }
const out=new URL('../qa/localhost/',import.meta.url);await mkdir(out,{recursive:true});
const url=process.env.BARSYS_TEST_URL||'http://localhost:3000';
const report={url,checks:[],errors:[],widths:[],limits:['Chromium only; no physical iOS or screen-reader audit.']};
let browser;
try{
 browser=await chromium.launch({headless:process.env.BARSYS_HEADLESS==='1'});
 const p=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 p.on('pageerror',e=>report.errors.push(e.message));p.setDefaultTimeout(12000);
 const ok=t=>{report.checks.push(t);console.log('PASS',t);};
 await p.goto(url);await p.waitForFunction(()=>document.querySelector('[data-carousel-video]').currentTime>.2);
 assert(await p.locator('[data-carousel-video]').evaluateAll(es=>es.every(e=>e.muted)));
 await p.locator('#carousel-toggle').click();assert(await p.locator('[data-carousel-video]').evaluateAll(es=>es.every(e=>e.paused)));
 await p.locator('#carousel-toggle').click();ok('Muted autoplay and first-click pause/resume');
 await p.locator('#privacy-local-only').click();
 for(const i of await p.locator('#featured-menus img').all()){await i.scrollIntoViewIfNeeded();await i.evaluate(e=>e.decode());}
 assert.equal(await p.locator('#featured-menus img').count(),8);ok('Eight covers decode without storage consent');
 await p.locator('.quick-addon-drawer summary').click();await p.getByRole('button',{name:'Add one Additional service time',exact:true}).click();assert.equal(await p.locator('#quick-hours').inputValue(),'3');
 await p.locator('#preferences-state').click();await p.locator('#pref-save').check();await p.locator('#privacy-save').click();
 await p.locator('[data-plan-route="full"]').click();await p.getByRole('button',{name:'03 Drinks',exact:true}).click();await p.locator('#step-content [data-select-menu="signature"]').click();await p.locator('[name="menu-mode"]').check();
 await p.reload();await p.locator('[data-plan-route="full"]').click();await p.getByRole('button',{name:'03 Drinks',exact:true}).click();assert(await p.locator('[name="menu-mode"]').isChecked());assert.equal(await p.locator('#step-content [data-select-menu="signature"]').getAttribute('aria-pressed'),'true');ok('Shared hours and opted-in recommendation/favorite restoration');
 await p.getByRole('button',{name:'05 Review',exact:true}).click();await p.locator('#next-step').click();assert(await p.locator('#form-error').isVisible());
 await p.locator('#detail-name').fill('RC Test');await p.locator('#detail-company').fill('Example Team');await p.locator('#detail-email').fill('rc@example.com');await p.locator('#next-step').click();
 await p.locator('#step-content [data-open-summary]').click();assert((await p.locator('#approval-sheet').innerText()).includes('Team recommendation requested'));await p.locator('#close-summary').click();
 for(const [selector,name] of [['#download-plan','event.json'],['#step-content [data-download-summary]','summary.html']]){
 const [download]=await Promise.all([p.waitForEvent('download'),p.locator(selector).click()]);await download.saveAs(fileURLToPath(new URL(name,out)));}
 const data=JSON.parse(await readFile(new URL('event.json',out),'utf8'));assert.equal(data.mode,'LOCAL_PREVIEW_NOT_SENT');assert.equal(data.estimate.total,null);assert(data.event.menuRecommendationRequested);assert((await readFile(new URL('summary.html',out),'utf8')).includes('RC Test'));ok('Full completion and actual JSON/HTML downloads');
 await p.locator('[data-plan-route="quick"]').click();await p.locator('#quick-reset').click();await p.locator('#quick-occasion').selectOption('birthday');await p.locator('#quick-guests').fill('300');await p.locator('#quick-city').fill('Jersey City');await p.locator('#quick-region').selectOption('NJ');await p.locator('#quick-next').click();await p.locator('#quick-name').fill('RC Guest');await p.locator('#quick-email').fill('guest@example.com');await p.locator('#quick-next').click();assert((await p.locator('#quick-summary-content').innerText()).includes('Custom quote'));ok('Quick completion and unsupported-event custom quote');
 await p.reload();await p.locator('[data-plan-route="full"]').click();await p.getByRole('button',{name:'05 Review',exact:true}).click();assert.equal(await p.locator('#detail-email').inputValue(),'');await p.locator('#preferences-state').click();await p.locator('#privacy-reject').click();assert.equal(await p.evaluate(()=>localStorage.getItem(BARSYS.storageKey)),null);ok('Contact excluded from reload; withdrawal removes draft');
 for(const width of [320,390,768,1024,1440,1920]){await p.setViewportSize({width,height:1000});for(const name of ['01 Event','03 Drinks','04 Add-ons','05 Review']){await p.getByRole('button',{name,exact:true}).click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}report.widths.push(width);if([390,1440].includes(width))await p.screenshot({path:fileURLToPath(new URL('layout-'+width+'.png',out))});}ok('Six responsive widths');
 await p.emulateMedia({reducedMotion:'reduce'});assert(await p.locator('[data-carousel-video],[data-experience-video]').evaluateAll(es=>es.every(e=>e.paused)));ok('Reduced motion pauses background videos');
 assert.deepEqual(report.errors,[]);report.result='PASS';
}catch(e){report.result='BLOCKED_OR_FAILED';report.failure=e.message;console.error(e.message);process.exitCode=1;}
finally{await writeFile(new URL('report.json',out),JSON.stringify(report,null,2));await browser?.close();}
