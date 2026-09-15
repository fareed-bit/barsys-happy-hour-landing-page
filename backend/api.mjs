import {clientAddress} from './request-identity.mjs';
import {retentionView,retentionChange} from './retention.mjs';
import {createGmailSend} from './gmail-send.mjs';
import {inquiryNotifications} from './notifications.mjs';
import {applyPreparationChange} from './preparation-changes.mjs';
import {defaultPolicy,publicPolicy,menuCostAudit,validatePolicy} from './menu-policy.mjs';
import {createGmail,inquiryLabel,defaultKeywords,validateKeywords} from './gmail.mjs';
import {editedPayload,changeImpact,applyEventChange,acceptProposal,editableDetails} from './event-changes.mjs';
import {config} from './model.mjs';
import {proposalView,validateProposal} from './proposals.mjs';
import {ownerEmail,assigned,crewEvent,allowCrewAction} from './crew.mjs';
import {priceCatalog,ingredientKey} from './costing.mjs';
import {applyOperation,stages,checklist,expenseCategories,defaultEvent,finances} from './operations.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {validate,estimate,labels,statuses,HttpError} from './model.mjs';
import {defaultPreparation,validatePreparation,preparationSummary,recipeCatalog} from './preparation.mjs';
import {createReceiptFiles,decodeReceipt,receiptContentType,receiptObjectPath,receiptsCSV,isDay,RECEIPT_MAX_BYTES} from './receipt-files.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createAPI({store,local=true,staging=false,origin,auth,gmailFetch,queueNotifications=false,rehearsalMarker="",trustedProxyHops=0,receiptFiles=createReceiptFiles({})}){
 const testSend=createGmailSend({clientId:auth?.clientId,fetcher:gmailFetch});
 const gmail=createGmail({store,clientId:auth?.clientId,fetcher:gmailFetch});
 const inventoryTemplates=[...new Map(Object.values(recipeCatalog.menus).flatMap(m=>m.recipes.flatMap(r=>r.ingredients)).map(x=>[ingredientKey(x),{name:x.name,unit:x.unit,kind:'consumable'}])).values()].sort((a,b)=>a.name.localeCompare(b.name)).map(x=>{const p=priceCatalog.items.find(p=>ingredientKey(p)===ingredientKey(x));return {...x,packAmount:p?.packAmount||null,product:p?.product||null,packLabel:p?.packLabel||null};});
 inventoryTemplates.unshift(...['Barsys 360','iPad','iPad stand','Charging cord','Charging block','Shaker','360 funnel','Mixing glass','Portable charger'].map(name=>({name,kind:'equipment',unit:'each'})),...['Microfiber towels','Clorox wipes','Ice bags','Disposable cups'].map(name=>({name,kind:'consumable',unit:'each'})));
 const operationsView=state=>({state,stages,checklist,expenseCategories,inventoryTemplates,eventTemplate:defaultEvent(),financials:Object.fromEntries(Object.entries(state.events).map(([id,e])=>[id,finances(e,state,id)]))});
 if(!auth)throw new Error('An authentication provider is required.');
 if(!local&&(!origin?.startsWith('https://')||!auth.clientId))throw new Error('Production requires HTTPS PUBLIC_ORIGIN and GOOGLE_CLIENT_ID.');
 const mode=staging?'STAGING_TEST':local?'LOCAL_TEST':'LIVE';
 async function throttle(req){if(local&&process.env.BARSYS_QA_DISABLE_RATE_LIMIT==='1')return;if(!await store.consumeRate(hash((await auth.user?.(req))?.email||clientAddress(req,trustedProxyHops)),Date.now()))throw new HttpError(429,'Too many requests. Retry in a minute.');}
 async function body(req,limit=65536,tooLarge='Event details are too large.'){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new HttpError(415,'Use JSON.');let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw new HttpError(413,tooLarge);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new HttpError(400,'Invalid JSON.');}}
 const receiptObjectRemove=async path=>{try{await receiptFiles.remove(path);}catch(error){console.error(JSON.stringify({severity:'WARNING',event:'receipt_object_remove_failed',path,type:error.name||'Error'}));}};
 function receipt(doc){if(doc.disposedAt)throw new HttpError(410,'This inquiry was removed under the retention policy.');return {id:doc.id,createdAt:doc.createdAt,status:'received',mode:staging?'STAGING_TEST':local?'LOCAL_TEST':'INQUIRY_RECEIVED',booked:false};}
 return async function api(req,res){
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith('/api/'))return false;
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})});res.end(JSON.stringify(data));};
  try{
   if(req.headers.origin&&req.headers.origin!==origin)throw new HttpError(403,'Request origin is not allowed.');
   if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Cross-site requests are not allowed.');
   if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)throw new HttpError(403,'A same-origin request is required.');
   if(req.method==='GET'&&path==='/api/auth/me'){send(200,{user:await auth.user(req),configured:!!auth.clientId});return true;}
   if(req.method==='GET'&&path==='/api/auth/challenge'){await throttle(req);send(200,await auth.challenge(res));return true;}
   if(req.method==='POST'&&path==='/api/auth/google'){await throttle(req);send(200,await auth.signIn(req,res,await body(req)));return true;}
   if(req.method==='POST'&&path==='/api/auth/logout'){send(200,await auth.signOut(req,res));return true;}
   if(req.method==='GET'&&path==='/api/ready'){try{await store.checkHealth();send(200,{ready:true});}catch{send(503,{ready:false});}return true;}
   if(req.method==='GET'&&path==='/api/status'){send(200,{enabled:true,mode,statuses,release:process.env.K_REVISION||process.env.STAGING_RELEASE||process.env.RELEASE_ID||'local'});return true;}
   if(req.method==='GET'&&path==='/api/menu-policy'){send(200,publicPolicy((await store.getMenuPolicy())||defaultPolicy()));return true;}
   if(staging)await auth.require(req);
   if(req.method==='POST'&&path==='/api/inquiries'){
    await throttle(req);const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{16,100}$/.test(key))throw new HttpError(400,'A valid submission key is required.');
    const payload=validate(await body(req));const fingerprint=hash(JSON.stringify(payload));
    const existing=await store.findKey(key);
    if(existing){if(existing.fingerprint!==fingerprint)throw new HttpError(409,'This submission key was already used for different event details.');send(200,receipt(JSON.parse(existing.document)));return true;}
    const policy=await store.getMenuPolicy();if(policy?.published){const rank={classic:0,signature:1,reserve:2};const invalid=payload.menus.filter(id=>!(policy.assignments[id] in rank)||rank[policy.assignments[id]]>rank[payload.tier]);if(invalid.length)throw new HttpError(422,'Some selected collections are unavailable for this package. Review your menu choices.');}
    const now=new Date().toISOString();const doc={id:randomUUID(),createdAt:now,updatedAt:now,version:1,status:'received',owner:'',payload,labels:labels(payload),estimate:estimate(payload),mode,booking:{confirmed:false,dateHeld:false,agreementSigned:false,paymentReceived:false},history:[{at:now,actor:'Organizer',action:'Inquiry saved'}]};
    try{await store.insert(doc,key,fingerprint,(queueNotifications&&!local&&!staging)||(staging&&!!rehearsalMarker&&payload.details.notes===rehearsalMarker&&payload.details.company==='TEST ONLY - Email delivery rehearsal'&&payload.details.email===ownerEmail));}catch(error){const raced=await store.findKey(key);if(!raced)throw error;if(raced.fingerprint!==fingerprint)throw new HttpError(409,'Conflicting submission key.');send(200,receipt(JSON.parse(raced.document)));return true;}
    send(201,receipt(doc));return true;
   }
   if(path.startsWith('/api/crew/')){
    const actor=await auth.require(req),previous=await store.getOperations();
    if(req.method==='GET'&&path==='/api/crew/events'){let docs=[],offset=0;for(;;){const page=await store.list(100,offset);docs.push(...page.filter(d=>assigned(previous,actor,d.id)));if(page.length<100)break;offset+=100;}send(200,{version:previous.version,stages,checklist,events:docs.map(d=>crewEvent(previous,d))});return true;}
    if(req.method==='POST'&&path==='/api/crew/action'){await throttle(req);const command=await body(req);allowCrewAction(previous,actor,command);if(command.version!==previous.version)throw new HttpError(409,'Event changed. Refresh and retry.');const next=applyOperation(previous,command,actor);if(!await store.saveOperations(next,previous.version))throw new HttpError(409,'Event changed. Refresh and retry.');send(200,{saved:true});return true;}
   }
   if(path.startsWith('/api/admin/')){
    const actor=await auth.require(req);if(actor!==ownerEmail)throw new HttpError(403,'Owner access required.');
    if(path==='/api/admin/system-health'&&req.method==='GET'){await store.checkHealth();send(200,{database:true,email:await store.notificationHealth(),worker:await store.workerHealth(),receipts:{mode:receiptFiles.mode,bucket:receiptFiles.bucket||null},checkedAt:new Date().toISOString()});return true;}
    if(path==='/api/admin/retention'&&req.method==='GET'){
     const url=new URL(req.url,origin),kind=url.searchParams.get('kind')||'event',offset=Number(url.searchParams.get('offset')||0);
     if(!['event','mail'].includes(kind)||!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'Invalid page.');
     const docs=kind==='event'?await store.list(51,offset,'all'):await store.listMail(offset),ops=await store.getOperations();
     const items=await Promise.all(docs.slice(0,50).map(async d=>retentionView(d,kind,await store.getRetention(kind+':'+(kind==='event'?d.id:d.messageId))||{},ops)));
     send(200,{items,nextOffset:docs.length>50?offset+50:null});return true;
    }
    if(path==='/api/admin/retention/disposal-ledger'&&req.method==='GET'){
     res.setHeader('Content-Disposition','attachment; filename="barsys-disposal-ledger.json"');
     send(200,{...await store.exportDisposalLedger(),exportedAt:new Date().toISOString()});return true;
    }
    const retirementMatch=/^\/api\/admin\/retention\/event\/([a-zA-Z0-9_-]{1,100})\/retire$/.exec(path);
    if(retirementMatch&&req.method==='POST'){
     await throttle(req);const input=await body(req),id=retirementMatch[1];
     if(input.confirm!==`RETIRE ${id}`||input.reviewedCopies!==true||input.obligationsCleared!==true||!Number.isInteger(input.version)||!Number.isInteger(input.reviewVersion))throw new HttpError(422,'Confirm record, outside-copy handling and cleared preservation obligations.');
     const result=await store.retireEvent(id,input.version,input.reviewVersion,actor);
     if(!result.removed)throw new HttpError(409,result.error);
     // Receipt photos leave storage with their rows; the ledger lists the object paths in case a delete has to be finished by hand.
     for(const objectPath of result.receiptObjects||[])await receiptObjectRemove(objectPath);
     send(200,{removed:true,notice:'Event-linked personal detail removed from active records. Aggregate financial values and pseudonymous identifiers remain. External copies require separate handling.'});return true;
    }
    const mailDisposalMatch=/^\/api\/admin\/retention\/mail\/([a-zA-Z0-9_-]{1,100})\/remove$/.exec(path);
    if(mailDisposalMatch&&req.method==='POST'){
     await throttle(req);const input=await body(req),id=mailDisposalMatch[1];
     if(input.confirm!==`REMOVE ${id}`||input.reviewedCopies!==true||!Number.isInteger(input.reviewVersion))throw new HttpError(422,'Confirm the exact email copy and review other copies.');
     const result=await store.disposeMail(id,input.reviewVersion,actor);
     if(!result.removed)throw new HttpError(409,result.error);
     send(200,{removed:true,notice:'Dashboard email copy removed. Gmail is unchanged. A minimal message identifier prevents reimport; backups require separate handling.'});return true;
    }
    const disposalMatch=/^\/api\/admin\/retention\/event\/([a-zA-Z0-9_-]{1,100})\/remove$/.exec(path);
    if(disposalMatch&&req.method==='POST'){
     await throttle(req);const input=await body(req),id=disposalMatch[1];
     if(input.confirm!==`REMOVE ${id}`||input.reviewedCopies!==true||!Number.isInteger(input.version)||!Number.isInteger(input.reviewVersion))throw new HttpError(422,'Confirm the exact record and review exported, email and backup copies.');
     const result=await store.disposeInquiry(id,input.version,input.reviewVersion,actor);
     if(!result.removed)throw new HttpError(409,result.error);
     send(200,{removed:true,notice:'Active inquiry content removed. Receipt key metadata and a minimal audit record remain; external copies and backups require separate handling.'});return true;
    }
    const retentionMatch=/^\/api\/admin\/retention\/(event|mail)\/([a-zA-Z0-9_-]{1,100})$/.exec(path);
    if(retentionMatch&&req.method==='PATCH'){
     await throttle(req);const [,kind,id]=retentionMatch,record=kind==='event'?await store.get(id):await store.getMail(id);if(!record||record.disposedAt)throw new HttpError(404,'Record not found.');
     const key=kind+':'+id,old=await store.getRetention(key),doc=retentionChange(await body(req),old,actor);
     if(!await store.saveRetention(key,doc,old?.version||0))throw new HttpError(409,'Retention record changed. Reload before saving.');
     send(200,{saved:true});return true;
    }
    if(path==='/api/admin/notifications'&&req.method==='GET'){send(200,{items:await store.notificationStatus()});return true;}
    const notificationMatch=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})\/notification-preview$/.exec(path);
    if(notificationMatch&&req.method==='GET'){const doc=await store.get(notificationMatch[1]);if(!doc)throw new HttpError(404,'Inquiry not found.');send(200,inquiryNotifications(doc));return true;}
    if(path==='/api/admin/menu-policy'){
     if(req.method==='GET'){send(200,{policy:(await store.getMenuPolicy())||defaultPolicy(),audit:menuCostAudit()});return true;}
     if(req.method==='PATCH'){await throttle(req);const old=(await store.getMenuPolicy())||defaultPolicy(),doc=validatePolicy(await body(req),old,actor);if(!await store.saveMenuPolicy(doc,old.version))throw new HttpError(409,'Concurrent policy update. Reload and review.');send(200,{policy:doc,audit:menuCostAudit()});return true;}
    }
    if(path==='/api/admin/slack-ping'&&req.method==='POST'){await throttle(req);const input=await body(req);const text=typeof input?.text==='string'?input.text.trim():'';if(!text||text.length>3500)throw new HttpError(422,'Provide a message under 3500 characters.');const hook=process.env.BARSYS_SLACK_WEBHOOK_URL;if(!hook||!/^https:\/\/hooks\.slack\.com\//.test(hook))throw new HttpError(503,'Slack is not configured. Set BARSYS_SLACK_WEBHOOK_URL to a Slack incoming-webhook URL on the service; the list was not sent.');let r;try{r=await fetch(hook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(10000)});}catch{throw new HttpError(502,'Slack did not answer; nothing confirmed.');}if(!r.ok)throw new HttpError(502,'Slack rejected the message ('+r.status+').');send(200,{sent:true,at:new Date().toISOString(),by:actor});return true;}
    if(path==='/api/admin/email-inquiries/test-send'&&req.method==='POST'){await throttle(req);send(200,await testSend(await body(req)));return true;}
    if(path==='/api/admin/email-inquiries'&&req.method==='GET'){const offset=Number(new URL(req.url,origin).searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'Invalid page.');const rows=await store.listMail(offset);send(200,{settings:(await store.getMailSettings())||{version:0,keywords:defaultKeywords},items:rows.slice(0,50),nextOffset:rows.length>50?offset+50:null,clientId:auth.clientId,label:inquiryLabel,packages:Object.entries(config.packages).map(([id,p])=>({id,name:p.name})),menus:config.menus.map(m=>({id:m.id,name:m.name}))});return true;}
    if(path==='/api/admin/email-inquiries/settings'&&req.method==='PATCH'){await throttle(req);const input=await body(req),old=await store.getMailSettings();if(input.version!==(old?.version||0))throw new HttpError(409,'Keyword settings changed. Reload and review.');const doc={version:input.version+1,keywords:validateKeywords(input.keywords),updatedAt:new Date().toISOString(),updatedBy:actor};if(!await store.saveMailSettings(doc,input.version))throw new HttpError(409,'Keyword settings changed. Reload and review.');send(200,doc);return true;}
    if(path==='/api/admin/email-inquiries/sync'&&req.method==='POST'){await throttle(req);send(200,await gmail.sync(await body(req)));return true;}
    const mailMatch=/^\/api\/admin\/email-inquiries\/([a-zA-Z0-9_-]{1,100})\/create$/.exec(path);
    if(mailMatch&&req.method==='POST'){await throttle(req);send(200,await gmail.create(mailMatch[1],await body(req),actor,mode));return true;}
    if(req.method==='GET'&&path==='/api/admin/inquiries'){const url=new URL(req.url,origin);const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'Invalid page.');const rows=await store.list(101,offset);send(200,{items:rows.slice(0,100),nextOffset:rows.length>100?offset+100:null});return true;}
    if(path==='/api/admin/operations'){
     if(req.method==='GET'){send(200,operationsView(await store.getOperations()));return true;}
     if(req.method==='POST'){
      await throttle(req);const command=await body(req),previous=await store.getOperations();
      if(command.version!==previous.version)throw new HttpError(409,'Operations changed. Refresh and retry; nothing was saved.');
      if(command.payload?.eventId&&!await store.get(command.payload.eventId))throw new HttpError(404,'Event not found.');
      if(command.action==='receive-stock'&&command.payload.templateIndex!==undefined){const template=inventoryTemplates[command.payload.templateIndex];if(!template)throw new HttpError(422,'Choose a valid inventory template.');command.payload.newItem={name:template.name,kind:template.kind,unit:template.unit};}
      const state=applyOperation(previous,command,actor);
      if(!await store.saveOperations(state,previous.version))throw new HttpError(409,'Another staff member changed operations. Refresh and retry.');
      send(200,operationsView(state));return true;
     }
    }
    if(path==='/api/admin/receipts/export'&&req.method==='GET'){
     // CSV of every uploaded purchase receipt (optionally by paid-on range) for expensing; links go through the owner-only proxy route.
     const url=new URL(req.url,origin),from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||'';
     if((from&&!isDay(from))||(to&&!isDay(to)))throw new HttpError(400,'Use YYYY-MM-DD dates for the receipt range.');
     const state=await store.getOperations(),rows=[];
     for(const [eventId,e] of Object.entries(state.events))for(const r of e.receiptFiles||[]){if((from&&r.paidOn<from)||(to&&r.paidOn>to))continue;rows.push({eventId,...r});}
     rows.sort((a,b)=>a.paidOn.localeCompare(b.paidOn)||a.at.localeCompare(b.at));
     const info=new Map();for(const eventId of new Set(rows.map(r=>r.eventId))){const doc=await store.get(eventId);info.set(eventId,{name:doc?.payload?.details?.company||doc?.payload?.details?.name||eventId,date:doc?.payload?.details?.date||''});}
     res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="barsys-receipts${from?'-from-'+from:''}${to?'-to-'+to:''}.csv"`});res.end(receiptsCSV(rows,info,origin));return true;
    }
    const receiptMatch=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})\/receipts(?:\/([a-f0-9-]{36})(\/remove)?)?$/.exec(path);
    if(receiptMatch){
     const [,eventId,receiptId,removing]=receiptMatch;
     if(!receiptId&&req.method==='POST'){
      // Upload: JSON {version, filename, contentType, dataBase64, amountCents, supplier, paidOn, note, orderId}. Validate and record through applyOperation first, then store bytes, then commit the state with the version check; a lost race removes the object again.
      await throttle(req);const input=await body(req,Math.ceil(RECEIPT_MAX_BYTES/3)*4+65536,'Receipt files must be 8 MB or smaller.');
      if(!await store.get(eventId))throw new HttpError(404,'Event not found.');
      const previous=await store.getOperations();if(input.version!==previous.version)throw new HttpError(409,'Operations changed. Refresh and retry; the receipt was not saved.');
      const bytes=decodeReceipt(input.dataBase64),contentType=receiptContentType(input.contentType,bytes),id=randomUUID(),objectPath=receiptObjectPath(eventId,id,contentType);
      const state=applyOperation(previous,{action:'receipt-file',payload:{eventId,id,objectPath,filename:typeof input.filename==='string'?input.filename.slice(0,200):'',contentType,bytes:bytes.length,amountCents:input.amountCents,supplier:input.supplier,paidOn:input.paidOn,note:typeof input.note==='string'?input.note:'',...(input.orderId?{orderId:input.orderId}:{})}},actor);
      try{await receiptFiles.put(objectPath,bytes,contentType);}catch(error){if(error.status)throw error;console.error(JSON.stringify({severity:'ERROR',event:'receipt_object_write_failed',type:error.name||'Error',message:String(error.message).slice(0,200)}));throw new HttpError(503,'Receipt storage did not accept the file; nothing was saved. Retry in a minute.');}
      if(!await store.saveOperations(state,previous.version)){await receiptObjectRemove(objectPath);throw new HttpError(409,'Another staff member changed operations. Refresh and retry; the receipt was not saved.');}
      send(200,operationsView(state));return true;
     }
     if(receiptId&&!removing&&req.method==='GET'){
      // Proxy the stored bytes to the signed-in owner; no public or signed URLs exist for receipts.
      const state=await store.getOperations(),row=state.events[eventId]?.receiptFiles?.find(x=>x.id===receiptId);if(!row)throw new HttpError(404,'Receipt not found.');
      const bytes=await receiptFiles.get(row.objectPath);if(!bytes)throw new HttpError(404,'The receipt file is missing from storage.');
      const download=new URL(req.url,origin).searchParams.get('download')==='1',name=row.filename.replace(/[^\w.-]+/g,'_').slice(0,120)||'receipt';
      res.writeHead(200,{'Content-Type':row.contentType,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`${download?'attachment':'inline'}; filename="${name}"`});res.end(bytes);return true;
     }
     if(receiptId&&removing&&req.method==='POST'){
      await throttle(req);const input=await body(req),previous=await store.getOperations();if(input.version!==previous.version)throw new HttpError(409,'Operations changed. Refresh and retry; nothing was removed.');
      const row=previous.events[eventId]?.receiptFiles?.find(x=>x.id===receiptId);if(!row)throw new HttpError(404,'Receipt not found.');
      const state=applyOperation(previous,{action:'receipt-file-remove',payload:{eventId,id:receiptId}},actor);
      if(!await store.saveOperations(state,previous.version))throw new HttpError(409,'Another staff member changed operations. Refresh and retry; nothing was removed.');
      await receiptObjectRemove(row.objectPath);
      send(200,operationsView(state));return true;
     }
    }
    const deleteMatch=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})\/(delete|restore)$/.exec(path);
    if(deleteMatch&&req.method==='POST'){
     // Soft delete: hides test or dead inquiries from the desk, work queue and operations. Progressed events keep going through the retention review instead.
     await throttle(req);const input=await body(req),id=deleteMatch[1],doc=await store.get(id);if(!doc)throw new HttpError(404,'Event not found.');
     if(!Number.isInteger(input.version)||input.version!==doc.version)throw new HttpError(409,'This event changed. Refresh before deleting.');
     const now=new Date().toISOString(),old=doc.version;
     if(deleteMatch[2]==='delete'){
      if(doc.deleted)throw new HttpError(409,'Already deleted.');if(input.confirm!==true)throw new HttpError(422,'Confirm the deletion.');
      const ops=await store.getOperations(),e=ops.events[id];
      if(doc.acceptances?.length||doc.booking?.confirmed||(e&&(e.stage>0||e.payments?.length||e.receiptFiles?.length||e.orders?.length||e.staffing?.length))||ops.reservations.some(r=>r.eventId===id&&r.status!=='released')||ops.receipts?.some(r=>r.eventId===id))throw new HttpError(409,'This event has progressed (accepted proposal, payments, receipts, staffing, orders or stock). Retire it through Records and health instead.');
      doc.deleted={at:now,by:actor};doc.history.push({at:now,actor,action:'Event deleted (hidden from the desk and operations; restorable from Records and health)'});
     }else{if(!doc.deleted)throw new HttpError(409,'This event is not deleted.');delete doc.deleted;doc.history.push({at:now,actor,action:'Event restored'});}
     doc.version++;doc.updatedAt=now;if(!await store.update(doc,old))throw new HttpError(409,'Another staff member saved this event. Refresh and retry.');
     send(200,{[deleteMatch[2]==='delete'?'deleted':'restored']:true,version:doc.version});return true;
    }
    const editMatch=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})\/(details|accept-proposal)$/.exec(path);
    if(editMatch){
     const doc=await store.get(editMatch[1]);if(!doc)throw new HttpError(404,'Event not found.');const state=await store.getOperations();
     if(req.method==='GET'&&editMatch[2]==='details'){send(200,{version:doc.version,operationsVersion:state.version,payload:doc.payload,packages:Object.entries(config.packages).map(([id,x])=>({id,name:x.name})),menus:config.menus.map(x=>({id:x.id,name:x.name})),editableDetails,accepted:doc.acceptances?.at(-1)||null});return true;}
     if(['POST','PATCH'].includes(req.method)){
      await throttle(req);const input=await body(req);if(input.version!==doc.version||input.operationsVersion!==state.version)throw new HttpError(409,'Event or operations changed. Reload and review again; nothing was saved.');
      if(editMatch[2]==='details'&&req.method==='POST'){const payload=editedPayload(doc,input.payload);send(200,changeImpact(doc,payload,state));return true;}
      if(input.acknowledgeImpact!==true&&!input.previewOnly)throw new HttpError(422,'Review and acknowledge the operational impact first.');
      const result=editMatch[2]==='details'?applyEventChange(doc,editedPayload(doc,input.payload),state,actor):acceptProposal(doc,state,input,actor);
      if(input.previewOnly){send(200,{impact:result.impact});return true;}
      if(!await store.saveEventAndOperations(result.doc,doc.version,result.state,state.version))throw new HttpError(409,'Concurrent update. Reload and review again; nothing was saved.');
      send(200,{saved:true,version:result.doc.version,operationsVersion:result.state.version,impact:result.impact});return true;
     }
    }
    const proposalMatch=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})\/proposal$/.exec(path);
    if(proposalMatch){
     const doc=await store.get(proposalMatch[1]);if(!doc)throw new HttpError(404,'Event not found.');
     if(req.method==='GET'){send(200,proposalView(doc));return true;}
     if(req.method==='PATCH'){
      await throttle(req);const change=await body(req);if(change.version!==doc.version)throw new HttpError(409,'Event changed. Reload before saving your proposal. Your edits have not been overwritten.');
      const plan=validateProposal(change.plan),previous=doc.version,now=new Date().toISOString();
      if(doc.proposal?.sourceStale&&change.reviewCurrentEvent!==true)throw new HttpError(422,'Review the current event changes before saving this proposal.');
      doc.proposal={plan,sourceStale:false,revision:(doc.proposal?.revision||0)+1,savedAt:now,sourceVersion:doc.proposal?.sourceVersion||previous};doc.version++;doc.updatedAt=now;
      doc.history.push({at:now,actor,action:'Proposal draft saved, revision '+doc.proposal.revision+'. Booking, revenue and payments unchanged.'});
      if(!await store.update(doc,previous))throw new HttpError(409,'Another staff member saved this event. Reload before saving.');
      send(200,proposalView(doc));return true;
     }
    }
    const prepMatch=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})\/preparation$/.exec(path);
    if(prepMatch){
     const doc=await store.get(prepMatch[1]);if(!doc)throw new HttpError(404,'Event not found.');
     const operations=await store.getOperations();
     const view=(record,state,impact=null)=>{const plan=record.preparation||defaultPreparation(record.payload);return {version:record.version,operationsVersion:state.version,plan,summary:preparationSummary(record.payload,plan),recipeDefaults:defaultPreparation(record.payload).recipes,impact};};
     if(req.method==='GET'){send(200,view(doc,operations));return true;}
     if(req.method==='PATCH'){
      await throttle(req);const change=await body(req);
      if(!change||change.version!==doc.version||change.operationsVersion!==operations.version)throw new HttpError(409,'Event or operations changed. Refresh preparation and review your edits; nothing was saved.');
      const result=applyPreparationChange(doc,change.plan,operations,actor);
      if(!result.unchanged&&!await store.saveEventAndOperations(result.doc,doc.version,result.state,operations.version))throw new HttpError(409,'Concurrent update. Refresh preparation and operations; nothing was saved.');
      send(200,view(result.doc,result.state,result.impact));return true;
     }
    }
    const match=/^\/api\/admin\/inquiries\/([a-f0-9-]{36})$/.exec(path);
    if(match){const doc=await store.get(match[1]);if(!doc)throw new HttpError(404,'Event not found.');
     if(req.method==='GET'){send(200,doc);return true;}
     if(req.method==='PATCH'){
      await throttle(req);const patch=await body(req);
      if(!Number.isInteger(patch.version)||patch.version!==doc.version)throw new HttpError(409,'This event changed. Refresh before saving.');
      if(!statuses.includes(patch.status)||typeof patch.owner!=='string'||patch.owner.length>120||typeof patch.note!=='string'||patch.note.length>2000)throw new HttpError(422,'Check status, owner and note (maximum 2,000 characters).');
      const old=doc.version;const now=new Date().toISOString();const changes=[];
      if(doc.status!==patch.status)changes.push(`Status: ${doc.status} → ${patch.status}`);
      if(doc.owner!==patch.owner.trim())changes.push(`Owner: ${patch.owner.trim()||'Unassigned'}`);
      if(patch.note.trim())changes.push(patch.note.trim());
      if(!changes.length){send(200,doc);return true;}
      doc.status=patch.status;doc.owner=patch.owner.trim();doc.version++;doc.updatedAt=now;doc.history.push({at:now,actor,action:changes.join('\n')});
      if(!await store.update(doc,old))throw new HttpError(409,'Another staff member saved this event. Refresh before saving.');
      send(200,doc);return true;
     }
    }
   }
   throw new HttpError(404,'Endpoint not found.');
  }catch(error){if(!error.status)console.error(JSON.stringify({severity:'ERROR',event:'api_failure',path:path.replace(/[a-f0-9-]{36}/g,':id'),type:error.name||'Error'}));send(error.status||503,{error:error.status?error.message:'Storage is temporarily unavailable. Your inquiry was not confirmed; retry with the same submission.',fields:error.fields||{}});}
  return true;
 };
}
