import {HttpError} from './model.mjs';
export const sender='fareed@barsys.com';
export function createGmailSend({clientId,fetcher=fetch}){
 return async function testSend(input){
  const token=input?.accessToken;
  if(!clientId||typeof token!=='string'||!token||token.length>5000)throw new HttpError(422,'Authorize Gmail sending first.');
  const infoResponse=await fetcher('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(token),{signal:AbortSignal.timeout(15000)});
  if(!infoResponse.ok)throw new HttpError(401,'Sending authorization expired.');
  const info=await infoResponse.json();
  if(info.aud!==clientId||info.email?.toLowerCase()!==sender||!['true',true].includes(info.email_verified)||!String(info.scope).split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw new HttpError(403,'Authorize sending as fareed@barsys.com through this dashboard.');
  const raw=Buffer.from(`From: Barsys Events <${sender}>\r\nTo: ${sender}\r\nSubject: Barsys inquiry email delivery test\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nThis is a Barsys dashboard delivery test. No customer inquiry, booking or payment was created. Automatic customer emails remain disabled.\r\n`).toString('base64url');
  let response;
  try{response=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(15000)});}catch{throw new HttpError(502,'Delivery outcome unknown. Check Sent mail before trying again.');}
  if(!response.ok)throw new HttpError(502,'Gmail did not confirm delivery. Check Sent mail before trying again.');
  const result=await response.json();if(!result.id)throw new HttpError(502,'Delivery outcome unknown. Check Sent mail.');
  return {accepted:true,messageId:result.id,to:sender,automaticDeliveryEnabled:false};
 };
}
