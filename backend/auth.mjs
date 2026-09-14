import {crewMember} from './crew.mjs';
import {randomBytes,createHash} from 'node:crypto';
import {OAuth2Client} from 'google-auth-library';
import {HttpError} from './model.mjs';
export const STAFF_EMAIL='fareed@barsys.com';
const hash=s=>createHash('sha256').update(s).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(s=>s.trim().split(/=(.*)/s).slice(0,2)));}
export function createAuth({store,clientId,secure=false,verify,now=()=>Date.now()}){
 const roleFor=async email=>email===STAFF_EMAIL?'owner':crewMember(await store.getOperations(),email)?'crew':null;
 const google=new OAuth2Client();
 const verifyToken=verify|| (async credential=>(await google.verifyIdToken({idToken:credential,audience:clientId})).getPayload());
 const sessionCookie=secure?'__Host-barsys_session':'barsys_session';
 const challengeCookie=secure?'__Host-barsys_challenge':'barsys_challenge';
 const cookie=(name,value,seconds)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure?'; Secure':''}`;
 return {
  clientId:clientId||null,
  async challenge(res){if(!clientId)throw new HttpError(503,'Google sign-in has not been configured.');const token=random(),nonce=random();await store.saveChallenge(hash(token),hash(nonce),now()+300000);res.setHeader('Set-Cookie',cookie(challengeCookie,token,300));return {clientId,nonce};},
  async signIn(req,res,body){
   if(!clientId)throw new HttpError(503,'Google sign-in has not been configured.');
   const challenge=cookies(req)[challengeCookie];
   if(!challenge||typeof body?.credential!=='string'||body.credential.length>10000)throw new HttpError(401,'Please start Google sign-in again.');
   let p;try{p=await verifyToken(body.credential);}catch{throw new HttpError(401,'Google could not verify this sign-in. Please try again.');}
   if(!p||p.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(p.iss)||!Number.isFinite(p.exp)||p.exp*1000<=now()||typeof p.sub!=='string'||!p.sub||p.email_verified!==true||p.hd!=='barsys.com'||!await roleFor(p.email?.toLowerCase()))throw new HttpError(403,'This dashboard is restricted to the authorized Barsys account.');
   if(typeof p.nonce!=='string'||!await store.consumeChallenge(hash(challenge),hash(p.nonce),now()))throw new HttpError(401,'This sign-in expired or was already used. Please try again.');
   const old=cookies(req)[sessionCookie];if(old)await store.deleteSession(hash(old));
   const token=random(),user={email:p.email.toLowerCase(),sub:p.sub,role:await roleFor(p.email.toLowerCase())};await store.saveSession(hash(token),user,now()+8*60*60*1000);
   res.setHeader('Set-Cookie',[cookie(sessionCookie,token,8*60*60),cookie(challengeCookie,'',0)]);return {user};
  },
  async user(req){const token=cookies(req)[sessionCookie];if(!token)return null;const user=await store.getSession(hash(token),now());if(!user)return null;const role=await roleFor(user.email);return role?{...user,role}:null;},
  async require(req){const user=await this.user(req);if(!user)throw new HttpError(401,'Sign in with your authorized Google account to view events.');return user.email;},
  async signOut(req,res){const token=cookies(req)[sessionCookie];if(token)await store.deleteSession(hash(token));res.setHeader('Set-Cookie',[cookie(sessionCookie,'',0),cookie(challengeCookie,'',0)]);return {signedOut:true};}
 };
}
