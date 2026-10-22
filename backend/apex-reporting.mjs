import {OAuth2Client} from 'google-auth-library';
export const APEX_REPORT_AUDIENCE='https://events.barsys.com/api/integrations/apex/analytics';
export const APEX_REPORT_CALLER='apex-crm-prod-runtime@apex-crm-staging.iam.gserviceaccount.com';
const client=new OAuth2Client();
export async function apexAuthorised(header,verify=options=>client.verifyIdToken(options)){
 if(typeof header!=='string'||!header.startsWith('Bearer ')||!header.slice(7))return false;
 try{
  const ticket=await verify({idToken:header.slice(7),audience:APEX_REPORT_AUDIENCE});
  const payload=ticket.getPayload();
  return payload?.email===APEX_REPORT_CALLER&&payload.email_verified===true;
 }catch{return false;}
}
export async function buildApexReport(store,days,now=new Date()){
 if(!Number.isInteger(days)||days<1||days>90)throw Error('Invalid reporting window');
 const since=new Date(now.getTime()-days*86400000),seen=new Set();
 let inquiries=0,bookings=0,done=false;
 for(let page=0;page<100;page++){
  const rows=await store.list(100,page*100,'all');
  for(const doc of rows){
   const stamp=new Date(doc.createdAt);
   if(!Number.isFinite(stamp.getTime()))throw Error('Inquiry timestamp unavailable');
   if(stamp<since||stamp>now||seen.has(doc.id))continue;
   seen.add(doc.id);
   if(doc.mode!=='LIVE'||doc.deleted||doc.disposedAt||doc.source)continue;
   if(!doc.history?.some(h=>h.actor==='Organizer'&&h.action==='Inquiry saved'))continue;
   if(/synthetic|test only|do not fulfill|rehearsal/i.test(doc.payload?.details?.company||''))continue;
   inquiries++;
   if(doc.booking?.confirmed===true)bookings++;
  }
  if(rows.length<100||rows.every(d=>new Date(d.createdAt)<since)){done=true;break;}
 }
 if(!done)throw Error('Reporting window exceeds read limit');
 return {schema:1,site:'events.barsys.com',days,since:since.toISOString(),computed_at:now.toISOString(),
  confirmed_inquiries:inquiries,confirmed_bookings:bookings,booked_revenue:null,
  definition:'Stored public website inquiries created within the reporting window. Bookings require an explicit confirmed booking record; estimates are not revenue.'};
}
