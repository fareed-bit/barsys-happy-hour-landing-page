// Purchase receipt files (photo or PDF evidence with the amount paid). Bytes live in a private GCS bucket in production,
// written through the Cloud Run runtime service account with the JSON API; locally and in tests they live in a private directory.
// Rows stay on the event in operations state (action receipt-file) so version checks, audit and seven-year retirement apply.
import {GoogleAuth} from 'google-auth-library';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
import {HttpError} from './model.mjs';
export const RECEIPT_MAX_BYTES=8*1024*1024;
export const receiptTypes={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'};
const magic={'image/jpeg':[0xff,0xd8,0xff],'image/png':[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],'application/pdf':[0x25,0x50,0x44,0x46]};
export const receiptPathPattern=/^events\/[a-f0-9-]{36}\/receipts\/[a-f0-9-]{36}\.(jpg|png|pdf)$/;
export const isDay=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
export const receiptObjectPath=(eventId,id,type)=>`events/${eventId}/receipts/${id}.${receiptTypes[type]}`;
export function decodeReceipt(dataBase64){
 if(typeof dataBase64!=='string'||!dataBase64)throw new HttpError(422,'Attach a receipt photo or PDF.');
 if(dataBase64.length>Math.ceil(RECEIPT_MAX_BYTES/3)*4+4)throw new HttpError(413,'Receipt files must be 8 MB or smaller. Take the photo again at a lower resolution or export a smaller PDF.');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64))throw new HttpError(400,'The file could not be read. Choose it again and retry.');
 const bytes=Buffer.from(dataBase64,'base64');
 if(!bytes.length)throw new HttpError(422,'The receipt file is empty.');
 if(bytes.length>RECEIPT_MAX_BYTES)throw new HttpError(413,'Receipt files must be 8 MB or smaller.');
 return bytes;
}
export function receiptContentType(declared,bytes){
 const type=String(declared||'').toLowerCase().split(';')[0].trim();
 if(/^image\/hei[cf]$/.test(type))throw new HttpError(415,'HEIC photos are not accepted. On iPhone choose Settings → Camera → Formats → Most Compatible, or share the photo as JPEG, then upload again.');
 if(!receiptTypes[type])throw new HttpError(415,'Upload a JPEG or PNG photo, or a PDF.');
 const sig=magic[type];if(bytes.length<sig.length||sig.some((b,i)=>bytes[i]!==b))throw new HttpError(415,'The file content does not match its type. Upload the original photo or PDF.');
 return type;
}
const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
export function receiptsCSV(rows,eventInfo,origin){
 const head=['Paid on','Event','Event date','Supplier','Amount USD','Note','Filename','Type','Uploaded by','Uploaded at','Event ID','Receipt ID','Link'];
 const lines=[head.map(csvCell).join(',')];let total=0;
 for(const r of rows){const info=eventInfo.get(r.eventId)||{};total+=r.amountCents;lines.push([r.paidOn,info.name||r.eventId,info.date||'',r.supplier,(r.amountCents/100).toFixed(2),r.note||'',r.filename,r.contentType,r.by,r.at,r.eventId,r.id,`${origin}/api/admin/inquiries/${r.eventId}/receipts/${r.id}`].map(csvCell).join(','));}
 lines.push(['TOTAL','','','',(total/100).toFixed(2),`${rows.length} receipt(s)`,'','','','','','',''].map(csvCell).join(','));
 return lines.join('\r\n')+'\r\n';
}
// Storage back ends share one small interface: put(path,bytes,type), get(path) -> Buffer|null, remove(path).
export function createReceiptFiles({bucket='',directory='',fetcher=globalThis.fetch,accessToken}={}){
 if(bucket){
  if(!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket))throw new Error('Invalid BARSYS_RECEIPT_BUCKET.');
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/devstorage.read_write']});
  const token=accessToken||(()=>auth.getAccessToken());
  const objects=`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o`;
  const call=async(url,init={})=>{const t=await token();if(!t)throw new Error('No storage credential is available to the service.');return fetcher(url,{...init,headers:{...init.headers,Authorization:'Bearer '+t},signal:AbortSignal.timeout(20000)});};
  const check=path=>{if(!receiptPathPattern.test(path))throw new Error('Invalid receipt path.');return encodeURIComponent(path);};
  return {
   mode:'gcs',bucket,
   async put(path,bytes,contentType){const name=check(path);const r=await call(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${name}&ifGenerationMatch=0`,{method:'POST',headers:{'Content-Type':contentType},body:bytes});if(!r.ok)throw new Error('Receipt storage write failed ('+r.status+').');},
   async get(path){const r=await call(`${objects}/${check(path)}?alt=media`);if(r.status===404)return null;if(!r.ok)throw new Error('Receipt storage read failed ('+r.status+').');return Buffer.from(await r.arrayBuffer());},
   async remove(path){const r=await call(`${objects}/${check(path)}`,{method:'DELETE'});if(!r.ok&&r.status!==404)throw new Error('Receipt storage delete failed ('+r.status+').');}
  };
 }
 if(!directory)return {mode:'unconfigured',bucket:null,async put(){throw new HttpError(503,'Receipt storage is not configured. Set BARSYS_RECEIPT_BUCKET on the service; the receipt was not saved.');},async get(){return null;},async remove(){}};
 const root=resolve(directory);
 const file=path=>{if(!receiptPathPattern.test(path))throw new Error('Invalid receipt path.');const f=resolve(root,path);if(!f.startsWith(root+sep))throw new Error('Invalid receipt path.');return f;};
 return {
  mode:'local',bucket:null,directory:root,
  async put(path,bytes){const f=file(path);await mkdir(dirname(f),{recursive:true,mode:0o700});await writeFile(f,bytes,{mode:0o600,flag:'wx'});},
  async get(path){try{return await readFile(file(path));}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  async remove(path){await rm(file(path),{force:true});}
 };
}
