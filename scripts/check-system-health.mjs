// Run independently of the email worker. Contains no transport and sends no email.
import {createStore} from '../backend/store.mjs';
let store;
try{
 const origin=process.env.PUBLIC_ORIGIN;
 if(!process.env.DATABASE_URL||!origin?.startsWith('https://'))throw Error('Missing monitor configuration');
 store=await createStore({databaseURL:process.env.DATABASE_URL});
 await store.checkHealth();
 const response=await fetch(new URL('/api/ready',origin),{signal:AbortSignal.timeout(10000),redirect:'error'});
 const ready=response.ok&&(await response.json()).ready===true;
 const email=await store.notificationHealth(),worker=await store.workerHealth();
 const attention=!ready||email.attention||worker.stale;
 console.log(JSON.stringify({severity:attention?'ERROR':'INFO',event:'system_health',ready,email,worker,attention}));
 if(attention)process.exitCode=1;
}catch{console.error(JSON.stringify({severity:'ERROR',event:'system_health_unavailable'}));process.exitCode=1;}finally{await store?.close();}
