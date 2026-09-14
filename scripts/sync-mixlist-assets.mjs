/** Download the configured verified-source mixlist cover URLs to this project.
 * No accounts, credentials or production writes. Node 18+; no dependencies.
 * Rebuild the HTML afterwards with npm run preview for a fully offline copy.
 */
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const s={window:{}};
vm.runInNewContext(await readFile(resolve(root,'config.js'),'utf8'),s);
const assets=s.window.BARSYS.assets;
const MAX_BYTES=20*1024*1024;
function validImage(b){return b.length>500&&((b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)||b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));}
let failures=0;
for(const [key,asset] of Object.entries(assets).filter(([,a])=>a.officialMixlist)){
 const url=new URL(asset.remote);
 if(url.protocol!=='https:'||url.hostname!=='media.barsys.com')throw new Error('Unapproved host: '+url.hostname);
 const path=resolve(root,asset.local);
 if(!path.startsWith(root+sep))throw new Error('Invalid destination');
 if(existsSync(path)&&validImage(await readFile(path))){console.log('Already local:',key);continue;}
 let saved=false;
 for(let attempt=1;attempt<=2&&!saved;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'follow',headers:{Accept:'image/jpeg,image/png'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   if(new URL(response.url).hostname!=='media.barsys.com')throw new Error('Unexpected redirect');
   const chunks=[];let count=0;
   for await(const chunk of response.body){count+=chunk.length;if(count>MAX_BYTES)throw new Error('Image exceeds 20 MB');chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);
   if(!validImage(bytes))throw new Error('Response is not a valid JPEG or PNG');
   await mkdir(dirname(path),{recursive:true});await writeFile(path+'.part',bytes);await rename(path+'.part',path);
   console.log('Saved',key,Math.round(bytes.length/1024)+' KB');saved=true;
  }catch(e){await unlink(path+'.part').catch(()=>{});console.warn('Attempt '+attempt+' / '+key+': '+e.message);}
 }
 if(!saved)failures++;
}
const keys=Object.entries(assets).filter(([,a])=>existsSync(resolve(root,a.local))).map(([k])=>k);
await writeFile(resolve(root,'assets.available.js'),'window.BARSYS_LOCAL_ASSETS='+JSON.stringify(keys)+';\n');
console.log(failures?'Some artwork could not be downloaded. Those covers will still use their remote URLs.':'All cover artwork is now local.');
console.log('Run npm run preview to rebuild the standalone HTML.');
if(failures)process.exitCode=1;
