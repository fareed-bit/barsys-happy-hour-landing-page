'use strict';
const message=document.querySelector('#login-message'),retry=document.querySelector('#retry-login');
// Return to the staff page that required sign-in. Only same-origin /admin paths are honored; crew accounts always land on their own view.
const requested=new URLSearchParams(location.search).get('next')||'';const nextPath=/^\/admin(\/[\w.-]+\.html)?(\?[\w=&%.-]*)?$/.test(requested)&&!requested.startsWith('/admin/login')?requested:'';
const destination=user=>user.role==='crew'?'/admin/crew.html':(nextPath||'/admin');
async function json(url,options={}){const r=await fetch(url,options);const d=await r.json();if(!r.ok)throw new Error(d.error||'Sign-in unavailable.');return d;}
async function start(){retry.hidden=true;try{const me=await json('/api/auth/me');if(me.user){location.replace(destination(me.user));return;}if(!me.configured)throw new Error('Google sign-in setup is not complete yet. Please contact the site administrator.');const c=await json('/api/auth/challenge');if(!window.google){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(new Error('Google sign-in could not load. Check your connection and try again.'));document.head.append(script);});}
 google.accounts.id.initialize({client_id:c.clientId,nonce:c.nonce,auto_select:false,callback:async response=>{try{message.textContent='Verifying your access…';const signed=await json('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:response.credential})});location.replace(destination(signed.user));}catch(error){message.textContent=error.message;retry.hidden=false;}}});
 document.querySelector('#google-button').replaceChildren();google.accounts.id.renderButton(document.querySelector('#google-button'),{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});message.textContent='Use your Barsys account to continue.';
 }catch(error){message.textContent=error.message;retry.hidden=false;}}
retry.onclick=start;start();
