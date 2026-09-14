import {retirementBlock,retireEventState} from './event-retirement.mjs';
import {validateDisposalLedger} from './disposal-recovery.mjs';
import {disposalEligibility,mailDisposalEligibility} from './retention.mjs';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
export async function createStore({databaseURL,filename}){
 let db,pool;
 if(databaseURL){const {default:pg}=await import('pg');pool=new pg.Pool({connectionString:databaseURL,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});}
 else{const {DatabaseSync}=await import('node:sqlite');mkdirSync(dirname(filename),{recursive:true,mode:0o700});db=new DatabaseSync(filename);chmodSync(filename,0o600);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');}
 const sql=async(q,p=[])=>pool?(await pool.query(q,p)).rows:db.prepare(q.replace(/\$\d+/g,'?')).all(...p);
 await sql('CREATE TABLE IF NOT EXISTS menu_policy (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, document TEXT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS mail_settings (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, document TEXT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS email_inquiries (id TEXT PRIMARY KEY, received_at TEXT NOT NULL, document TEXT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL, version INTEGER NOT NULL, document TEXT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS request_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at BIGINT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS staff_sessions (token_hash TEXT PRIMARY KEY, identity TEXT NOT NULL, expires_at BIGINT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS auth_challenges (token_hash TEXT PRIMARY KEY, nonce_hash TEXT NOT NULL, expires_at BIGINT NOT NULL)');
 await sql('CREATE TABLE IF NOT EXISTS operations_state (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, document TEXT NOT NULL)');
 await sql('INSERT INTO operations_state(id,version,document) VALUES(1,1,$1) ON CONFLICT(id) DO NOTHING',[JSON.stringify({version:1,inventory:[],staff:[],events:{},reservations:[],audit:[]})]);
 await sql("CREATE TABLE IF NOT EXISTS notification_jobs (id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, due_at BIGINT NOT NULL, lease_until BIGINT NOT NULL, result TEXT NOT NULL)");
 await sql("CREATE TABLE IF NOT EXISTS retention_reviews (id TEXT PRIMARY KEY, version INTEGER NOT NULL, document TEXT NOT NULL)");
 await sql("CREATE TABLE IF NOT EXISTS service_heartbeats (id TEXT PRIMARY KEY, completed_at BIGINT NOT NULL)");
 await sql("CREATE TABLE IF NOT EXISTS retired_events (id TEXT PRIMARY KEY, document TEXT NOT NULL)");
 await sql("CREATE TABLE IF NOT EXISTS mail_disposals (id TEXT PRIMARY KEY, removed_at TEXT NOT NULL, actor TEXT NOT NULL)");
 await sql("CREATE TABLE IF NOT EXISTS retention_disposals (id TEXT PRIMARY KEY, removed_at TEXT NOT NULL, actor TEXT NOT NULL)");
 async function transact(work){
  if(!pool){db.exec('BEGIN IMMEDIATE');try{const flow=work('');let step=flow.next();while(!step.done){const [q,p]=step.value;step=flow.next(db.prepare(q.replace(/\$\d+/g,'?')).all(...p));}db.exec(step.value.removed?'COMMIT':'ROLLBACK');return step.value;}catch(e){db.exec('ROLLBACK');throw e;}}
  const client=await pool.connect();try{await client.query('BEGIN');const flow=work(' FOR UPDATE');let step=flow.next();while(!step.done){const [q,p]=step.value;step=flow.next((await client.query(q,p)).rows);}await client.query(step.value.removed?'COMMIT':'ROLLBACK');return step.value;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 return {
  async exportDisposalLedger(){return {schema:1,inquiries:await sql('SELECT id,removed_at,actor FROM retention_disposals ORDER BY id'),mail:await sql('SELECT id,removed_at,actor FROM mail_disposals ORDER BY id'),retired:(await sql('SELECT id,document FROM retired_events ORDER BY id')).map(r=>({id:r.id,summary:JSON.parse(r.document)}))};},
  async reconcileDisposals(ledger,{isolated=false}={}){
   if(isolated!==true)throw Error('Restore reconciliation requires an isolated target');
   validateDisposalLedger(ledger);
   return transact(function* (lock){
    const opRow=(yield ['SELECT document FROM operations_state WHERE id=1'+lock,[]])[0];let ops=JSON.parse(opRow.document);
    for(const row of ledger.inquiries){
     const restored=(yield ['SELECT document FROM inquiries WHERE id=$1'+lock,[row.id]])[0];
     if(restored){
      const doc=JSON.parse(restored.document);
      const retired=ledger.retired?.find(r=>r.id===row.id);
      if(retired){
       if(doc.source)throw Error('Restored email links require review');
       if(ops.events?.[row.id]&&(ops.events[row.id].stage!==8||ops.reservations.some(r=>r.eventId===row.id&&['reserved','dispatched'].includes(r.status))))throw Error('Restore predates financial closeout; reconcile stock before retirement');
       if(ops.events?.[row.id])ops=retireEventState(doc,ops,row.removed_at).state;
      }
      if(!retired&&(ops.events?.[row.id]||ops.reservations?.some(r=>r.eventId===row.id)||ops.audit?.some(r=>r.eventId===row.id)||doc.source||doc.proposal||doc.preparation||doc.acceptances?.length||doc.booking?.confirmed))throw Error('Restored event links require review; no reconciliation committed');
      const tombstone={id:row.id,version:doc.version+1,createdAt:doc.createdAt,disposedAt:row.removed_at};
      yield ['UPDATE inquiries SET document=$1,version=$2 WHERE id=$3',[JSON.stringify(tombstone),tombstone.version,row.id]];
     }
     const retiredSummary=ledger.retired?.find(r=>r.id===row.id);if(retiredSummary)yield ['INSERT INTO retired_events(id,document) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[row.id,JSON.stringify(retiredSummary.summary)]];
     yield ['DELETE FROM notification_jobs WHERE inquiry_id=$1',[row.id]];
     yield ['DELETE FROM retention_reviews WHERE id=$1',['event:'+row.id]];
     yield ['INSERT INTO retention_disposals(id,removed_at,actor) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[row.id,row.removed_at,row.actor]];
    }
    const events=(yield ['SELECT document FROM inquiries',[]]).map(r=>JSON.parse(r.document));
    for(const row of ledger.mail){
     const restored=(yield ['SELECT document FROM email_inquiries WHERE id=$1'+lock,[row.id]])[0],doc=restored?JSON.parse(restored.document):null;
     if(events.some(e=>e.source?.type==='gmail'&&(e.source.messageId===row.id||(doc?.threadId&&e.source.threadId===doc.threadId))))throw Error('Restored email links require review; no reconciliation committed');
     const tombstone=JSON.stringify({messageId:row.id,disposedAt:row.removed_at,disposedBy:row.actor});
     yield ['INSERT INTO email_inquiries(id,received_at,document) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET document=excluded.document',[row.id,row.removed_at,tombstone]];
     yield ['DELETE FROM retention_reviews WHERE id=$1',['mail:'+row.id]];
     yield ['INSERT INTO mail_disposals(id,removed_at,actor) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[row.id,row.removed_at,row.actor]];
    }
    // Old authentication and delivery state must never resume on a restored target.
    yield ['DELETE FROM staff_sessions',[]];yield ['DELETE FROM auth_challenges',[]];
    yield ["UPDATE notification_jobs SET status='unknown',result='Restored database: reconcile Sent mail before enabling delivery' WHERE status IN ('pending','sending')",[]];
    ops.version++;yield ['UPDATE operations_state SET version=$1,document=$2 WHERE id=1',[ops.version,JSON.stringify(ops)]];
    return {removed:true,inquiryCount:ledger.inquiries.length,mailCount:ledger.mail.length};
   });
  },
  async retireEvent(id,version,reviewVersion,actor,now=Date.now()){
   return transact(function* (lock){
    const opRow=(yield ['SELECT document FROM operations_state WHERE id=1'+lock,[]])[0],ops=JSON.parse(opRow.document);
    const row=(yield ['SELECT document FROM inquiries WHERE id=$1'+lock,[id]])[0],doc=row?JSON.parse(row.document):null;
    const review=(yield ['SELECT document FROM retention_reviews WHERE id=$1'+lock,['event:'+id]])[0],meta=review?JSON.parse(review.document):null;
    let error=retirementBlock(doc,meta,ops,now);
    if(doc?.version!==version||meta?.version!==reviewVersion)error='Record changed. Reload and review again.';
    if(error)return {removed:false,error};
    if((yield ["SELECT id FROM notification_jobs WHERE inquiry_id=$1 AND status<>'accepted'",[id]]).length)return {removed:false,error:'Resolve email delivery before retirement.'};
    // Preserve linked email copies until their shared-thread obligations are reviewed separately.
    if(doc.source||(yield ['SELECT document FROM email_inquiries',[]]).some(r=>JSON.parse(r.document).eventId===id))return {removed:false,error:'Linked email requires coordinated review before retirement.'};
    const at=new Date(now).toISOString(),{state,summary}=retireEventState(doc,ops,at);
    yield ['UPDATE inquiries SET document=$1,version=$2 WHERE id=$3',[JSON.stringify({id,version:version+1,createdAt:doc.createdAt,disposedAt:at}),version+1,id]];
    yield ['UPDATE operations_state SET document=$1,version=$2 WHERE id=1',[JSON.stringify(state),state.version]];
    yield ['DELETE FROM notification_jobs WHERE inquiry_id=$1',[id]];yield ['DELETE FROM retention_reviews WHERE id=$1',['event:'+id]];
    yield ['INSERT INTO retired_events(id,document) VALUES($1,$2)',[id,JSON.stringify(summary)]];
    yield ['INSERT INTO retention_disposals(id,removed_at,actor) VALUES($1,$2,$3)',[id,at,actor]];
    return {removed:true};
   });
  },
  async disposeMail(id,reviewVersion,actor,now=Date.now()){
   return transact(function* (lock){
    const row=(yield ['SELECT document FROM email_inquiries WHERE id=$1'+lock,[id]])[0];
    const review=(yield ['SELECT document FROM retention_reviews WHERE id=$1'+lock,['mail:'+id]])[0];
    const doc=row?JSON.parse(row.document):null,meta=review?JSON.parse(review.document):{};
    let error=mailDisposalEligibility(doc,meta,now);
    if(meta.version!==reviewVersion)error='Record changed. Reload and review again.';
    if(error)return {removed:false,error};
    const events=yield ['SELECT document FROM inquiries',[]];
    if(events.some(r=>{const source=JSON.parse(r.document).source;return source?.type==='gmail'&&(source.messageId===id||source.threadId===doc.threadId);}))return {removed:false,error:'This email thread is linked to an event. Keep the copy for separate review.'};
    const at=new Date(now).toISOString();
    yield ['UPDATE email_inquiries SET document=$1 WHERE id=$2',[JSON.stringify({messageId:id,disposedAt:at,disposedBy:actor}),id]];
    yield ['INSERT INTO mail_disposals(id,removed_at,actor) VALUES($1,$2,$3)',[id,at,actor]];
    yield ['DELETE FROM retention_reviews WHERE id=$1',['mail:'+id]];
    return {removed:true};
   });
  },
  async disposeInquiry(id,version,reviewVersion,actor,now=Date.now()){
   function* work(lock){
    const opRow=(yield ['SELECT document FROM operations_state WHERE id=1'+lock,[]])[0];
    const row=(yield ['SELECT document FROM inquiries WHERE id=$1'+lock,[id]])[0];
    const review=(yield ['SELECT document FROM retention_reviews WHERE id=$1'+lock,['event:'+id]])[0];
    const doc=row?JSON.parse(row.document):null,meta=review?JSON.parse(review.document):null,ops=JSON.parse(opRow.document);
    let error=disposalEligibility(doc,meta,ops,now);
    if(doc?.version!==version||meta?.version!==reviewVersion)error='Record changed. Reload and review again.';
    if((yield ["SELECT id FROM notification_jobs WHERE inquiry_id=$1 AND status<>'accepted'",[id]]).length)error='Unresolved email delivery prevents removal.';
    if(error)return {removed:false,error};
    const at=new Date(now).toISOString(),tombstone={id,version:version+1,createdAt:doc.createdAt,disposedAt:at};
    yield ['UPDATE inquiries SET document=$1,version=$2 WHERE id=$3',[JSON.stringify(tombstone),tombstone.version,id]];
    yield ['DELETE FROM notification_jobs WHERE inquiry_id=$1',[id]];
    yield ['DELETE FROM retention_reviews WHERE id=$1',['event:'+id]];
    yield ['INSERT INTO retention_disposals(id,removed_at,actor) VALUES($1,$2,$3)',[id,at,actor]];
    ops.version++;yield ['UPDATE operations_state SET version=$1,document=$2 WHERE id=1',[ops.version,JSON.stringify(ops)]];
    return {removed:true};
   }
   if(!pool){db.exec('BEGIN IMMEDIATE');try{const flow=work('');let step=flow.next();while(!step.done){const [q,p]=step.value;step=flow.next(db.prepare(q.replace(/\$\d+/g,'?')).all(...p));}db.exec(step.value.removed?'COMMIT':'ROLLBACK');return step.value;}catch(e){db.exec('ROLLBACK');throw e;}}
   const client=await pool.connect();try{await client.query('BEGIN');const flow=work(' FOR UPDATE');let step=flow.next();while(!step.done){const [q,p]=step.value;step=flow.next((await client.query(q,p)).rows);}await client.query(step.value.removed?'COMMIT':'ROLLBACK');return step.value;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  },
  async recordWorkerSuccess(now=Date.now()){await sql("INSERT INTO service_heartbeats(id,completed_at) VALUES('email-worker',$1) ON CONFLICT(id) DO UPDATE SET completed_at=excluded.completed_at",[now]);},
  async workerHealth(now=Date.now()){const rows=await sql("SELECT completed_at FROM service_heartbeats WHERE id='email-worker'");const lastCompletedAt=rows[0]?Number(rows[0].completed_at):null;return {lastCompletedAt,stale:lastCompletedAt===null||now-lastCompletedAt>900000};},
  async getRetention(id){const rows=await sql('SELECT document FROM retention_reviews WHERE id=$1',[id]);return rows[0]?JSON.parse(rows[0].document):null;},
  async saveRetention(id,doc,previous){if(previous===0)return (await sql('INSERT INTO retention_reviews(id,version,document) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING RETURNING id',[id,doc.version,JSON.stringify(doc)])).length===1;return (await sql('UPDATE retention_reviews SET version=$1,document=$2 WHERE id=$3 AND version=$4 RETURNING id',[doc.version,JSON.stringify(doc),id,previous])).length===1;},
  async notificationHealth(now=Date.now()){
   const rows=await sql("SELECT status,COUNT(*) AS count,MIN(due_at) AS oldest_due,MIN(lease_until) AS oldest_lease FROM notification_jobs GROUP BY status");
   const counts=Object.fromEntries(rows.map(r=>[r.status,Number(r.count)]));
   const pending=rows.find(r=>r.status==='pending'),sending=rows.find(r=>r.status==='sending');
   const overdue=!!pending&&Number(pending.oldest_due)<now-900000,stalled=!!sending&&Number(sending.oldest_lease)<now;
   return {counts,overdue,stalled,attention:overdue||stalled||!!counts.failed||!!counts.unknown};
  },
  async claimNotification(now){
   await sql("UPDATE notification_jobs SET status='unknown',result='Worker interrupted; review Sent mail before retrying' WHERE status='sending' AND lease_until<$1",[now]);
   const rows=await sql("UPDATE notification_jobs SET status='sending',attempts=attempts+1,lease_until=$1 WHERE id=(SELECT id FROM notification_jobs WHERE status='pending' AND due_at<=$2 ORDER BY due_at,id LIMIT 1) AND status='pending' RETURNING *",[now+120000,now]);return rows[0]||null;
  },
  async finishNotification(id,status,due,result){return (await sql("UPDATE notification_jobs SET status=$1,due_at=$2,result=$3 WHERE id=$4 AND status='sending' RETURNING id",[status,due,result,id])).length===1;},
  async notificationStatus(){return await sql("SELECT id,inquiry_id,kind,status,attempts,due_at,result FROM notification_jobs ORDER BY CASE WHEN status IN ('unknown','failed') THEN 0 WHEN status='sending' THEN 1 WHEN status='pending' THEN 2 ELSE 3 END,due_at DESC LIMIT 100");},
  async checkHealth(){if(pool)await pool.query({text:"SELECT 1 FROM inquiries LIMIT 1",query_timeout:5000});else db.prepare("SELECT 1 FROM inquiries LIMIT 1").all();return true;},
  async getMenuPolicy(){const r=await sql('SELECT document FROM menu_policy WHERE id=1');return r[0]?JSON.parse(r[0].document):null;},
  async saveMenuPolicy(doc,previous){if(previous===0)return (await sql('INSERT INTO menu_policy(id,version,document) VALUES(1,$1,$2) ON CONFLICT(id) DO NOTHING RETURNING id',[doc.version,JSON.stringify(doc)])).length===1;return (await sql('UPDATE menu_policy SET version=$1,document=$2 WHERE id=1 AND version=$3 RETURNING id',[doc.version,JSON.stringify(doc),previous])).length===1;},
  async getMailSettings(){const r=await sql('SELECT document FROM mail_settings WHERE id=1');return r[0]?JSON.parse(r[0].document):null;},
  async saveMailSettings(doc,previous){if(previous===0)return (await sql('INSERT INTO mail_settings(id,version,document) VALUES(1,$1,$2) ON CONFLICT(id) DO NOTHING RETURNING id',[doc.version,JSON.stringify(doc)])).length===1;return (await sql('UPDATE mail_settings SET version=$1,document=$2 WHERE id=1 AND version=$3 RETURNING id',[doc.version,JSON.stringify(doc),previous])).length===1;},
  async getMail(id){const rows=await sql('SELECT document FROM email_inquiries WHERE id=$1',[id]);return rows[0]?JSON.parse(rows[0].document):null;},
  async listMail(offset=0){return (await sql("SELECT document FROM email_inquiries WHERE id NOT IN (SELECT id FROM mail_disposals) ORDER BY received_at DESC,id DESC LIMIT 51 OFFSET $1",[offset])).map(r=>JSON.parse(r.document));},
  async insertMail(doc){return (await sql('INSERT INTO email_inquiries(id,received_at,document) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING RETURNING id',[doc.messageId,doc.receivedAt||new Date().toISOString(),JSON.stringify(doc)])).length===1;},
  async saveEventAndOperations(doc,previousDoc,state,previousState){
   const updates=[['UPDATE inquiries SET document=$1,version=$2 WHERE id=$3 AND version=$4 RETURNING id',[JSON.stringify(doc),doc.version,doc.id,previousDoc]],['UPDATE operations_state SET document=$1,version=$2 WHERE id=1 AND version=$3 RETURNING id',[JSON.stringify(state),state.version,previousState]]];
   if(pool){const client=await pool.connect();try{await client.query('BEGIN');for(const [q,args] of updates)if((await client.query(q,args)).rowCount!==1){await client.query('ROLLBACK');return false;}await client.query('COMMIT');return true;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
   db.exec('BEGIN IMMEDIATE');try{for(const [q,args] of updates)if(db.prepare(q.replace(/\$\d+/g,'?')).all(...args).length!==1){db.exec('ROLLBACK');return false;}db.exec('COMMIT');return true;}catch(e){db.exec('ROLLBACK');throw e;}
  },
  async getOperations(){return JSON.parse((await sql('SELECT document FROM operations_state WHERE id=1'))[0].document);},
  async saveOperations(doc,previous){return (await sql('UPDATE operations_state SET document=$1,version=$2 WHERE id=1 AND version=$3 RETURNING id',[JSON.stringify(doc),doc.version,previous])).length===1;},
  async consumeRate(key,now){const bucket=key+':'+Math.floor(now/60000);await sql('DELETE FROM request_limits WHERE expires_at < $1',[now]);const rows=await sql('INSERT INTO request_limits(bucket,hits,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET hits=request_limits.hits+1 RETURNING hits',[bucket,now+120000]);return rows[0].hits<=30;},
  async saveChallenge(token,nonce,expires){await sql('DELETE FROM auth_challenges WHERE expires_at < $1',[Date.now()]);await sql('DELETE FROM staff_sessions WHERE expires_at < $1',[Date.now()]);await sql('INSERT INTO auth_challenges(token_hash,nonce_hash,expires_at) VALUES($1,$2,$3) RETURNING token_hash',[token,nonce,expires]);},
  async consumeChallenge(token,nonce,now){return (await sql('DELETE FROM auth_challenges WHERE token_hash=$1 AND nonce_hash=$2 AND expires_at>$3 RETURNING token_hash',[token,nonce,now])).length===1;},
  async saveSession(token,user,expires){await sql('INSERT INTO staff_sessions(token_hash,identity,expires_at) VALUES($1,$2,$3) RETURNING token_hash',[token,JSON.stringify(user),expires]);},
  async getSession(token,now){const rows=await sql('SELECT identity FROM staff_sessions WHERE token_hash=$1 AND expires_at>$2',[token,now]);return rows[0]?JSON.parse(rows[0].identity):null;},
  async deleteSession(token){await sql('DELETE FROM staff_sessions WHERE token_hash=$1 RETURNING token_hash',[token]);},
  async findKey(key){const rows=await sql('SELECT * FROM inquiries WHERE idempotency_key=$1',[key]);return rows[0];},
  async get(id){const rows=await sql('SELECT document FROM inquiries WHERE id=$1',[id]);const doc=rows[0]?JSON.parse(rows[0].document):null;return doc?.disposedAt?null:doc;},
  async list(limit=100,offset=0){return (await sql('SELECT document FROM inquiries WHERE id NOT IN (SELECT id FROM retention_disposals) ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2',[limit,offset])).map(r=>JSON.parse(r.document));},
  async insert(doc,key,fingerprint,queue=false){
   if(!pool){db.exec('BEGIN IMMEDIATE');try{
    if(doc.source?.type==='gmail'){const row=db.prepare('SELECT document FROM email_inquiries WHERE id=?').get(doc.source.messageId);if(!row||JSON.parse(row.document).disposedAt)throw new Error('Email copy unavailable. Reload before creating an event.');}
    db.prepare('INSERT INTO inquiries(id,idempotency_key,fingerprint,created_at,version,document) VALUES(?,?,?,?,?,?)').run(doc.id,key,fingerprint,doc.createdAt,doc.version,JSON.stringify(doc));
    if(queue)for(const kind of ['customer','internal'])db.prepare("INSERT INTO notification_jobs(id,inquiry_id,kind,status,attempts,due_at,lease_until,result) VALUES(?,?,?,'pending',0,?,0,'')").run(doc.id+':'+kind,doc.id,kind,Date.now());
    db.exec('COMMIT');return;
   }catch(error){db.exec('ROLLBACK');throw error;}}
   const client=pool?await pool.connect():null;
   const run=async(q,args=[])=>client?client.query(q,args):db.prepare(q.replace(/\$\d+/g,'?')).all(...args);
   try{if(client)await client.query('BEGIN');else db.exec('BEGIN IMMEDIATE');
    if(doc.source?.type==='gmail'){const row=(await client.query('SELECT document FROM email_inquiries WHERE id=$1 FOR UPDATE',[doc.source.messageId])).rows[0];if(!row||JSON.parse(row.document).disposedAt)throw new Error('Email copy unavailable. Reload before creating an event.');}
    await run('INSERT INTO inquiries(id,idempotency_key,fingerprint,created_at,version,document) VALUES($1,$2,$3,$4,$5,$6)',[doc.id,key,fingerprint,doc.createdAt,doc.version,JSON.stringify(doc)]);
    if(queue)for(const kind of ['customer','internal'])await run("INSERT INTO notification_jobs(id,inquiry_id,kind,status,attempts,due_at,lease_until,result) VALUES($1,$2,$3,'pending',0,$4,0,'')",[doc.id+':'+kind,doc.id,kind,Date.now()]);
    if(client)await client.query('COMMIT');else db.exec('COMMIT');
   }catch(error){if(client)await client.query('ROLLBACK');else db.exec('ROLLBACK');throw error;}finally{client?.release();}
  },
  async update(doc,previous){return (await sql('UPDATE inquiries SET document=$1, version=$2 WHERE id=$3 AND version=$4 RETURNING id',[JSON.stringify(doc),doc.version,doc.id,previous])).length===1;},
  async close(){if(pool)await pool.end();else db.close();}
 };
}
