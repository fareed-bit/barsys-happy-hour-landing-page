/* Read-only gate. This does not deploy or alter permissions. */
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../reference/'+name,import.meta.url),'utf8'));
const gates=read('launch-gates.json'),register=read('publication-approvals.json');
const pending=gates.items.filter(x=>x.status!=='approved');
const assets=register.media.filter(x=>!['approved','authorized_by_owner'].includes(x.publicationStatus)||!x.approvalEvidence);
const neutralDisclosure=readFileSync(new URL('../policy-content.js',import.meta.url),'utf8').includes('this banner does not claim that every company is a client, partner or sponsor.');
const contentApproved=gates.items.some(x=>x.id==='content'&&x.status==='approved'&&x.approvalEvidence);
const brands=register.brands.filter(x=>!(x.relationshipStatus==='verified'||x.relationshipStatus==='source_site_reference'&&contentApproved&&neutralDisclosure&&x.source)||!['approved','authorized_by_owner'].includes(x.publicationStatus)||!x.approvalEvidence);
console.log('BARSYS V3.9 / PRODUCTION READINESS CHECK');
console.log(`${pending.length} operational/legal decisions pending; ${assets.length} configured media entries pending; ${brands.length} brand references pending.`);
for(const g of pending)console.log(`- ${g.title}: ${g.status}`);
if(pending.length||assets.length||brands.length){console.log('NOT READY TO PUBLISH. Local review is available. No deployment was attempted.');process.exitCode=1;}
else console.log('Recorded approval gates complete. Independently verify evidence and deployed behavior before publication.');
