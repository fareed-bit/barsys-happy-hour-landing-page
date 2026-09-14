import {createHash,randomUUID} from 'node:crypto';
import {config,detailKeys,validate,labels,estimate,HttpError} from './model.mjs';
export const inquiryLabel='Happy Hours Inquiries';

export const defaultKeywords=['happy hours','happy hour','Barsys event','cocktail catering','corporate event','office party','cocktail experience','mixology event','event proposal'];
export function validateKeywords(value){
 if(!Array.isArray(value)||value.length>30||value.some(k=>typeof k!=='string'||k.trim().length<2||k.length>80||!/^[\p{L}\p{N} '&’.-]+$/u.test(k)))throw new HttpError(422,'Use up to 30 keywords or phrases, 2–80 characters each. Letters, numbers, spaces, apostrophes, &, periods and hyphens only.');
 return [...new Set(value.map(k=>k.trim().replace(/\s+/g,' ').toLowerCase()))];
}
export function inquiryQuery(keywords){return '-in:sent -in:drafts {label:"'+inquiryLabel+'" '+validateKeywords(keywords).map(k=>'"'+k+'"').join(' ')+'}';}
const clean=s=>String(s||'').slice(0,20000);
export function emailDraft(message){
 const h=Object.fromEntries((message.payload?.headers||[]).map(x=>[x.name.toLowerCase(),x.value]));
 const parts=p=>p.mimeType==='text/plain'&&p.body?.data?Buffer.from(p.body.data,'base64url').toString('utf8'):(p.parts||[]).map(parts).join('\n');
 const text=clean(parts(message.payload||{})||message.snippet),from=clean(h.from),subject=clean(h.subject);
 const email=(from.match(/<([^<>\s]+@[^<>\s]+)>/)||from.match(/([^\s<>]+@[^\s<>]+)/))?.[1]||'';
 const name=from.includes('<')?from.slice(0,from.indexOf('<')).replace(/^"|"$/g,'').trim():'';
 const field=(key)=>text.match(new RegExp('(?:^|\\n)'+key+'\\s*:\\s*([^\\n]+)','i'))?.[1]?.trim()||'';
 const guests=text.match(/\b(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*(?:guests|people|attendees)\b/i);
 const date=field('(?:Event date|Date)');
 const details=Object.fromEntries(detailKeys.map(k=>[k,'']));
 Object.assign(details,{name,email,company:field('Company'),phone:field('Phone'),date:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'',city:field('City'),venue:field('Venue'),timezone:'America/New_York',region:'NY',venueType:'deciding',venueApproval:'not-checked',coi:'unsure',glassware:'discuss',marketingInterest:'no',photoPreference:'discuss'});
 return {messageId:message.id,threadId:message.threadId,subject,from,text,receivedAt:Number.isFinite(Number(message.internalDate))?new Date(Number(message.internalDate)).toISOString():null,payload:{schemaVersion:1,type:'exploring',guests:guests?Number(guests[2]||guests[1]):null,tier:'',menus:config.menus.filter(m=>(subject+' '+text).toLowerCase().includes(m.name.toLowerCase())).map(m=>m.id),menuMode:'recommend',addons:{},program:'single',frequency:'exploring',commitment:'exploring',billing:'exploring',beverage:'recommend',serviceHours:null,details}};
}
export function createGmail({store,clientId,fetcher=fetch}){
 async function google(path,token){const r=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new HttpError(r.status===401?401:502,r.status===401?'Gmail authorization expired. Connect Gmail again.':'Gmail could not complete this read. Check Gmail API access and retry.');return r.json();}
 return {
 async sync(input){
  const token=input?.accessToken;if(typeof token!=='string'||token.length>5000||!token)throw new HttpError(422,'Connect Gmail first.');
  const r=await fetcher('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(token),{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new HttpError(401,'Gmail authorization expired. Connect again.');const info=await r.json();
  if(info.aud!==clientId||!String(info.scope).split(' ').includes('https://www.googleapis.com/auth/gmail.readonly'))throw new HttpError(403,'Use this dashboard’s read-only Gmail connection.');
  const profile=await google('profile',token);if(profile.emailAddress?.toLowerCase()!=='fareed@barsys.com')throw new HttpError(403,'Connect fareed@barsys.com to this dashboard.');
  const settings=await store.getMailSettings();const keywords=settings?.keywords??defaultKeywords;
  if(input.settingsVersion!==undefined&&input.settingsVersion!==(settings?.version||0))throw new HttpError(409,'Keyword settings changed. Start a new check.');
  const cursor=input.pageToken||'';if(typeof cursor!=='string'||cursor.length>2000)throw new HttpError(422,'Invalid Gmail page.');
  const list=await google('messages?maxResults=25&q='+encodeURIComponent(inquiryQuery(keywords))+(cursor?'&pageToken='+encodeURIComponent(cursor):''),token);let added=0;
  for(const m of list.messages||[]){if(await store.getMail(m.id))continue;const message=await google('messages/'+encodeURIComponent(m.id)+'?format=full',token);const draft=emailDraft(message);draft.matchReason='Matched saved Gmail label / keyword search';if(await store.insertMail(draft))added++;}
  return {added,nextPageToken:list.nextPageToken||null};
 },
 async create(id,input,actor,mode){
  const mail=await store.getMail(id);if(!mail||mail.disposedAt)throw new HttpError(404,'Email copy unavailable.');
  const key='gmail_'+createHash('sha256').update('fareed@barsys.com:'+mail.threadId).digest('hex');const old=await store.findKey(key);if(old)return {id:JSON.parse(old.document).id,existing:true};
  if(input.confirmed!==true)throw new HttpError(422,'Confirm the event details against the email before creating it.');
  const payload=validate(input.payload),now=new Date().toISOString();
  const doc={id:randomUUID(),createdAt:now,updatedAt:now,version:1,status:'received',owner:actor,payload,labels:labels(payload),estimate:estimate(payload),mode,source:{type:'gmail',messageId:id,threadId:mail.threadId},booking:{confirmed:false,dateHeld:false,agreementSigned:false,paymentReceived:false},history:[{at:now,actor,action:'Event created after email inquiry review. No client consent, booking or payment inferred.'}]};
  try{await store.insert(doc,key,createHash('sha256').update(JSON.stringify(payload)).digest('hex'));}catch(e){const race=await store.findKey(key);if(race)return {id:JSON.parse(race.document).id,existing:true};throw e;}
  return {id:doc.id,existing:false};
 }
 };
}
