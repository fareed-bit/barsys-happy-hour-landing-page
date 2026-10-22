import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const origin='https://apex.barsys.com';
const controller=origin+'/hud-assets/js/apex_analytics_consent.js';
export function patchHTML(html){
 let policyFound=false;
 html=html.replace(/<meta\b[^>]*>/gi,tag=>{
  if(!/http-equiv=["']Content-Security-Policy["']/i.test(tag))return tag;
  policyFound=true;
  return tag.replace(/content="([^"]*)"/i,(_,policy)=>{
   const directives=policy.split(';').map(x=>x.trim()).filter(Boolean).map(x=>x.split(/\s+/));
   for(const name of ['script-src','connect-src']){
    let directive=directives.find(x=>x[0]===name);
    if(!directive){directive=[name,...(directives.find(x=>x[0]==='default-src')?.slice(1)||["'self'"])];directives.push(directive);}
    for(let i=directive.length-1;i>0;i--)if(directive[i]==="'none'")directive.splice(i,1);
    if(!directive.includes(origin))directive.push(origin);
   }
   return 'content="'+directives.map(x=>x.join(' ')).join('; ')+'"';
  });
 });
 if(!policyFound||!/<\/head>/i.test(html))throw Error('Public HTML must have a policy and head');
 if(!html.includes(controller))html=html.replace(/<\/head>/i,`<script defer src="${controller}" referrerpolicy="no-referrer"></script>\n</head>`);
 return html;
}
export function patchPrivacy(text){
 const replacements=[
 ['No analytics, advertising pixel, session replay or third-party event-video player is installed.', 'Optional first-party usage analytics are off by default. Analytics choices in the footer can enable page visits and button-label events for this website in this browser tab; form field values are excluded. Events are sent to the Barsys-owned Apex service. Turning analytics off stops collection and clears the tab session identifier. Browser Global Privacy Control keeps this analytics option off. No advertising pixel or session replay is installed.'],
 ['Optional planner storage is separate; no analytics or advertising tags are installed.', 'Optional planner storage and usage analytics have separate controls. Usage analytics are off unless enabled through Analytics choices in the footer; no advertising tags are installed.'],
 ['<p>Use <button class="policy-inline" type="button" data-open-privacy>', '<p>Optional usage analytics use sessionStorage keys _apex_analytics_allowed (the tab choice) and _apex_sid (a site-scoped session identifier). They do not store form field values or combine visitors across the two Barsys event websites.</p><p>Use <button class="policy-inline" type="button" data-open-privacy>']
 ];
 for(const [old,value] of replacements){if(text.includes(value))continue;if(!text.includes(old))throw Error('Privacy notice differs from reviewed production text');text=text.replace(old,value);}
 return text;
}
export function patchAPI(text){
 const marker="   if(req.method==='GET'&&path==='/api/auth/me')";
 if(!text.includes(marker))throw Error("Production API does not match reviewed route boundary");
 if(text.includes("path==='/api/integrations/apex/analytics'"))return text;
 const route="   if(req.method==='GET'&&path==='/api/integrations/apex/analytics'){\n    if(!await apexAuthorised(req.headers.authorization))throw new HttpError(401,'Reporting access denied.');\n    const days=Number(new URL(req.url,'http://localhost').searchParams.get('days')||30);\n    if(!Number.isInteger(days)||days<1||days>90)throw new HttpError(400,'Choose 1\u201390 days.');\n    send(200,await buildApexReport(store,days));return true;}\n";
 return "import {apexAuthorised,buildApexReport} from './apex-reporting.mjs';\n"+text.replace(marker,route+marker);
}
export function patchTree(root){
 const pages=[join(root,'index.html')];
 function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(entry.isFile()&&entry.name.endsWith('.html'))pages.push(path);}}
 walk(join(root,'site'));
 for(const path of pages)writeFileSync(path,patchHTML(readFileSync(path,'utf8')));
 const api=join(root,'backend/api.mjs');writeFileSync(api,patchAPI(readFileSync(api,'utf8')));
 const privacy=join(root,'runtime-content.js');writeFileSync(privacy,patchPrivacy(readFileSync(privacy,'utf8')));
 console.log('Apex consent installed on '+pages.length+' public pages; production files otherwise preserved.');
 return pages.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)patchTree(process.argv[2]||'/app');
