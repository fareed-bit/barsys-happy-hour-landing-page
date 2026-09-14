import {OAuth2Client} from 'google-auth-library';
export async function backgroundTransport(env=process.env,fetcher=fetch){
 if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.BARSYS_GMAIL_REFRESH_TOKEN)throw Error('Offline Gmail authorization is not configured.');
 const client=new OAuth2Client(env.GOOGLE_CLIENT_ID,env.GOOGLE_CLIENT_SECRET);client.setCredentials({refresh_token:env.BARSYS_GMAIL_REFRESH_TOKEN});
 const {token}=await client.getAccessToken();
 const check=await fetcher('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(token),{signal:AbortSignal.timeout(15000)});if(!check.ok)throw Error('Sender verification failed.');const info=await check.json();
 if(info.aud!==env.GOOGLE_CLIENT_ID||info.email!=='fareed@barsys.com'||!['true',true].includes(info.email_verified)||!String(info.scope).split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw Error('Authorized sender mismatch.');
 return async (draft,id)=>{
  if(!draft||/[\r\n]/.test(draft.to)||!/^\S+@\S+\.\S+$/.test(draft.to))return {status:'failed'};
  const subject=Buffer.from(draft.subject).toString('base64');
  const mime=`From: Barsys Events <fareed@barsys.com>\r\nTo: ${draft.to}\r\nReply-To: fareed@barsys.com\r\nSubject: =?UTF-8?B?${subject}?=\r\nMessage-ID: <${Buffer.from(id).toString('hex')}@barsys.com>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(draft.text).toString('base64')}\r\n`;
  const response=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(mime).toString('base64url')}),signal:AbortSignal.timeout(15000)});
  if(response.status===429)return {status:'retry'};
  if(response.status>=500)return {status:'unknown'};
  if(!response.ok)return {status:'failed'};
  return {status:(await response.json()).id?'accepted':'unknown'};
 };
}
