import {isIP} from 'node:net';
// Only configure proxy hops after verifying the entire ingress chain. Never use
// the leftmost forwarded value: it may have been supplied by the caller.
export function clientAddress(req,trustedProxyHops=0){
 if(!Number.isInteger(trustedProxyHops)||trustedProxyHops<0||trustedProxyHops>8)throw Error('Invalid trusted proxy hop count');
 const peer=req.socket.remoteAddress||'unknown';
 if(!trustedProxyHops)return peer;
 const value=req.headers['x-forwarded-for'];
 if(typeof value!=='string'||value.length>2048)return peer;
 const addresses=value.split(',').map(x=>x.trim());
 if(addresses.length<trustedProxyHops||addresses.some(x=>!isIP(x)))return peer;
 return addresses[addresses.length-trustedProxyHops];
}
