import {createStore} from '../backend/store.mjs';
import {backgroundTransport} from '../backend/background-gmail.mjs';
import {runNotifications} from '../backend/notification-worker.mjs';
let store;
try{
 if(process.env.BARSYS_BACKGROUND_EMAIL_ENABLED!=='1'||!process.env.DATABASE_URL)throw Error('Background delivery not configured.');
 const transport=await backgroundTransport();
 store=await createStore({databaseURL:process.env.DATABASE_URL});
 const result=await runNotifications({store,transport});
 await store.recordWorkerSuccess();
 const health=await store.notificationHealth();
 const attention=health.attention;
 console.log(JSON.stringify({severity:attention?'ERROR':'INFO',event:'notification_worker',...result,health,attention}));if(attention)process.exitCode=1;
}catch{console.error(JSON.stringify({severity:'ERROR',event:'notification_worker_unavailable'}));process.exitCode=1;}finally{await store?.close();}
