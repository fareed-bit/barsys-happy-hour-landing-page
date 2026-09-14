/** Import the exact video referenced by the public landing-page hero.
 * Runs on the user's internet-connected machine. No website files are changed.
 * Usage: npm run sync:hero
 *        npm run sync:hero -- --file /absolute/path/to/original-hero.mp4
 *        npm run sync:hero -- --url https://example.com/exact-video.mp4
 * Requires Node 18+. ffmpeg is optional, used only to extract a poster.
 * This environment could not fetch the public source; the default live path
 * has NOT been verified here. Unambiguous HTML-video sources are supported;
 * iframe/YouTube, protected players and HLS-only sources fail without replacing
 * the existing clip. Never guess a file from another section of the page.
 */
import {readFile,writeFile,rename,copyFile,unlink,mkdir,stat} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const PAGE = 'https://happyhours.barsys.com/';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const decode = s => s.replace(/&amp;/g,'&').replace(/&#38;/g,'&');
function attr(tag,key) {
  const m=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\x27([^\x27]*)\x27|([^\\s>]+))','i'));
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? '') : null;
}
function publicURL(value,base) {
  const u=new URL(value,base);
  if(u.protocol!=='https:' && u.protocol!=='http:') throw new Error('Expected an HTTP(S) media URL.');
  if(u.username||u.password) throw new Error('Credential-bearing URLs are not supported.');
  return u.href;
}
export function findHeroVideo(html,page=PAGE) {
  const blocks=[...html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video\s*>/gi)];
  if(!blocks.length)throw new Error('No native <video> element found. Supply the original MP4 with --file or its direct media URL with --url.');
  const candidates=blocks.map(m=>{
    const opening=m[0].match(/^<video\b[^>]*>/i)[0];
    const before=html.slice(0,m.index);
    const section=before.slice(Math.max(before.lastIndexOf('<section'),before.lastIndexOf('<header')));
    let score=/hero/i.test([attr(opening,'id'),attr(opening,'class')].join(' '))?10:0;
    if(/^<(?:section|header)\b[^>]*\b(?:id|class)=["'][^"']*hero/i.test(section))score+=8;
    const sources=[attr(opening,'src'),attr(opening,'data-src'),...[...m[0].matchAll(/<source\b[^>]*>/gi)].map(x=>attr(x[0],'src')||attr(x[0],'data-src'))].filter(Boolean);
    const source=sources.find(x=>/\.(?:mp4|webm)(?:[?#]|$)/i.test(x)) || sources[0];
    return {score,source,poster:attr(opening,'poster')};
  }).filter(x=>x.source);
  if(!candidates.length)throw new Error('The native video source is loaded by JavaScript or hidden. Supply the exact original MP4 instead.');
  candidates.sort((a,b)=>b.score-a.score);
  if(candidates.length>1 && (candidates[0].score===0 || candidates[0].score===candidates[1].score))throw new Error('More than one video is present and the hero cannot be identified unambiguously. Nothing was replaced. Use --url with the exact hero media URL.');
  const c=candidates[0];
  const src=publicURL(c.source,page);
  if(/\.(?:m3u8|mpd)(?:[?#]|$)/i.test(src))throw new Error('This is a streaming manifest. Supply the original MP4/WebM file instead.');
  return {src,poster:c.poster?publicURL(c.poster,page):null};
}
async function download(url,file,maxBytes,allowedTypes) {
  const response=await fetch(url,{signal:AbortSignal.timeout(120000),headers:{'User-Agent':'Barsys-Local-Preview/3.1'}});
  if(!response.ok)throw new Error(`Download returned HTTP ${response.status}.`);
  const type=(response.headers.get('content-type')||'').split(';')[0].trim();
  if(!allowedTypes.test(type))throw new Error(`Expected media, received ${type||'an unknown content type'}.`);
  if(Number(response.headers.get('content-length'))>maxBytes)throw new Error('File is too large for a self-contained preview. Use a compressed MP4.');
  let size=0;
  const bound=new Transform({transform(chunk,encoding,callback){size+=chunk.length;if(size>maxBytes)callback(new Error('Download exceeded the size limit.'));else callback(null,chunk);}});
  try{await pipeline(Readable.fromWeb(response.body),bound,createWriteStream(file));}catch(e){await unlink(file).catch(()=>{});throw e;}
  return {size,type};
}
async function main() {
  const args=process.argv.slice(2);
  const get=name=>{const i=args.indexOf(name);if(i<0)return null;if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Missing value for ${name}.`);return args[i+1];};
  const local=get('--file'), direct=get('--url');
  if(local&&direct)throw new Error('Use --file or --url, not both.');
  let source=direct?publicURL(direct,PAGE):null,poster=null;
  let status='user-provided-hero';
  if(!local&&!direct){
    console.log(`Reading the video reference from ${PAGE}`);
    const response=await fetch(PAGE,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error(`Page returned HTTP ${response.status}.`);
    ({src:source,poster}=findHeroVideo(await response.text(),response.url));
    status='live-site-import';
    console.log(`Hero media found: ${source}`);
  }
  const extension=extname(local||new URL(source).pathname).toLowerCase();
  if(extension!=='.mp4'&&extension!=='.webm')throw new Error('Use an MP4 or WebM file. The original may need conversion first.');
  const rel=`assets/events/video/live-site-hero${extension}`,dest=resolve(root,rel),tmp=dest+'.tmp';
  await mkdir(dirname(dest),{recursive:true});
  if(local){const info=await stat(resolve(local));if(!info.isFile()||info.size>250*1024*1024)throw new Error('Expected a video file smaller than 250 MB.');await copyFile(resolve(local),tmp);}
  else await download(source,tmp,250*1024*1024,/^(video\/(?:mp4|webm)|application\/octet-stream)$/);
  await rename(tmp,dest);
  let posterRel='assets/brand-mark.png';
  const posterDest=resolve(root,'assets/events/posters/live-site-hero.jpg');
  const frame=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','0.5','-i',dest,'-frames:v','1','-vf','scale=1280:1280:force_original_aspect_ratio=decrease','-q:v','3',posterDest],{timeout:30000,encoding:'utf8'});
  if(frame.status===0)posterRel='assets/events/posters/live-site-hero.jpg';
  else if(poster){
    try{
      const ext=extname(new URL(poster).pathname).toLowerCase();
      if(['.jpg','.jpeg','.png','.webp'].includes(ext)){
        const path=`assets/events/posters/live-site-hero${ext}`;
        await download(poster,resolve(root,path),15*1024*1024,/^image\/(?:jpeg|png|webp)$/);
        posterRel=path;
      }
    }catch(e){console.warn(`Poster not imported: ${e.message}. A neutral brand poster will be used.`);}
  }
  const configFile=resolve(root,'media.config.js'),sandbox={window:{}};
  vm.runInNewContext(await readFile(configFile,'utf8'),sandbox);
  const clips=sandbox.window.BARSYS_MEDIA;
  clips.hero={type:'local',src:rel,poster:posterRel,title:'THE BARSYS EXPERIENCE.',description:status==='live-site-import'?'The original hero video, imported from happyhours.barsys.com. Background playback is muted; open the player for full controls.':'Original hero video provided by the project owner. Background playback is muted; open the player for full controls.',sourceStatus:status,sourcePage:PAGE,sourceURL:source||null,duration:0};
  await writeFile(configFile,'window.BARSYS_MEDIA = '+JSON.stringify(clips,null,2)+';\n');
  await writeFile(resolve(root,'reference/imported-hero.json'),JSON.stringify({sourcePage:PAGE,sourceURL:source,sourceStatus:status,importedAt:new Date().toISOString(),localPath:rel,poster:posterRel},null,2)+'\n');
  console.log('Local hero video updated. The production website was not touched.');
  const result=spawnSync(process.execPath,[resolve(root,'scripts/build-preview.mjs')],{cwd:root,stdio:'inherit'});
  if(result.status!==0)throw new Error('Media imported, but preview build failed. Run npm run preview after checking the project files.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('\nHero import not completed: '+e.message+'\nNo changes were made to the live website.');process.exitCode=1;});
