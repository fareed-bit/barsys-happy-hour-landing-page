/* Embed available assets once. Missing verified mixlist covers load normally from the official Barsys image host.
   Run npm run assets first to include the covers in an entirely offline preview. */
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const mime = {'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.svg':'image/svg+xml'};
const sandbox = {window: {}};
for (const name of ['config.js','media.config.js']) vm.runInNewContext(await readFile(resolve(root,name),'utf8'),sandbox);
const config = sandbox.window.BARSYS;
const media = sandbox.window.BARSYS_MEDIA;
const paths = new Set();
const register = path => {
  if (!path?.startsWith('assets/')) throw new Error(`Expected a bundled asset, got: ${path}`);
  paths.add(path);
};
const bundledKeys=Object.entries(config.assets).filter(([key,asset])=>existsSync(resolve(root,asset.local))).map(([key])=>key);
Object.entries(config.assets).forEach(([key,asset]) => {if(bundledKeys.includes(key))register(asset.local);else if(!asset.remote?.startsWith('https://media.barsys.com/'))throw new Error('Missing asset without approved remote: '+key);});
Object.values(media).forEach(clip => { register(clip.src); register(clip.poster); if(clip.previewSrc)register(clip.previewSrc); });
let html = await readFile(resolve(root,'index.html'),'utf8');
html = html.replace(/\b(src|poster|href)="(assets\/[^"<>]+)"/g, (_, attribute, path) => {
  register(path); return `data-inline-${attribute}="${path}"`;
});
for (const name of ['styles.css','events.css','v3.css','hero-carousel.css','brand-banner.css','experience-films.css','mixlists.css','wizard.css','curated-events.css','readiness.css','accessibility.css']) {
  const css = await readFile(resolve(root,name),'utf8');
  const tag = new RegExp(`<link\\b[^>]*href="${name.replace('.','\\.')}"[^>]*>`, 'g');
  html = html.replace(tag, () => `<style>\n${css}\n</style>`);
}
html = html.replace(/<script\b[^>]*\bsrc="(?:assets\.available\.js|config\.js|media\.config\.js|quote-engine\.js|app\.js|motion\.js|v3\.js|hero-carousel\.js|brand-banner\.js|experience-films\.js|curated-events\.js|privacy\.js|policy-content\.js|runtime-content\.js|readiness\.js|accessibility\.js|inquiry-client\.js|staff-auth\.js)"[^>]*>\s*<\/script>/g, '');
const data = {};
for (const path of [...paths].sort()) {
  const full = resolve(root,path);
  if (!full.startsWith(root + sep)) throw new Error(`Asset escapes project: ${path}`);
  data[path] = [mime[extname(path)] || 'application/octet-stream',(await readFile(full)).toString('base64')];
}
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
const bootstrap = `
window.BARSYS=${json(config)};
window.BARSYS_MEDIA=${json(media)};
window.BARSYS_LOCAL_ASSETS=${json(bundledKeys)};
(() => {
 const encoded=${json(data)};
 const urls={};
 const blobs=[];
 for (const [path,[mime,base64]] of Object.entries(encoded)) {
  if (mime.startsWith('video/')) {
   const binary=atob(base64);
   const bytes=new Uint8Array(binary.length);
   for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
   const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
   urls[path]=url; blobs.push(url);
  } else urls[path]='data:'+mime+';base64,'+base64;
 }
 for(const asset of Object.values(window.BARSYS.assets)) {
  if(urls[asset.local]) {asset.local=urls[asset.local];asset.remote=asset.local;}
  else asset.local=asset.remote;
  delete asset.fallback;
 }
 for(const clip of Object.values(window.BARSYS_MEDIA)) {
  clip.src=urls[clip.src]; clip.poster=urls[clip.poster]; if(clip.previewSrc)clip.previewSrc=urls[clip.previewSrc];
 }
 for(const attribute of ['src','poster','href']) {
  document.querySelectorAll('[data-inline-'+attribute+']').forEach(el => {
   const path=el.getAttribute('data-inline-'+attribute);
   el.setAttribute(attribute,urls[path]);
   el.removeAttribute('data-inline-'+attribute);
  });
 }
 // The browser releases document-owned Blob URLs on navigation; leave them intact
 // for bfcache restores instead of revoking on pagehide.
})();
`;
const code = (await Promise.all(['policy-content.js','runtime-content.js','privacy.js','readiness.js','quote-engine.js','app.js','motion.js','v3.js','hero-carousel.js','brand-banner.js','experience-films.js','curated-events.js','accessibility.js','inquiry-client.js','staff-auth.js'].map(name => readFile(resolve(root,name),'utf8')))).join('\n');
const scripts = (bootstrap + '\n' + code).replace(/<\/script/gi,'<\\/script');
html = html.replace('</body>', () => `<script>\n${scripts}\n</script>\n</body>`);
const name = 'Barsys-After-Hours-V3-9-Codex-Ready.html';
await writeFile(resolve(root,name),html);
console.log(`Built ${name}: ${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB; ${paths.size} unique embedded assets.`);
console.log('Event videos and existing photos are bundled. '+(Object.keys(config.assets).length-bundledKeys.length)+' mixlist covers load from Barsys. Nothing is submitted.');

// Content-based build evidence avoids future timestamps preserved by imported ZIPs.
const inputs=[...(await readdir(root)).filter(n=>/\.(js|css)$/.test(n)||n==='index.html'),...paths];
const hashes={};
for(const input of inputs) hashes[input]=createHash('sha256').update(await readFile(resolve(root,input))).digest('hex');
await writeFile(resolve(root,'preview-build.json'),JSON.stringify({output:name,outputSha256:createHash('sha256').update(html).digest('hex'),inputs:hashes},null,2)+'\n');
