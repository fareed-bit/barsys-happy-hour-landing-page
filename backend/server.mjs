import {sitePaths,seoSettings,sitemap,decorate} from './site-seo.mjs';
import {defaultPolicy,publicPolicy} from './menu-policy.mjs';
import http from 'node:http';
import {createGzip,gzipSync} from 'node:zlib';
import {createReadStream} from 'node:fs';
import {stat,realpath,readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createAPI} from './api.mjs';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const local=process.env.NODE_ENV!=='production';
const staging=process.env.STAGING_MODE==='1';
const port=Number(process.env.PORT||3089);
const origin=process.env.PUBLIC_ORIGIN||`http://localhost:${port}`;
if(!local&&!process.env.DATABASE_URL)throw new Error('Production requires DATABASE_URL for PostgreSQL. SQLite is local-only.');
const store=await createStore({databaseURL:process.env.DATABASE_URL,filename:process.env.BARSYS_DB||resolve(root,'../barsys-data/inquiries.sqlite')});
const auth=createAuth({store,clientId:process.env.GOOGLE_CLIENT_ID,secure:!local});
const api=createAPI({store,local,staging,origin,auth,queueNotifications:process.env.BARSYS_BACKGROUND_EMAIL_ENABLED==='1',rehearsalMarker:process.env.BARSYS_EMAIL_REHEARSAL_MARKER||'',trustedProxyHops:Number(process.env.BARSYS_TRUSTED_PROXY_HOPS||0)});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.ico':'image/x-icon','.woff2':'font/woff2'};
const seo=seoSettings({origin,indexing:process.env.BARSYS_INDEXING_ENABLED,staging,local});
const runtime={mode:staging?'STAGING_TEST':local?'LOCAL_TEST':'LIVE',secure:!local};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(local&&![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
 if(await api(req,res))return;
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if((req.url==='/admin'||req.url?.startsWith('/admin/'))&&(await auth.user(req))?.role==='crew'&&!req.url.startsWith('/admin/crew.')&&!req.url.startsWith('/admin/style.css')&&!req.url.startsWith('/admin/operations.css')&&!req.url.startsWith('/admin/login.')){res.writeHead(303,{Location:'/admin/crew.html'});return res.end();}
  const path=decodeURIComponent(new URL(req.url,origin).pathname);const relative=path==='/'?'index.html':path==='/admin'||path==='/admin/'?'admin/index.html':path.slice(1);
  if(path==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(seo.enabled?'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: '+seo.origin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n');}
  if(path==='/sitemap.xml'){res.writeHead(200,{'Content-Type':'application/xml'});return res.end(sitemap(seo));}
  if(staging&&(relative==='index.html'||relative.startsWith('site/')&&relative.endsWith('.html'))&&!await auth.user(req)){res.writeHead(303,{Location:'/admin/login.html'});return res.end();}
  // Staff pages require a server-verified session in every mode; static admin HTML must never be readable anonymously.
  if(relative.startsWith('admin/')&&relative.endsWith('.html')&&relative!=='admin/login.html'&&!await auth.user(req)){const next=new URL(req.url,origin);const target=next.pathname.startsWith('/admin')&&/^[\w./?=&%-]*$/.test(next.pathname+next.search)?next.pathname+next.search:'';res.writeHead(303,{Location:'/admin/login.html'+(target?'?next='+encodeURIComponent(target):'')});return res.end();}
  // Serve only public application assets; never source, secrets, databases, packages or QA exports.
  if(!(/^[\w.-]+\.(html|css|js)$/.test(relative)&&!relative.endsWith('Codex-Ready.html')||/^(assets|admin|site)\/[\w./-]+$/.test(relative))||relative.split('/').some(p=>p.startsWith('.'))||!mime[extname(relative)]){res.writeHead(404);return res.end('Not found');}
  const file=await realpath(resolve(root,relative));if(!file.startsWith(root+sep))throw new Error('Invalid path');const info=await stat(file);if(!info.isFile())throw new Error('Invalid file');
  // Static delivery: gzip compressible text, cache immutable-by-deploy assets briefly, answer conditional requests. HTML stays no-store because it carries runtime state.
  const type=mime[extname(file)];const gzip=/^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(type)&&/\bgzip\b/.test(req.headers['accept-encoding']||'');if(gzip)res.setHeader('Vary','Accept-Encoding');
  if(!relative.endsWith('.html')){res.setHeader('Cache-Control',relative.startsWith('assets/')?'public, max-age=86400':'public, max-age=600, must-revalidate');res.setHeader('Last-Modified',info.mtime.toUTCString());const since=Date.parse(req.headers['if-modified-since']||'');if(!req.headers.range&&Number.isFinite(since)&&since>=Math.floor(info.mtimeMs/1000)*1000){res.writeHead(304);return res.end();}}
  const sendHTML=html=>{const body=req.method==='HEAD'?'':html;if(gzip&&body){res.writeHead(200,{'Content-Type':mime['.html'],'Content-Encoding':'gzip'});return res.end(gzipSync(Buffer.from(body)));}res.writeHead(200,{'Content-Type':mime['.html']});return res.end(body);};
  if(sitePaths.has(path)&&seo.enabled)res.setHeader('X-Robots-Tag','index, follow');
  if(relative.startsWith('site/')&&relative.endsWith('.html')&&sitePaths.has(path))return sendHTML(decorate(await readFile(file,'utf8'),path,seo));
  if(relative==='index.html'){const html=(await readFile(file,'utf8')).replace("connect-src 'none'","connect-src 'self'").replace('<script src="config.js"></script>','<script src="config.js"></script><script>window.BARSYS_RUNTIME='+JSON.stringify(runtime)+';window.BARSYS.menuPolicy='+JSON.stringify(publicPolicy((await store.getMenuPolicy())||defaultPolicy())).replace(/</g,'\\u003c')+';</script>');return sendHTML(decorate(html,'/',seo));}
  let start=0,end=info.size-1,status=200;const headers={'Content-Type':mime[extname(file)],'Accept-Ranges':'bytes'};
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416);return res.end();}if(m[1]){start=Number(m[1]);if(m[2])end=Math.min(Number(m[2]),end);}else start=Math.max(0,info.size-Number(m[2]));if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
  const compress=gzip&&status===200&&info.size>1024;if(compress)headers['Content-Encoding']='gzip';else headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD'||!info.size)return res.end();const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());if(compress){const encoder=createGzip();encoder.on('error',()=>res.destroy());stream.pipe(encoder).pipe(res);}else stream.pipe(res);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,local?'127.0.0.1':'0.0.0.0',()=>console.log(`Barsys ${local?'LOCAL TEST':'backend'}: ${origin} | Dashboard: ${origin}/admin`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await store.close();process.exit(0);}));
