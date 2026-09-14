import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validateDisposalLedger} from '../backend/disposal-recovery.mjs';
const [input,mode]=process.argv.slice(2);
if(!input||!['archive','verify-synthetic'].includes(mode))throw Error('Usage: node scripts/archive-disposal-ledger.mjs <private downloaded ledger.json> archive|verify-synthetic');
const ledger=validateDisposalLedger(JSON.parse(await readFile(input,'utf8')));
const bytes=Buffer.from(JSON.stringify(ledger));const sha256=createHash('sha256').update(bytes).digest('hex');
const bucket='gs://happy-hour-landing-version-2-privacy-ledgers';
const prefix=mode==='verify-synthetic'?'verification':'ledgers';
const destination=`${bucket}/${prefix}/${new Date().toISOString().replaceAll(':','-')}-${sha256}.json`;
const dir=await mkdtemp(join(tmpdir(),'barsys-ledger-archive-'));
const gcloud=process.env.GCLOUD||'/opt/homebrew/bin/gcloud';
const run=args=>execFileSync(gcloud,args,{stdio:['ignore','pipe','pipe']});
try{
 const source=join(dir,'ledger.json'),roundtrip=join(dir,'roundtrip.json');await writeFile(source,bytes,{mode:0o600});
 run(['storage','cp',source,destination,'--no-clobber']);
 run(['storage','cp',destination,roundtrip]);
 const actual=createHash('sha256').update(await readFile(roundtrip)).digest('hex');if(actual!==sha256)throw Error('Archive checksum mismatch; keep the review open.');
 console.log(JSON.stringify({archived:true,verified:true,destination,sha256,inquiries:ledger.inquiries.length,mail:ledger.mail.length,retired:ledger.retired?.length||0,synthetic:mode==='verify-synthetic'}));
}finally{await rm(dir,{recursive:true,force:true});}
