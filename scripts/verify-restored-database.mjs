// Run only against an isolated restored database, never an active service database.
// No schema creation, migration, row writes, document output or credentials in logs.
import pg from 'pg';
if(process.env.BARSYS_RESTORE_TARGET_CONFIRMED!=='isolated'||!process.env.BARSYS_RESTORE_DATABASE_URL){
 console.error('Set BARSYS_RESTORE_DATABASE_URL to the isolated restored database and BARSYS_RESTORE_TARGET_CONFIRMED=isolated. No connection attempted.');process.exit(1);
}
const client=new pg.Client({connectionString:process.env.BARSYS_RESTORE_DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:10000});
try{
 await client.connect();await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout = '10s'");
 const expected=['notification_jobs','inquiries','operations_state','menu_policy','mail_settings','email_inquiries','staff_sessions','auth_challenges','request_limits'];
 for(const name of expected){
  // Names come exclusively from this fixed allowlist.
  await client.query('SELECT 1 FROM '+name+' LIMIT 1');
 }
 const operations=await client.query('SELECT version, document FROM operations_state WHERE id=1');
 if(operations.rowCount!==1)throw Error('operations singleton missing');
 const state=JSON.parse(operations.rows[0].document);
 if(state.version!==operations.rows[0].version||!Array.isArray(state.inventory)||!Array.isArray(state.staff)||!state.events)throw Error('operations state invalid');
 const inquiries=await client.query('SELECT id, version, document FROM inquiries ORDER BY created_at DESC LIMIT 20');
 for(const row of inquiries.rows){const doc=JSON.parse(row.document);if(doc.id!==row.id||doc.version!==row.version||!doc.payload?.details)throw Error('inquiry structure invalid');}
 await client.query('ROLLBACK');
 console.log(JSON.stringify({schemaReadable:true,operationsValid:true,sampledInquiries:inquiries.rowCount,readOnly:true,limits:'Structural sample only; does not prove completeness, application login, or recovery time.'}));
}catch{
 console.error('Restore verification failed. Check isolated target access, schema and document integrity. No private connection or record details printed.');process.exitCode=1;
}finally{await client.end().catch(()=>{});}
