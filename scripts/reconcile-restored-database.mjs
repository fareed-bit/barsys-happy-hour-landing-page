import {readFile} from 'node:fs/promises';
import {createStore} from '../backend/store.mjs';
import {validateDisposalLedger} from '../backend/disposal-recovery.mjs';
// Source credential is deliberately never accepted by this mutation tool.
const [command,ledgerPath]=process.argv.slice(2);
if(command!=='apply'||!ledgerPath||process.env.BARSYS_RESTORE_ISOLATED!=='confirmed-offline')throw Error('Usage: BARSYS_RESTORE_ISOLATED=confirmed-offline BARSYS_RESTORE_DATABASE_URL=<isolated target> node scripts/reconcile-restored-database.mjs apply <reviewed ledger.json>');
if(process.env.DATABASE_URL||!process.env.BARSYS_RESTORE_DATABASE_URL)throw Error('Use only the dedicated isolated-restore URL, never the runtime DATABASE_URL');
const ledger=validateDisposalLedger(JSON.parse(await readFile(ledgerPath,'utf8')));
const store=await createStore({databaseURL:process.env.BARSYS_RESTORE_DATABASE_URL});
try{
 const result=await store.reconcileDisposals(ledger,{isolated:true});
 console.log(JSON.stringify({reconciled:true,inquiries:result.inquiryCount,mail:result.mailCount,warning:'Keep target offline until ledger freshness, outside copies and delivery state are reviewed.'}));
}finally{await store.close();}
